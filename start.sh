#!/bin/bash
# Quick start script for x402 PoC
# Starts: Backend, Frontend-JS, Frontend-Privy

# pip install web3 sse_starlette uvicorn

DIR_THIS="$( cd -P "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "============================================================"
echo "x402 PoC - Quick Start"
echo "============================================================"
echo ""

# Check if virtual environment exists
if [ ! -d "$DIR_THIS/x402-backend/venv" ]; then
    echo "Creating virtual environment..."
    cd "$DIR_THIS/x402-backend"
    python3 -m venv venv
    cd ..
fi

# Activate virtual environment
echo "Activating virtual environment..."
source x402-backend/venv/bin/activate

# Install dependencies if needed
if [ ! -f "$DIR_THIS/x402-backend/venv/installed" ]; then
    echo "Installing dependencies..."
    cd "$DIR_THIS/x402-backend"
    pip install -r requirements.txt
    touch venv/installed
    cd ..
fi

# Check if .env exists
if [ ! -f "$DIR_THIS/x402-backend/.env" ]; then
    echo ""
    echo "WARNING: x402-backend/.env not found!"
    echo "Please copy x402-backend/.env.example to x402-backend/.env"
    echo "and configure your RECIPIENT_ADDRESS"
    echo ""
    echo "cp x402-backend/.env.example x402-backend/.env"
    echo ""
    read -p "Press enter to continue anyway..."
fi

# Start backend
echo ""
echo "Starting backend server on http://localhost:8989..."
echo ""
cd "$DIR_THIS/x402-backend"
python main.py &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 2

# Start frontend-js
echo ""
echo "Starting frontend-js server on http://localhost:3000..."
echo ""
cd "$DIR_THIS/x402-js"
python3 -m http.server 3000 &
FRONTEND_JS_PID=$!
cd ..

# Wait a bit
sleep 1

# Check if frontend-privy node_modules exist
if [ ! -d "$DIR_THIS/x402-privy/node_modules" ]; then
    echo ""
    echo "Installing frontend-privy dependencies..."
    echo ""
    cd "$DIR_THIS/x402-privy"
    npm install
    cd ..
fi

# Check if frontend-privy .env exists
if [ ! -f "$DIR_THIS/x402-privy/.env" ]; then
    echo ""
    echo "WARNING: x402-privy/.env not found!"
    echo "Creating from template..."
    echo ""
    cat > "$DIR_THIS/x402-privy/.env" << 'EOF'
VITE_PRIVY_APP_ID=clzaq4s4k007zmd8qntbbskqz
VITE_API_URL=http://localhost:8989
EOF
fi

# Start frontend-privy
echo ""
echo "Starting frontend-privy (React + Vite) on http://localhost:3001..."
echo ""
cd "$DIR_THIS/x402-privy"
npm run dev > /tmp/frontend-privy.log 2>&1 &
FRONTEND_PRIVY_PID=$!
cd ..

# Wait for Vite to start
sleep 3

echo ""
echo "============================================================"
echo "✅ All servers running!"
echo "============================================================"
echo "Backend:        http://localhost:8989"
echo "Frontend-JS:    http://localhost:3000  (Vanilla JS + MetaMask)"
echo "Frontend-Privy: http://localhost:3001  (React + Privy + x402)"
echo "============================================================"
echo ""
echo "📝 Features by frontend:"
echo "  • 3000: Vanilla JS with MetaMask/Coinbase Wallet"
echo "  • 3001: React app with Privy (x402, delegation, auto-approve) ⭐ Recommended"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for Ctrl+C
trap "echo ''; echo 'Stopping all servers...'; kill $BACKEND_PID $FRONTEND_JS_PID $FRONTEND_PRIVY_PID 2>/dev/null; exit" INT
wait
