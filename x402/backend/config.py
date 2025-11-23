"""
Configuration for x402 PoC
"""
import os
from decimal import Decimal

# Network Configuration
BASE_SEPOLIA_RPC = os.getenv("BASE_RPC", "https://base-sepolia-rpc.publicnode.com")
CHAIN_ID = 84532  # Base Sepolia

# Token Configuration
TOKEN_ADDRESS = "0x7143401013282067926d25e316f055fF3bc6c3FD"    # Base Sepolia U Token
TOKEN_DECIMALS = 18

# Payment Configuration
PAYMENT_TIMEOUT_SECONDS = int(os.getenv("PAYMENT_TIMEOUT", "300"))  # 5 minutes default
PING_PRICE_U = Decimal("0.01")  # Price per ping in U tokens

# Wallet Configuration
PAYMENT_RECIPIENT_ADDRESS = os.getenv("RECIPIENT_ADDRESS", "0x6b27b7af171b6042238f1034ef1815037ab9bfa5")

# Server Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8989"))
CORS_ORIGINS = ["*"]  # For development; restrict in production

# Job Configuration
MAX_PING_COUNT = 10
PING_TIMEOUT = 5  # seconds per ping
