"""
ERC20 token payment verification for Base network
"""
import asyncio
import time
from typing import Optional
from web3 import Web3
from web3.exceptions import BlockNotFound
from decimal import Decimal
from config import (
    BASE_SEPOLIA_RPC,
    TOKEN_ADDRESS,
    TOKEN_DECIMALS,
    PAYMENT_RECIPIENT_ADDRESS,
    CHAIN_ID
)

# ERC20 ABI (minimal - just Transfer event and balanceOf)
ERC20_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "from", "type": "address"},
            {"indexed": True, "name": "to", "type": "address"},
            {"indexed": False, "name": "value", "type": "uint256"}
        ],
        "name": "Transfer",
        "type": "event"
    },
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function"
    }
]


class PaymentVerifier:
    """Verifies ERC20 token payments on Base network"""

    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(BASE_SEPOLIA_RPC))
        self.token_contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(TOKEN_ADDRESS),
            abi=ERC20_ABI
        )
        self.recipient = Web3.to_checksum_address(PAYMENT_RECIPIENT_ADDRESS)

    async def verify_payment(
        self,
        from_address: str,
        expected_amount: Decimal,
        timeout: int = 300
    ) -> tuple[bool, Optional[str]]:
        """
        Verify that a payment was made from the given address.

        Args:
            from_address: Address of the payer
            expected_amount: Expected amount in U tokens
            timeout: Maximum time to wait for payment (seconds)

        Returns:
            (success, transaction_hash)
        """
        from_address = Web3.to_checksum_address(from_address)
        expected_wei = self._to_token_wei(expected_amount)

        start_time = time.time()
        start_block = self.w3.eth.block_number

        while time.time() - start_time < timeout:
            try:
                # Get latest block
                current_block = self.w3.eth.block_number

                if current_block > start_block:
                    # Check for Transfer events
                    transfer_filter = self.token_contract.events.Transfer.create_filter(
                        fromBlock=start_block,
                        toBlock=current_block,
                        argument_filters={
                            'from': from_address,
                            'to': self.recipient
                        }
                    )

                    events = transfer_filter.get_all_entries()

                    for event in events:
                        # Check if the amount matches
                        if event['args']['value'] >= expected_wei:
                            tx_hash = event['transactionHash'].hex()
                            return True, tx_hash

                    start_block = current_block + 1

                # Wait before next check
                await asyncio.sleep(2)

            except BlockNotFound:
                await asyncio.sleep(2)
                continue
            except Exception as e:
                print(f"Error checking payment: {e}")
                await asyncio.sleep(2)
                continue

        return False, None

    async def check_balance(self, address: str) -> Decimal:
        """Check token balance for an address"""
        address = Web3.to_checksum_address(address)
        balance_wei = self.token_contract.functions.balanceOf(address).call()
        return self._from_token_wei(balance_wei)

    def _to_token_wei(self, amount: Decimal) -> int:
        """Convert token amount to wei"""
        return int(amount * (10 ** TOKEN_DECIMALS))

    def _from_token_wei(self, wei: int) -> Decimal:
        """Convert wei to token amount"""
        return Decimal(wei) / Decimal(10 ** TOKEN_DECIMALS)

    def is_connected(self) -> bool:
        """Check if connected to the network"""
        try:
            return self.w3.is_connected()
        except:
            return False
