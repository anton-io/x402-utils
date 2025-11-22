"""
x402 PoC - FastAPI Backend
"""
import uuid
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from contextlib import asynccontextmanager

from config import (
    HOST, PORT, CORS_ORIGINS, PAYMENT_TIMEOUT_SECONDS,
    PAYMENT_RECIPIENT_ADDRESS, TOKEN_ADDRESS
)
from jobs.registry import job_registry
from payments.base_token import PaymentVerifier
from streaming.sse import create_sse_response


# Pydantic models
class JobRequest(BaseModel):
    job_type: str
    params: Dict
    wallet_address: str


class PaymentConfirmation(BaseModel):
    job_id: str
    tx_hash: str


# In-memory storage for pending jobs
pending_jobs: Dict[str, Dict] = {}
payment_verifier: Optional[PaymentVerifier] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    global payment_verifier

    # Startup
    print("Starting x402 PoC server...")
    payment_verifier = PaymentVerifier()

    if not payment_verifier.is_connected():
        print("WARNING: Not connected to Base Sepolia network!")
    else:
        print("Connected to Base Sepolia network")

    # Start background cleanup task
    cleanup_task = asyncio.create_task(cleanup_expired_jobs())

    yield

    # Shutdown
    print("Shutting down x402 PoC server...")
    cleanup_task.cancel()


# Create FastAPI app
app = FastAPI(
    title="x402 PoC",
    description="Pay-per-execution API using x402 protocol",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "x402 PoC",
        "status": "running",
        "network": "Base Sepolia",
        "connected": payment_verifier.is_connected() if payment_verifier else False
    }


@app.get("/api/jobs")
async def list_jobs():
    """List all available job types and their prices"""
    return {
        "jobs": job_registry.list_jobs(),
        "token_address": TOKEN_ADDRESS,
        "recipient_address": PAYMENT_RECIPIENT_ADDRESS
    }


@app.post("/api/jobs/request")
async def request_job(job_request: JobRequest):
    """
    Request a job execution - returns 402 Payment Required with payment details
    """
    # Validate job type
    job_class = job_registry.get_job_class(job_request.job_type)
    if not job_class:
        raise HTTPException(status_code=400, detail=f"Unknown job type: {job_request.job_type}")

    # Create job instance for validation
    job_id = str(uuid.uuid4())
    job = job_class(job_id=job_id, params=job_request.params)

    # Validate parameters
    is_valid, error_msg = job.validate_params()
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    # Get price
    price = job_class.get_price()

    # Store pending job
    expiry = datetime.now(timezone.utc) + timedelta(seconds=PAYMENT_TIMEOUT_SECONDS)
    pending_jobs[job_id] = {
        "job": job,
        "wallet_address": job_request.wallet_address,
        "price": price,
        "expiry": expiry,
        "paid": False
    }

    # Return 402 Payment Required
    return JSONResponse(
        status_code=402,
        content={
            "job_id": job_id,
            "message": "Payment Required",
            "payment": {
                "amount": str(price),
                "token_address": TOKEN_ADDRESS,
                "recipient_address": PAYMENT_RECIPIENT_ADDRESS,
                "chain_id": 84532,
                "network": "Base Sepolia"
            },
            "expires_at": expiry.isoformat(),
            "timeout_seconds": PAYMENT_TIMEOUT_SECONDS
        }
    )


@app.post("/api/jobs/verify-payment")
async def verify_payment(confirmation: PaymentConfirmation):
    """
    Verify payment and return execution URL
    """
    job_id = confirmation.job_id

    # Check if job exists
    if job_id not in pending_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job_info = pending_jobs[job_id]

    # Check if expired
    if datetime.now(timezone.utc) > job_info["expiry"]:
        del pending_jobs[job_id]
        raise HTTPException(status_code=408, detail="Payment window expired")

    # Check if already paid
    if job_info["paid"]:
        return {
            "status": "already_paid",
            "execution_url": f"/api/jobs/execute/{job_id}"
        }

    # Verify payment on blockchain (30 second check per attempt)
    success, tx_hash = await payment_verifier.verify_payment(
        from_address=job_info["wallet_address"],
        expected_amount=job_info["price"],
        timeout=30  # Longer timeout for blockchain confirmation
    )

    if success:
        job_info["paid"] = True
        job_info["tx_hash"] = tx_hash
        return {
            "status": "verified",
            "tx_hash": tx_hash,
            "execution_url": f"/api/jobs/execute/{job_id}"
        }
    else:
        return JSONResponse(
            status_code=402,
            content={
                "status": "payment_not_found",
                "message": "Payment not yet detected on blockchain"
            }
        )


@app.get("/api/jobs/execute/{job_id}")
async def execute_job(job_id: str):
    """
    Execute a paid job and stream results via SSE
    """
    # Check if job exists
    if job_id not in pending_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job_info = pending_jobs[job_id]

    # Check if expired
    if datetime.now(timezone.utc) > job_info["expiry"]:
        del pending_jobs[job_id]
        raise HTTPException(status_code=408, detail="Job expired")

    # Check if paid
    if not job_info["paid"]:
        raise HTTPException(status_code=402, detail="Payment required")

    # Get the job
    job = job_info["job"]

    # Clean up after execution starts (job can only be executed once)
    asyncio.create_task(cleanup_job(job_id, delay=60))

    # Stream execution via SSE
    return create_sse_response(job)


@app.get("/api/jobs/status/{job_id}")
async def job_status(job_id: str):
    """Check status of a job"""
    if job_id not in pending_jobs:
        return {"status": "not_found"}

    job_info = pending_jobs[job_id]

    if datetime.now(timezone.utc) > job_info["expiry"]:
        return {"status": "expired"}

    return {
        "status": "pending" if not job_info["paid"] else "paid",
        "paid": job_info["paid"],
        "expires_at": job_info["expiry"].isoformat(),
        "price": str(job_info["price"])
    }


async def cleanup_job(job_id: str, delay: int = 60):
    """Clean up job from pending_jobs after delay"""
    await asyncio.sleep(delay)
    if job_id in pending_jobs:
        del pending_jobs[job_id]


# Cleanup expired jobs periodically
async def cleanup_expired_jobs():
    """Background task to clean up expired jobs"""
    while True:
        await asyncio.sleep(60)  # Run every minute
        now = datetime.now(timezone.utc)
        expired = [
            job_id for job_id, info in pending_jobs.items()
            if now > info["expiry"]
        ]
        for job_id in expired:
            del pending_jobs[job_id]
        if expired:
            print(f"Cleaned up {len(expired)} expired jobs")


# Background cleanup task is now started in lifespan


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
