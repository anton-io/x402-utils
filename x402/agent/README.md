# x402 Protocol Agent

A Python agent that uses the **x402 payment protocol** to periodically ping google.com and report if it's alive or dead.

## 🎯 What It Does

Every **3 minutes**, the agent:
1. Creates an **EIP-712 signed payment authorization**
2. Requests a ping job from the backend using the **X-PAYMENT header**
3. Executes the job via **Server-Sent Events (SSE)**
4. Parses the output to determine if google.com is **ALIVE** or **DEAD**
5. Logs the result and waits for the next iteration

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd agent
pip install -r requirements.txt
```

### 2. Set Wallet (Optional)

```bash
# Option 1: Use existing wallet
export AGENT_PRIVATE_KEY="0x1234567890abcdef..."

# Option 2: Let agent generate a new wallet
# (It will print the private key on first run)
```

### 3. Run the Agent

```bash
python x402_agent.py
```

## 📋 Configuration

Edit `x402_agent.py` to configure:

```python
class Config:
    API_URL = "http://localhost:8989"  # Backend URL

    JOB_TYPE = "ping"                  # Job to execute
    PING_HOST = "google.com"           # Host to ping
    PING_COUNT = 4                     # Number of pings

    INTERVAL_SECONDS = 180             # 3 minutes between checks

    # Payment settings (must match backend config!)
    PAYMENT_RECIPIENT = "0x6b27b7af171b6042238f1034ef1815037ab9bfa5"
    TOKEN_ADDRESS     = "0x7143401013282067926d25e316f055fF3bc6c3FD"
    CHAIN_ID          = 84532  # Base Sepolia
```

## 🔑 Wallet Setup

### Generate New Wallet

On first run without `AGENT_PRIVATE_KEY`, the agent will generate a new wallet:

```
⚠️  Generated new wallet: 0x1234...5678
⚠️  Private key: 0xabcd...ef01
⚠️  Save this for future use!
```

**IMPORTANT:** Save the private key! Set it as environment variable for future runs:

```bash
export AGENT_PRIVATE_KEY="0xabcd...ef01"
```

### Use Existing Wallet

```bash
# Set private key
export AGENT_PRIVATE_KEY="your_private_key_here"

# Run agent
python x402_agent.py
```

## 💰 Payment Flow (x402 Protocol)

The agent uses **signature-based x402 payment** (no blockchain transaction required):

1. **Create EIP-712 Signature**
   ```python
   payment_data = {
       "recipient": "0x742d...",
       "token": "0x7143...",
       "amount": "10000000000000000",  # 0.01 U in wei
       "jobId": "uuid-here",
       "timestamp": 1234567890,
       "validUntil": 1234568190,
       "signature": "0x..."
   }
   ```

2. **Send X-PAYMENT Header**
   ```
   POST /api/jobs/request
   X-PAYMENT: {"recipient": "0x...", "signature": "0x...", ...}
   ```

3. **Backend Verifies Signature**
   - Checks EIP-712 signature matches wallet
   - Validates payment amount and expiry
   - Returns 200 OK with job ID

4. **Execute Job via SSE**
   - Connect to `/api/jobs/execute/{job_id}`
   - Stream results in real-time
   - Parse ping output

## 📊 Example Output

```
============================================================
🤖 x402 Agent Starting
============================================================
Wallet: 0x1234567890abcdef1234567890abcdef12345678
Target: google.com
Interval: 180 seconds (3.0 minutes)
API: http://localhost:8989
============================================================

🔄 Iteration #1
============================================================
🏓 Pinging google.com...
   Time: 2025-01-15T10:30:00.000000+00:00
============================================================
💰 Creating payment signature for 0.01 U...
📡 Requesting job with x402 payment...
✅ Payment authorized! Job ID: 12345678-1234-1234-1234-123456789abc
🚀 Executing job 12345678-1234-1234-1234-123456789abc...
   PING google.com (142.250.185.46): 56 data bytes
   64 bytes from 142.250.185.46: icmp_seq=0 ttl=115 time=10.5 ms
   64 bytes from 142.250.185.46: icmp_seq=1 ttl=115 time=9.8 ms
   64 bytes from 142.250.185.46: icmp_seq=2 ttl=115 time=10.2 ms
   64 bytes from 142.250.185.46: icmp_seq=3 ttl=115 time=10.1 ms
✅ Job completed!

✅ google.com is ALIVE

📊 Result: google.com is ALIVE ✅

⏰ Waiting 180 seconds until next check...
   Next check at: 10:33:00
```

## 🛠️ How It Works

### 1. EIP-712 Signature Creation

```python
def create_payment_signature(account, recipient, token, amount_wei, job_id):
    # Create typed data structure
    message_data = {
        "types": {...},
        "domain": {"name": "x402 Payment", "version": "1", ...},
        "message": {
            "recipient": recipient,
            "token": token,
            "amount": amount_wei,
            "jobId": job_id,
            "timestamp": now,
            "validUntil": now + 300
        }
    }

    # Sign with wallet private key
    encoded = encode_typed_data(message_data)
    signature = account.sign_message(encoded)

    return {..., "signature": signature.hex()}
```

### 2. x402 Request

```python
response = requests.post(
    f"{API_URL}/api/jobs/request",
    json={
        "job_type": "ping",
        "params": {"host": "google.com", "count": 4},
        "wallet_address": account.address
    },
    headers={
        "X-PAYMENT": json.dumps(payment_data)
    }
)
```

### 3. SSE Streaming

```python
response = requests.get(f"{API_URL}/api/jobs/execute/{job_id}", stream=True)

for line in response.iter_lines():
    if line.startswith(b'data: '):
        data = line[6:].decode('utf-8')
        print(data)
```

### 4. Result Parsing

```python
def parse_ping_result(output):
    if "bytes from" in output.lower():
        return True  # Alive
    if "100% packet loss" in output.lower():
        return False  # Dead
    return False
```

## 🔧 Customization

### Change Ping Target

```python
class Config:
    PING_HOST = "example.com"  # Change to any host
```

### Adjust Interval

```python
class Config:
    INTERVAL_SECONDS = 60  # Check every 1 minute
```

### Add Logging to File

```python
def ping_google(self):
    result = self.ping_google()

    # Log to file
    with open("ping_log.json", "a") as f:
        f.write(json.dumps(result) + "\n")
```

### Monitor Multiple Hosts

```python
HOSTS = ["google.com", "github.com", "stackoverflow.com"]

for host in HOSTS:
    Config.PING_HOST = host
    result = agent.ping_google()
    print(f"{host}: {'ALIVE' if result['alive'] else 'DEAD'}")
```

## ⚠️ Important Notes

### Payment Authorization

**The agent creates signed payment authorizations, but does NOT send actual blockchain transactions.**

- ✅ **x402 signature-based:** Fast, no gas fees, works immediately
- ❌ **Not on-chain:** Backend trusts the signature but settlement happens separately
- ⚠️ **For production:** Backend should submit signed authorizations to facilitator for on-chain settlement

### Wallet Balance

The agent doesn't need U tokens in its wallet because:
- It uses **signature-based payment** (EIP-712)
- No blockchain transaction is sent
- Backend verifies the signature, not the balance

**In production x402:**
- Facilitator would check wallet has sufficient USDC/tokens
- Facilitator submits transaction on behalf of user
- User's tokens are transferred after signature verification

## 🐛 Troubleshooting

### "Failed to request job"

- Check backend is running: `http://localhost:8989`
- Verify `Config.API_URL` is correct
- Check backend logs for errors

### "Payment authorization failed"

- Verify `Config.PAYMENT_RECIPIENT` matches backend recipient
- Check `Config.TOKEN_ADDRESS` is correct
- Ensure timestamp is not in the future

### "Failed to execute job"

- Check job was successfully authorized
- Verify SSE endpoint is accessible
- Check backend has permission to execute ping

### ImportError

```bash
pip install -r requirements.txt
```

## 📈 Production Enhancements

### 1. Persistent Logging

```python
import logging

logging.basicConfig(
    filename='agent.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
```

### 2. Database Storage

```python
import sqlite3

def log_result(result):
    conn = sqlite3.connect('ping_results.db')
    conn.execute(
        "INSERT INTO results (timestamp, host, alive, output) VALUES (?, ?, ?, ?)",
        (result['timestamp'], result['host'], result['alive'], result['output'])
    )
    conn.commit()
```

### 3. Alerting

```python
def check_and_alert(result):
    if not result['alive']:
        send_email(f"Alert: {result['host']} is DOWN!")
        send_slack(f"🚨 {result['host']} is unreachable")
```

## 🔗 Related

- **Backend:** `../backend` - x402 API server
- **Frontend:** `../frontend-privy` - React UI with x402

