"""
Test script to verify the x402 PoC flow
"""
import asyncio
import sys
from jobs.ping import PingJob


async def test_ping_job():
    """Test the ping job execution"""
    print("Testing Ping Job Execution")
    print("=" * 50)

    # Create a ping job
    job = PingJob(
        job_id="test-123",
        params={
            "host": "8.8.8.8",
            "count": 3
        }
    )

    # Validate parameters
    is_valid, error = job.validate_params()
    print(f"\nParameter validation: {'PASS' if is_valid else 'FAIL'}")
    if not is_valid:
        print(f"Error: {error}")
        return False

    # Check job details
    print(f"Job name: {job.get_name()}")
    print(f"Job price: {job.get_price()} U")
    print(f"\nExecuting ping to 8.8.8.8 (3 packets)...")
    print("-" * 50)

    # Execute the job
    try:
        async for output in job.execute():
            print(output, end='')
        print("-" * 50)
        print("Job execution: PASS")
        return True
    except Exception as e:
        print(f"Job execution: FAIL - {e}")
        return False


async def test_validation():
    """Test parameter validation"""
    print("\n\nTesting Parameter Validation")
    print("=" * 50)

    test_cases = [
        ({"host": "google.com", "count": 4}, True, "Valid params"),
        ({"host": "", "count": 4}, False, "Empty host"),
        ({"host": "example.com", "count": 999}, False, "Count too high"),
        ({"host": "192.168.1.1", "count": 1}, True, "IP address"),
        ({"host": "invalid..host", "count": 4}, False, "Invalid hostname"),
    ]

    passed = 0
    failed = 0

    for params, should_pass, description in test_cases:
        job = PingJob(job_id="test", params=params)
        is_valid, error = job.validate_params()

        status = "PASS" if is_valid == should_pass else "FAIL"
        if is_valid == should_pass:
            passed += 1
        else:
            failed += 1

        print(f"{description:30} - {status:5} (valid={is_valid}, error='{error}')")

    print(f"\nValidation tests: {passed} passed, {failed} failed")
    return failed == 0


async def main():
    """Run all tests"""
    print("x402 PoC - Testing Suite")
    print("=" * 50)
    print()

    results = []

    # Test validation
    results.append(await test_validation())

    # Test ping execution
    results.append(await test_ping_job())

    # Summary
    print("\n" + "=" * 50)
    print("TEST SUMMARY")
    print("=" * 50)
    if all(results):
        print("All tests PASSED ✓")
        return 0
    else:
        print("Some tests FAILED ✗")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
