"""
x402 Payment Authorization using EIP-712 Signatures
"""
import json
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from eth_account.messages import encode_defunct, encode_typed_data
from eth_account import Account
from web3 import Web3

from config import CHAIN_ID, TOKEN_ADDRESS, PAYMENT_RECIPIENT_ADDRESS


def get_payment_domain() -> Dict[str, Any]:
    """Get EIP-712 domain for payment authorization"""
    return {
        "name": "x402 Payment",
        "version": "1",
        "chainId": CHAIN_ID,
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


def verify_payment_signature(
    payment_data: Dict[str, Any],
    expected_job_id: str,
    expected_amount: str
) -> tuple[bool, Optional[str], Optional[str]]:
    """
    Verify EIP-712 payment authorization signature

    Args:
        payment_data: Payment data with signature from X-PAYMENT header
        expected_job_id: The job ID we expect
        expected_amount: The amount in wei we expect

    Returns:
        (is_valid, signer_address, error_message)
    """
    try:
        # Extract signature
        signature = payment_data.get("signature")
        if not signature:
            return False, None, "Missing signature"

        # Verify all required fields
        required_fields = ["recipient", "token", "amount", "jobId", "timestamp", "validUntil"]
        for field in required_fields:
            if field not in payment_data:
                return False, None, f"Missing field: {field}"

        # Verify job ID matches
        if payment_data["jobId"] != expected_job_id:
            return False, None, f"Job ID mismatch: got {payment_data['jobId']}, expected {expected_job_id}"

        # Verify amount matches
        if payment_data["amount"] != expected_amount:
            return False, None, f"Amount mismatch: got {payment_data['amount']}, expected {expected_amount}"

        # Verify recipient matches
        if Web3.to_checksum_address(payment_data["recipient"]) != Web3.to_checksum_address(PAYMENT_RECIPIENT_ADDRESS):
            return False, None, f"Recipient mismatch"

        # Verify token address matches
        if Web3.to_checksum_address(payment_data["token"]) != Web3.to_checksum_address(TOKEN_ADDRESS):
            return False, None, f"Token address mismatch"

        # Verify timestamp is not too old (within 5 minutes)
        now = int(datetime.now(timezone.utc).timestamp())
        timestamp = int(payment_data["timestamp"])
        if now - timestamp > 300:  # 5 minutes
            return False, None, f"Signature too old"

        # Verify not expired
        valid_until = int(payment_data["validUntil"])
        if now > valid_until:
            return False, None, f"Signature expired"

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
                "recipient": Web3.to_checksum_address(payment_data["recipient"]),
                "token": Web3.to_checksum_address(payment_data["token"]),
                "amount": str(payment_data["amount"]),
                "jobId": payment_data["jobId"],
                "timestamp": timestamp,
                "validUntil": valid_until,
            }
        }

        # Encode and recover signer
        encoded_message = encode_typed_data(full_message=message_data)
        signer_address = Account.recover_message(encoded_message, signature=signature)

        return True, signer_address, None

    except Exception as e:
        return False, None, f"Signature verification failed: {str(e)}"


def parse_x_payment_header(x_payment_header: str) -> Optional[Dict[str, Any]]:
    """
    Parse X-PAYMENT header JSON

    Args:
        x_payment_header: JSON string from X-PAYMENT header

    Returns:
        Parsed payment data or None if invalid
    """
    try:
        return json.loads(x_payment_header)
    except json.JSONDecodeError:
        return None
