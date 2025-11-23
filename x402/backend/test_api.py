"""
API Integration Test
"""
import requests
import json
import time

API_BASE = "http://localhost:8990"


def test_health():
    """Test health check endpoint"""
    print("1. Testing health check...")
    resp = requests.get(f"{API_BASE}/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["service"] == "x402 PoC"
    assert data["status"] == "running"
    assert data["connected"] == True
    print("   ✓ Health check PASS")


def test_list_jobs():
    """Test listing jobs"""
    print("2. Testing list jobs...")
    resp = requests.get(f"{API_BASE}/api/jobs")
    assert resp.status_code == 200
    data = resp.json()
    assert "ping" in data["jobs"]
    assert data["jobs"]["ping"]["price"] == "0.01"
    print("   ✓ List jobs PASS")


def test_job_request():
    """Test job request (should return 402)"""
    print("3. Testing job request (expect 402)...")
    resp = requests.post(
        f"{API_BASE}/api/jobs/request",
        json={
            "job_type": "ping",
            "params": {"host": "google.com", "count": 3},
            "wallet_address": "0x1234567890123456789012345678901234567890"
        }
    )
    assert resp.status_code == 402
    data = resp.json()
    assert "job_id" in data
    assert data["message"] == "Payment Required"
    assert data["payment"]["amount"] == "0.01"
    assert "expires_at" in data
    print(f"   ✓ Job request PASS (job_id: {data['job_id'][:8]}...)")
    return data["job_id"]


def test_job_status(job_id):
    """Test job status"""
    print("4. Testing job status...")
    resp = requests.get(f"{API_BASE}/api/jobs/status/{job_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "pending"
    assert data["paid"] == False
    print("   ✓ Job status PASS")


def test_execution_without_payment(job_id):
    """Test that execution fails without payment"""
    print("5. Testing execution without payment (expect 402)...")
    resp = requests.get(f"{API_BASE}/api/jobs/execute/{job_id}")
    assert resp.status_code == 402
    data = resp.json()
    assert data["detail"] == "Payment required"
    print("   ✓ Execution blocked PASS")


def test_invalid_job_type():
    """Test invalid job type"""
    print("6. Testing invalid job type (expect 400)...")
    resp = requests.post(
        f"{API_BASE}/api/jobs/request",
        json={
            "job_type": "nonexistent",
            "params": {},
            "wallet_address": "0x1234567890123456789012345678901234567890"
        }
    )
    assert resp.status_code == 400
    print("   ✓ Invalid job type rejected PASS")


def test_invalid_params():
    """Test invalid parameters"""
    print("7. Testing invalid parameters (expect 400)...")
    resp = requests.post(
        f"{API_BASE}/api/jobs/request",
        json={
            "job_type": "ping",
            "params": {"host": "", "count": 4},
            "wallet_address": "0x1234567890123456789012345678901234567890"
        }
    )
    assert resp.status_code == 400
    print("   ✓ Invalid params rejected PASS")


def main():
    print("=" * 60)
    print("x402 PoC - API Integration Tests")
    print("=" * 60)
    print()

    try:
        test_health()
        test_list_jobs()
        job_id = test_job_request()
        test_job_status(job_id)
        test_execution_without_payment(job_id)
        test_invalid_job_type()
        test_invalid_params()

        print()
        print("=" * 60)
        print("ALL API TESTS PASSED ✓")
        print("=" * 60)
        return 0

    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        return 1
    except requests.exceptions.ConnectionError:
        print("\n✗ Cannot connect to server. Is it running on port 8989?")
        return 1
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        return 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
