// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);  // Optional: for safety checks
}

contract UTokenFaucet {
    address public immutable U_TOKEN = 0x7143401013282067926d25e316f055fF3bc6c3FD;
    address public owner;
    uint256 public withdrawAmount = 1 * 10**18;    // 1 U tokens (assuming 18 decimals; adjust if different)
    uint256 public lockTime = 24 hours;            // Cooldown between withdrawals.

    // Track the last withdrawal time for each address
    mapping(address => uint256) public nextRequestAt;

    event Withdrawal(address indexed to, uint256 amount);
    event Deposit(address indexed from, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    // Users call this function to get U tokens.
    function withdraw() external {
        require(msg.sender != address(0), "Zero address");
        require(nextRequestAt[msg.sender] <= block.timestamp, "Try again later");
        require(IERC20(U_TOKEN).balanceOf(address(this)) >= withdrawAmount, "Faucet empty");

        // Update cooldown for this user
        nextRequestAt[msg.sender] = block.timestamp + lockTime;

        bool success = IERC20(U_TOKEN).transfer(msg.sender, withdrawAmount);
        require(success, "Failed to send tokens");

        emit Withdrawal(msg.sender, withdrawAmount);
    }

    // Owner can deposit U tokens (call this from your wallet after approving the faucet).
    function deposit(uint256 amount) external {
        bool success = IERC20(U_TOKEN).transferFrom(msg.sender, address(this), amount);
        require(success, "Deposit failed");
        emit Deposit(msg.sender, amount);
    }

    // Owner functions
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function changeOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }

    function setWithdrawAmount(uint256 newAmount) external onlyOwner {
        withdrawAmount = newAmount;
    }

    function setLockTime(uint256 newLockTime) external onlyOwner {
        lockTime = newLockTime;
    }

    // Emergency withdraw (owner can drain remaining tokens if needed)
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        bool success = IERC20(U_TOKEN).transfer(owner, amount);
        require(success, "Failed to withdraw");
    }

    // View function to check how much time left for an address
    function timeLeft(address user) external view returns (uint256) {
        if (nextRequestAt[user] <= block.timestamp) {
            return 0;
        }
        return nextRequestAt[user] - block.timestamp;
    }

    // View current faucet balance of U tokens
    function faucetBalance() external view returns (uint256) {
        return IERC20(U_TOKEN).balanceOf(address(this));
    }
}