#!/usr/bin/env python3

from shared import *


# === HELPER FUNCTIONS ===
def wait_for_receipt(tx_hash):
    print(f"Waiting for tx {tx_hash.hex()}...")
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=300)
    if receipt.status == 1:
        print("Success!")
    else:
        print("Failed!")
    return receipt


def get_faucet():
    global U_FAUCET_ADDRESS
    if not U_FAUCET_ADDRESS:
        U_FAUCET_ADDRESS = input("Enter deployed faucet address: ").strip()
    return w3.eth.contract(address=U_FAUCET_ADDRESS, abi=FAUCET_ABI)


def get_token():
    return w3.eth.contract(address=U_TOKEN_ADDRESS, abi=ERC20_ABI)


# === MANAGEMENT FUNCTIONS ===
def deposit_tokens(amount_u):
    token = get_token()
    faucet = get_faucet()
    amount = int(amount_u * 1e18)  # assuming 18 decimals

    print(f"Approving {amount_u} U tokens...")
    tx = token.functions.approve(U_FAUCET_ADDRESS, amount).build_transaction({
        'from': account.address,
        'nonce': w3.eth.get_transaction_count(account.address),
        'gasPrice': w3.eth.gas_price
    })
    signed = account.sign_transaction(tx)
    wait_for_receipt(w3.eth.send_raw_transaction(signed.raw_transaction))

    print(f"Depositing {amount_u} U tokens into faucet...")
    tx = faucet.functions.deposit(amount).build_transaction({
        'from': account.address,
        'nonce': w3.eth.get_transaction_count(account.address),
        'gasPrice': w3.eth.gas_price
    })
    signed = account.sign_transaction(tx)
    wait_for_receipt(w3.eth.send_raw_transaction(signed.raw_transaction))


def set_withdraw_amount(amount_u):
    faucet = get_faucet()
    amount = int(amount_u * 1e18)
    tx = faucet.functions.setWithdrawAmount(amount).build_transaction({
        'from': account.address,
        'nonce': w3.eth.get_transaction_count(account.address),
        'gasPrice': w3.eth.gas_price
    })
    signed = account.sign_transaction(tx)
    wait_for_receipt(w3.eth.send_raw_transaction(signed.raw_transaction))
    print(f"Withdraw amount set to {amount_u} U")


def set_cooldown(hours):
    faucet = get_faucet()
    seconds = hours * 3600
    tx = faucet.functions.setLockTime(seconds).build_transaction({
        'from': account.address,
        'nonce': w3.eth.get_transaction_count(account.address),
        'gasPrice': w3.eth.gas_price
    })
    signed = account.sign_transaction(tx)
    wait_for_receipt(w3.eth.send_raw_transaction(signed.raw_transaction))
    print(f"Cooldown set to {hours} hours")


def emergency_withdraw():
    faucet = get_faucet()
    balance = faucet.functions.faucetBalance().call()
    if balance == 0:
        print("Faucet is empty")
        return
    tx = faucet.functions.emergencyWithdraw(balance).build_transaction({
        'from': account.address,
        'nonce': w3.eth.get_transaction_count(account.address),
        'gasPrice': w3.eth.gas_price
    })
    signed = account.sign_transaction(tx)
    wait_for_receipt(w3.eth.send_raw_transaction(signed.raw_transaction))
    print(f"Emergency withdrew {balance / 1e18} U tokens")


def check_status():
    faucet = get_faucet()
    token = get_token()
    balance = faucet.functions.faucetBalance().call()
    owner = faucet.functions.owner().call()
    print(f"Faucet Balance: {balance / 1e18} U")
    print(f"Owner: {owner}")
    print(f"Your U balance: {token.functions.balanceOf(account.address).call() / 1e18} U")


# === MENU ===
if __name__ == "__main__":
    print("U Token Faucet Manager")
    print(f"Account: {account.address}")
    print(f"Chain ID: {w3.eth.chain_id}")

    while True:
        print("\n" + "="*50)
        print("1. Check Status")
        print("2. Deposit U Tokens")
        print("3. Set Withdraw Amount (U)")
        print("4. Set Cooldown (hours)")
        print("5. Emergency Withdraw All")
        print("6. Exit")
        choice = input("Choose: ")

        if choice == "1":
            check_status()
        elif choice == "2":
            amt = float(input("Amount of U to deposit: "))
            deposit_tokens(amt)
        elif choice == "3":
            amt = float(input("New withdraw amount (U): "))
            set_withdraw_amount(amt)
        elif choice == "4":
            hrs = int(input("New cooldown in hours: "))
            set_cooldown(hrs)
        elif choice == "5":
            emergency_withdraw()
        elif choice == "6":
            break
        else:
            print("Invalid choice")