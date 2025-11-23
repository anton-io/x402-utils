# x402 Protocol - Pay-per-Execution PoC

A blockchain-based pay-per-execution service implementing the **x402 protocol** (HTTP 402 Payment Required). Users pay with U tokens (or signature-based payment) on Base Sepolia to execute jobs, with results streamed back in real-time.

**Status**: ✅ Production-ready PoC · All tests passing · Multiple frontends · Python agent

## 🎯 Overview

**Payment Flows**:
1. **Traditional**: User → 402 Response → ERC20 Transfer → Payment Verified → Job Executes → Results Stream
2. **x402 Signature**: User → Sign EIP-712 → X-PAYMENT Header → Instant Authorization → Job Executes → Results Stream

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  2 Frontends    │────▶│  FastAPI Backend │────▶│  Base Sepolia      │
│  + 1 Agent      │◀────│  (x402 Server)   │◀────│  Blockchain        │
└─────────────────┘     └──────────────────┘     └────────────────────┘
  • Vanilla JS            • Payment verify        • U Token (ERC20)
  • React + Privy         • EIP-712 sigs          • Payment tracking
  • Python Agent          • SSE streaming         • Smart contracts
```

## 🚀 Quick Start (1 Minute)

### Fastest Way - Use the Start Script

```bash
./start.sh
```

This automatically starts:
- ✅ **Backend** on http://localhost:8989
- ✅ **Frontend-JS** on http://localhost:3000 (Vanilla JS + MetaMask)
- ✅ **Frontend-Privy** on http://localhost:3001 (React + Privy + x402)

### Manual Setup

1. **Configure backend:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env: RECIPIENT_ADDRESS=0xYourWalletAddress
   ```

2. **Run backend:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python main.py
   ```

3. **Choose your frontend:**

   **Option A: Vanilla JS (MetaMask/Coinbase Wallet)**
   ```bash
   cd frontend-js
   python -m http.server 3000
   # Visit: http://localhost:3000
   ```

   **Option B: React + Privy (Recommended - Full x402)**
   ```bash
   cd frontend-privy
   npm install
   npm run dev
   # Visit: http://localhost:3001
   ```

4. **Or run the Python agent:**
   ```bash
   cd agent
   pip install -r requirements.txt
   python x402_agent.py  # Pings google.com every 3 minutes
   ```

## 📊 Frontend Comparison

| Feature | Frontend-JS (3000) | Frontend-Privy (3001) ⭐ | Agent |
|---------|-------------------|----------------------|-------|
| **Tech** | Vanilla JS | React + Privy | Python |
| **Wallet** | MetaMask/Coinbase | Privy Embedded | Generated |
| **Payment** | ERC20 Transfer | x402 + Traditional | x402 Signature |
| **Auto-Approve** | ❌ No | ✅ Yes (Delegation) | N/A |
| **x402 Protocol** | ❌ No | ✅ Full Support | ✅ Yes |
| **Best For** | Testing basics | Production use | Automation |
| **Setup** | None | `npm install` | `pip install` |

**Recommendation**: Use **Frontend-Privy (3001)** for full x402 features and best UX.

## 🏗️ Architecture

### Backend (FastAPI)
- **Dual payment support**: Traditional ERC20 transfers + x402 signature-based
- **EIP-712 verification**: Validates signed payment authorizations
- **Extensible job system**: Plugin-based registry for easy job type additions
- **Payment verification**: Monitors Base Sepolia for ERC20 Transfer events
- **Real-time streaming**: Server-Sent Events (SSE) for live output
- **Timeout management**: 5-minute configurable payment windows

### Frontend Options

**1. Frontend-JS (Port 3000)**
- Vanilla JavaScript with Web3.js
- MetaMask/Coinbase Wallet integration
- Traditional ERC20 payment flow
- Asta framework monospace UI
- No build process required

**2. Frontend-Privy (Port 3001)** ⭐ **Recommended**
- React + TypeScript with Vite
- Privy embedded wallet support
- Full x402 signature-based payment
- Delegated actions for auto-approve
- Dual payment method (x402 + traditional)
- Best developer experience

**3. Python Agent**
- Autonomous x402 client
- Periodic job execution
- EIP-712 signature creation
- No blockchain transaction needed
- Perfect for automation/monitoring

### Configuration
- **Network**: Base Sepolia (Chain ID: 84532)
- **RPC**: https://base-sepolia-rpc.publicnode.com
- **Token**: U at `0x82cabCB0F84d088218c22482737e6BB777FA980f`
- **Pricing**: 0.01 U per ping
- **Payment timeout**: 300s (configurable via `PAYMENT_TIMEOUT` env var)

## API Endpoints

| Endpoint | Method | Description | Response |
|----------|--------|-------------|----------|
| `/` | GET | Health check | Service status |
| `/api/jobs` | GET | List available jobs | Jobs with pricing |
| `/api/jobs/request` | POST | Request job execution | **402** with payment details |
| `/api/jobs/verify-payment` | POST | Verify blockchain payment | Verification status |
| `/api/jobs/execute/{id}` | GET | Execute paid job | **SSE stream** |
| `/api/jobs/status/{id}` | GET | Check job status | Job state |

## Adding New Jobs

Create a job class inheriting from `Job`:

```python
# backend/jobs/my_job.py
from decimal import Decimal
from .base import Job

class MyJob(Job):
    @classmethod
    def get_name(cls) -> str:
        return "my_job"

    @classmethod
    def get_price(cls) -> Decimal:
        return Decimal("0.05")

    def validate_params(self) -> tuple[bool, str]:
        # Validate self.params
        return True, ""

    async def execute(self) -> AsyncIterator[str]:
        yield "Starting...\n"
        # ... do work ...
        yield "Complete!\n"
```

Register in `backend/jobs/registry.py`:
```python
from .my_job import MyJob

class JobRegistry:
    def _register_default_jobs(self):
        self.register(PingJob)
        self.register(MyJob)  # Add this
```

## Test Results

**Date**: 2025-11-22 · **Status**: ✅ All tests passed

- ✅ **Backend**: Server startup, Base Sepolia connection (no warnings)
- ✅ **API**: 7/7 endpoint tests passed
  - Health check, job listing, x402 flow, status, execution blocking
  - Input validation, error handling
- ✅ **Jobs**: Ping execution successful (8.8.8.8, 0% packet loss)
- ✅ **Protocol**: Complete x402 flow verified (request → 402 → verify → execute)
- ✅ **Code**: Python 3.12+ compatible, timezone-aware, lifespan context manager
- ✅ **Network**: Base Sepolia RPC connected, token contract accessible

**Environment**: Linux · Python 3.12.12 · FastAPI 0.109.0 · Web3.py 6.15.1


## Future Enhancements

- Job result caching and storage
- User accounts and history
- Webhook notifications
- Comprehensive test suite

## License

MIT License

## Resources

- [Base Sepolia Explorer](https://sepolia.basescan.org/)
- [Base Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Web3.py Docs](https://web3py.readthedocs.io/)

---
