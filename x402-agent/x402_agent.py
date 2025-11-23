#!/usr/bin/env python3
"""
x402 Protocol Agent.

Periodically pings google.com using the x402 payment protocol
and reports if the host is alive or dead.
"""

import time
import json
import uuid
import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, Dict, Any

import requests
from eth_account import Account
from eth_account.messages import encode_typed_data
from web3 import Web3

# ============================================================================
# CONFIGURATION
# ============================================================================

class Config:
    """Agent configuration"""
    # Backend API
    API_URL = "http://localhost:8989"

    # Job settings
    JOB_TYPE = "ping"
    PING_HOST = "google.com"
    PING_COUNT = 4

    # Timing
    INTERVAL_SECONDS = 180  # 3 minutes

    # Payment settings (must match backend config)
    PAYMENT_RECIPIENT = "0x6b27b7af171b6042238f1034ef1815037ab9bfa5"  # From backend config
    TOKEN_ADDRESS     = "0x7143401013282067926d25e316f055fF3bc6c3FD"  # U token
    CHAIN_ID          = 84532  # Base Sepolia

    # Wallet (set via environment or here)
    # IMPORTANT: In production, use environment variables!
    PRIVATE_KEY = None  # Will be set from env or generated


# ============================================================================
# EIP-712 SIGNATURE UTILITIES
# ============================================================================

def get_payment_domain() -> Dict[str, Any]:
    """Get EIP-712 domain for payment authorization"""
    return {
        "name": "x402 Payment",
        "version": "1",
        "chainId": Config.CHAIN_ID,
    }


PAYMENT_AUTHORIZATION_TYPES = {
    "PaymentAuthorization": [
        {"name": "recipient", "type": "address"},
        {"name": "token", "type": "address"},
        {"name": "amount", "type": "uint256"},
        {"name": "jobId", "type": "string"},
        {"name": "timestamp", "type": "uint256"},
        {"name": "validUntil", "type": "uint256"},
    ]
}


def create_payment_signature(
    account: Account,
    recipient: str,
    token: str,
    amount_wei: int,
    job_id: str
) -> Dict[str, Any]:
    """
    Create EIP-712 payment authorization signature

    Returns payment data with signature
    """
    timestamp = int(time.time())
    valid_until = timestamp + 300  # Valid for 5 minutes

    # Create EIP-712 typed data
    message_data = {
        "types": {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
            ],
            **PAYMENT_AUTHORIZATION_TYPES
        },
        "primaryType": "PaymentAuthorization",
        "domain": get_payment_domain(),
        "message": {
            "recipient": Web3.to_checksum_address(recipient),
            "token": Web3.to_checksum_address(token),
            "amount": str(amount_wei),
            "jobId": job_id,
            "timestamp": timestamp,
            "validUntil": valid_until,
        }
    }

    # Sign the message
    encoded_message = encode_typed_data(full_message=message_data)
    signed_message = account.sign_message(encoded_message)

    # Return payment data
    return {
        "recipient": Web3.to_checksum_address(recipient),
        "token": Web3.to_checksum_address(token),
        "amount": str(amount_wei),
        "jobId": job_id,
        "timestamp": timestamp,
        "validUntil": valid_until,
        "signature": signed_message.signature.hex()
    }


# ============================================================================
# X402 AGENT
# ============================================================================

class X402Agent:
    """Agent that uses x402 protocol to periodically execute jobs"""

    def __init__(self, private_key: Optional[str] = None):
        """Initialize agent with wallet"""
        if private_key:
            self.account = Account.from_key(private_key)
        else:
            # Generate new wallet for testing
            self.account = Account.create()
            print(f"⚠️  Generated new wallet: {self.account.address}")
            print(f"⚠️  Private key: {self.account.key.hex()}")
            print(f"⚠️  Save this for future use!")

        print(f"🔑 Agent wallet: {self.account.address}")

    def request_job_with_x402(
        self,
        job_type: str,
        params: Dict[str, Any]
    ) -> Optional[str]:
        """
        Request job using x402 signature-based payment

        Returns job_id if successful, None otherwise
        """
        try:
            # Generate job ID (client-side for x402)
            job_id = str(uuid.uuid4())

            # Get job price (hardcoded for now, could fetch from /api/jobs)
            job_price = Decimal("0.01")  # 0.01 U tokens
            amount_wei = int(job_price * Decimal(10**18))

            print(f"💰 Creating payment signature for {job_price} U...")

            # Create payment signature
            payment_data = create_payment_signature(
                self.account,
                Config.PAYMENT_RECIPIENT,
                Config.TOKEN_ADDRESS,
                amount_wei,
                job_id
            )

            # Create X-PAYMENT header
            x_payment_header = json.dumps(payment_data)

            print(f"📡 Requesting job with x402 payment...")

            # Make request with X-PAYMENT header
            response = requests.post(
                f"{Config.API_URL}/api/jobs/request",
                json={
                    "job_type": job_type,
                    "params": params,
                    "wallet_address": self.account.address,
                    "job_id": job_id  # Include job_id for x402
                },
                headers={
                    "Content-Type": "application/json",
                    "X-PAYMENT": x_payment_header
                }
            )

            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "authorized":
                    print(f"✅ Payment authorized! Job ID: {data['job_id']}")
                    return data['job_id']
                else:
                    print(f"❌ Unexpected response: {data}")
                    return None
            else:
                print(f"❌ Request failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return None

        except Exception as e:
            print(f"❌ Error requesting job: {e}")
            return None

    def execute_job(self, job_id: str) -> Optional[str]:
        """
        Execute job and stream results

        Returns job output as string, or None on error
        """
        try:
            print(f"🚀 Executing job {job_id}...")

            # Connect to SSE stream
            execute_url = f"{Config.API_URL}/api/jobs/execute/{job_id}"

            response = requests.get(execute_url, stream=True)

            if response.status_code != 200:
                print(f"❌ Execute failed: {response.status_code}")
                return None

            output_lines = []

            # Parse SSE events
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')

                    # Parse SSE format: "event: output\ndata: <line>"
                    if line_str.startswith('data: '):
                        data = line_str[6:]  # Remove "data: " prefix

                        # Collect output lines
                        if data and data != "Job started" and data != "Job completed":
                            output_lines.append(data)
                            print(f"   {data}")

            full_output = "\n".join(output_lines)
            print(f"✅ Job completed!")

            return full_output

        except Exception as e:
            print(f"❌ Error executing job: {e}")
            return None

    def parse_ping_result(self, output: str) -> bool:
        """
        Parse ping output to determine if host is alive

        Returns True if alive, False if dead
        """
        if not output:
            return False

        output_lower = output.lower()

        # Check for success indicators
        if "bytes from" in output_lower or "reply from" in output_lower:
            return True

        # Check for failure indicators
        if "100% packet loss" in output_lower or "unreachable" in output_lower:
            return False

        # Check for received packets
        if "received" in output_lower:
            # Try to parse "X packets transmitted, Y received"
            try:
                # Look for pattern like "4 packets transmitted, 4 received"
                parts = output_lower.split("received")
                if parts:
                    before = parts[0]
                    if "transmitted" in before:
                        # Extract received count
                        received_str = before.split(",")[-1].strip()
                        received = int(received_str.split()[0])
                        return received > 0
            except:
                pass

        # Default to False if uncertain
        return False

    def ping_google(self) -> Dict[str, Any]:
        """
        Execute ping job for google.com

        Returns result dict with status and details
        """
        print(f"\n{'='*60}")
        print(f"🏓 Pinging {Config.PING_HOST}...")
        print(f"   Time: {datetime.now(timezone.utc).isoformat()}")
        print(f"{'='*60}")

        # Request job with x402 payment
        job_id = self.request_job_with_x402(
            Config.JOB_TYPE,
            {
                "host": Config.PING_HOST,
                "count": Config.PING_COUNT
            }
        )

        if not job_id:
            return {
                "success": False,
                "alive": False,
                "error": "Failed to request job",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

        # Execute job and get output
        output = self.execute_job(job_id)

        if output is None:
            return {
                "success": False,
                "alive": False,
                "error": "Failed to execute job",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

        # Parse result
        is_alive = self.parse_ping_result(output)

        result = {
            "success": True,
            "alive": is_alive,
            "host": Config.PING_HOST,
            "output": output,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        # Report status
        if is_alive:
            print(f"\n✅ {Config.PING_HOST} is ALIVE")
        else:
            print(f"\n❌ {Config.PING_HOST} is DEAD")

        return result

    def run_periodic(self):
        """Run agent in periodic mode"""
        print(f"\n{'='*60}")
        print(f"🤖 x402 Agent Starting")
        print(f"{'='*60}")
        print(f"Wallet: {self.account.address}")
        print(f"Target: {Config.PING_HOST}")
        print(f"Interval: {Config.INTERVAL_SECONDS} seconds ({Config.INTERVAL_SECONDS / 60:.1f} minutes)")
        print(f"API: {Config.API_URL}")
        print(f"{'='*60}\n")

        iteration = 0

        try:
            while True:
                iteration += 1

                print(f"\n🔄 Iteration #{iteration}")

                # Execute ping
                result = self.ping_google()

                # Log result
                if result["success"]:
                    status = "ALIVE ✅" if result["alive"] else "DEAD ❌"
                    print(f"\n📊 Result: {Config.PING_HOST} is {status}")
                else:
                    print(f"\n⚠️  Error: {result.get('error', 'Unknown error')}")

                # Wait for next iteration
                print(f"\n⏰ Waiting {Config.INTERVAL_SECONDS} seconds until next check...")
                print(f"   Next check at: {datetime.fromtimestamp(time.time() + Config.INTERVAL_SECONDS).strftime('%H:%M:%S')}")

                time.sleep(Config.INTERVAL_SECONDS)

        except KeyboardInterrupt:
            print(f"\n\n{'='*60}")
            print(f"🛑 Agent stopped by user")
            print(f"   Total iterations: {iteration}")
            print(f"{'='*60}\n")


# ============================================================================
# MAIN
# ============================================================================

def main():
    """Main entry point"""
    import os

    # Get private key from environment or use None (will generate new)
    private_key = os.environ.get("AGENT_PRIVATE_KEY")

    if not private_key:
        print("⚠️  No AGENT_PRIVATE_KEY found in environment")
        print("⚠️  Generating a new wallet (payments won't work without U tokens)")
        print("⚠️  Set AGENT_PRIVATE_KEY environment variable to reuse a wallet\n")

    # Create and run agent
    agent = X402Agent(private_key=private_key)
    agent.run_periodic()


if __name__ == "__main__":
    main()
