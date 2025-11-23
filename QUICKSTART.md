# Quick Start Guide - x402 Protocol

Get up and running in **1 minute** with the automated start script!

## 🚀 Super Quick Start

```bash
./start.sh
```

That's it! All servers will start automatically.

## 📺 What You'll See

```
============================================================
x402 PoC - Quick Start
============================================================

Creating virtual environment...
Activating virtual environment...
Installing dependencies...
[... installation progress ...]

Starting backend server on http://localhost:8989...

Starting frontend-js server on http://localhost:3000...

Installing frontend-privy dependencies...
[... npm install ...]

Starting frontend-privy (React + Vite) on http://localhost:3001...

============================================================
✅ All servers running!
============================================================
Backend:        http://localhost:8989
Frontend-JS:    http://localhost:3000  (Vanilla JS + MetaMask)
Frontend-Privy: http://localhost:3001  (React + Privy + x402)
============================================================

📝 Features by frontend:
  • 3000: Vanilla JS with MetaMask/Coinbase Wallet
  • 3001: React app with Privy (x402, delegation, auto-approve) ⭐ Recommended

Press Ctrl+C to stop all servers
```

## 🎯 Which Frontend Should I Use?

### For Production / Full Features → Port 3001 ⭐
**http://localhost:3001** - React + Privy

✅ Full x402 protocol support
✅ Auto-approve payments (delegated actions)
✅ Best UX with embedded wallets
✅ Both payment methods (x402 + traditional)

### For Quick Testing → Port 3000
**http://localhost:3000** - Vanilla JS

✅ No build required
✅ Works with MetaMask/Coinbase Wallet
✅ Traditional ERC20 payment flow
✅ Simpler codebase

## 🔧 Configuration

### Backend Wallet

The backend needs to know where to receive payments:

```bash
cd x402-backend
cp .env.example .env
nano .env  # or vim, code, etc.
```

Add your wallet address:
```
RECIPIENT_ADDRESS=0xYourWalletAddressHere
```

### Frontend-Privy Environment

Automatically created by `start.sh`, but you can customize:

```bash
cd x402-privy
nano .env
```

```
VITE_PRIVY_APP_ID=clzaq4s4k007zmd8qntbbskqz
VITE_API_URL=http://localhost:8989
```

## 🧪 Test the Setup

### 1. Check Backend

```bash
curl http://localhost:8989/
```

Should return:
```json
{
  "service": "x402 PoC",
  "status": "running",
  "network": "Base Sepolia",
  "connected": true
}
```

### 2. Check Frontend-JS

Visit: http://localhost:3000

Should see the x402 Protocol interface with "Connect Wallet" button.

### 3. Check Frontend-Privy

Visit: http://localhost:3001

Should see Privy login interface with wallet connection options.

### 4. Test Python Agent

```bash
cd x402-agent
pip install -r requirements.txt
python test_agent.py
```

Should see:
```
✅ google.com is ALIVE
✅ Test PASSED - Agent is working!
```

## 🛑 Stopping Everything

Press `Ctrl+C` in the terminal where you ran `./start.sh`

All servers will stop automatically:
```
Stopping all servers...
```

## 🔄 Restarting

Just run `./start.sh` again!

The script is smart:
- ✅ Skips dependency installation if already done
- ✅ Reuses existing virtual environment
- ✅ Checks for .env files
- ✅ Fast startup on second run

## 📚 Next Steps

### Use the React App (Recommended)

1. Visit http://localhost:3001
2. Click "Connect Wallet"
3. Choose login method:
   - **Email** - Get a Privy embedded wallet
   - **Wallet** - Connect MetaMask/Coinbase
4. Enable auto-approve (for embedded wallets)
5. Select ping job
6. Toggle x402 payment ON
7. Request job & pay
8. Watch results stream!

### Use Vanilla JS

1. Visit http://localhost:3000
2. Connect MetaMask/Coinbase Wallet
3. Wallet will auto-switch to Base Sepolia
4. Get U tokens from faucet (if needed)
5. Select ping job, enter host, pay
6. Watch results

### Run the Agent

```bash
cd x402-agent
python x402_agent.py
```

Pings google.com every 3 minutes automatically.

## 🐛 Troubleshooting

### Backend won't start

```bash
cd x402-backend
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

Check output for errors.

### Frontend-Privy build errors

```bash
cd x402-privy
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Port already in use

If ports 8989, 3000, or 3001 are busy:

```bash
# Find process using port
lsof -i :8989
lsof -i :3000
lsof -i :3001

# Kill process
kill -9 <PID>
```

Or edit the port in:
- Backend: `x402-backend/config.py` → `PORT`
- Frontend-Privy: `x402-privy/vite.config.ts` → `server.port`

### Agent "Payment authorization failed"

Make sure `PAYMENT_RECIPIENT` in `x402-agent/x402_agent.py` matches your backend's `RECIPIENT_ADDRESS` in `x402-backend/.env`.

## 🎓 Learning Resources

### Understand the Code

- **Backend**: `x402-backend/main.py` - Main API server
- **x402 Auth**: `x402-backend/payments/x402_auth.py` - Signature verification
- **React App**: `x402-privy/src/App.tsx` - Full implementation
- **Agent**: `x402-agent/x402_agent.py` - Python client example

### Documentation

- `README.md` - Project overview
- `CLAUDE.md` - Detailed architecture
- `x402-agent/README.md` - Agent documentation
- `x402-js/README-PRIVY.md` - Privy integration guide

### API Docs

Visit: http://localhost:8989/docs (when backend is running)

Interactive Swagger UI with all endpoints.

## 💡 Tips

1. **Use Frontend-Privy (3001)** for the best experience
2. **Enable delegation** for auto-approve (no wallet popups!)
3. **Use x402 toggle** for instant payment authorization
4. **Check browser console** for detailed logs
5. **Use the agent** for automated monitoring

## 🎉 You're Ready!

Everything is set up and running. Enjoy exploring the x402 protocol!

For questions or issues, check:
- Console logs (browser DevTools)
- Backend logs (terminal)
