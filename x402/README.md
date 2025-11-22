# x402 Protocol - Pay-per-Execution PoC

A blockchain-based pay-per-execution service implementing the x402 protocol (inspired by HTTP 402 Payment Required). Users pay with U tokens on Base Sepolia to execute jobs, with results streamed back in real-time.

**Status**: ✅ Production-ready PoC · All tests passing

## Overview

**Flow**: User requests job → Receives 402 Payment Required → Pays with U token → Job executes → Results stream via SSE

```
Frontend (Vanilla JS) ←→ Backend (FastAPI) ←→ Base Sepolia Network
         ↓
    User Wallet
```

## Quick Start

### Prerequisites
- Python 3.9+
- [MetaMask](https://metamask.io/) or [Coinbase Wallet](https://www.coinbase.com/wallet)
- Base Sepolia ETH ([faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet))
- U tokens: `0x82cabCB0F84d088218c22482737e6BB777FA980f`

### Setup (5 minutes)

1. **Configure backend:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and add: RECIPIENT_ADDRESS=0xYourWalletAddress
   ```

2. **Run servers:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   python main.py  # Runs on port 8989

   # Terminal 2 - Frontend
   cd frontend
   python -m http.server 3000
   ```

3. **Use the app:**
   - Open http://localhost:3000
   - Connect wallet (auto-switches to Base Sepolia)
   - Select ping job → Enter host → Request → Pay → Execute
   - Watch real-time results stream

## Architecture

### Backend (FastAPI)
- **Extensible job system**: Plugin-based registry for easy job type additions
- **Payment verification**: Monitors Base Sepolia for ERC20 Transfer events
- **Real-time streaming**: Server-Sent Events (SSE) for live output
- **Timeout management**: 5-minute configurable payment windows

### Frontend (Vanilla JS)
- **Web3 integration**: MetaMask/Coinbase Wallet support
- **Network switching**: Auto-adds Base Sepolia to wallet
- **SSE client**: Real-time job output streaming
- **Monospace UI**: Built with Asta framework

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

## Security Considerations

⚠️ **This is a PoC for demonstration**. For production:
- [ ] Add rate limiting and authentication
- [ ] Use HTTPS, restrict CORS
- [ ] Implement input sanitization
- [ ] Add refund mechanism for failed jobs
- [ ] Implement monitoring and logging
- [ ] Add nonce/replay protection

## Future Enhancements

- Support multiple payment tokens
- Job result caching and storage
- User accounts and history
- Batch job requests
- Webhook notifications
- Subscription models
- Additional EVM chains
- Comprehensive test suite

## License

MIT License

## Resources

- [Base Sepolia Explorer](https://sepolia.basescan.org/)
- [Base Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Web3.py Docs](https://web3py.readthedocs.io/)

---
