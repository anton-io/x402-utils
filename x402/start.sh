#!/bin/bash
# Quick start script for x402 PoC

echo "x402 PoC - Quick Start"
echo "====================="
echo ""

# Check if virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "Creating virtual environment..."
    cd backend
    python3 -m venv venv
    cd ..
fi

# Activate virtual environment
echo "Activating virtual environment..."
source backend/venv/bin/activate

# Install dependencies if needed
if [ ! -f "backend/venv/installed" ]; then
    echo "Installing dependencies..."
    cd backend
    pip install -r requirements.txt
    touch venv/installed
    cd ..
fi

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo ""
    echo "WARNING: backend/.env not found!"
    echo "Please copy backend/.env.example to backend/.env"
    echo "and configure your RECIPIENT_ADDRESS"
    echo ""
    echo "cp backend/.env.example backend/.env"
    echo ""
    read -p "Press enter to continue anyway..."
fi

# Start backend
echo ""
echo "Starting backend server on http://localhost:8000..."
echo ""
cd backend
python main.py &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 2

# Start frontend
echo ""
echo "Starting frontend server on http://localhost:3000..."
echo ""
cd frontend
python3 -m http.server 3000 &
FRONTEND_PID=$!
cd ..

echo ""
echo "====================="
echo "Servers running!"
echo "Backend:  http://localhost:8989"
echo "Frontend: http://localhost:3000"
echo "====================="
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
