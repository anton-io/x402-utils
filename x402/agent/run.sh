#!/bin/bash

# x402 Agent Runner

echo "============================================================"
echo "x402 Protocol Agent"
echo "============================================================"
echo ""

# Check if Python dependencies are installed
if ! python3 -c "import requests, eth_account, web3" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt
    echo ""
fi

# Check if backend is running
if ! curl -s http://localhost:8989/ > /dev/null; then
    echo "⚠️  WARNING: Backend not responding at http://localhost:8989"
    echo "   Make sure the backend is running before starting the agent"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Load .env if it exists
if [ -f .env ]; then
    echo "📝 Loading configuration from .env"
    export $(cat .env | grep -v '^#' | xargs)
    echo ""
fi

# Run agent
echo "🚀 Starting agent..."
echo ""
python3 x402_agent.py
