#!/usr/bin/env python3
"""
Quick test of x402 agent - single ping execution
"""

from x402_agent import X402Agent, Config


def main():
    print("🧪 Testing x402 Agent (Single Ping)\n")

    # Create agent (will generate wallet if needed)
    agent = X402Agent()

    print(f"\n🎯 Configuration:")
    print(f"   API: {Config.API_URL}")
    print(f"   Target: {Config.PING_HOST}")
    print(f"   Count: {Config.PING_COUNT}")

    # Execute single ping
    result = agent.ping_google()

    # Show result
    print(f"\n{'='*60}")
    print(f"📋 TEST RESULT")
    print(f"{'='*60}")
    print(f"Success: {result['success']}")
    print(f"Host: {result.get('host', 'N/A')}")
    print(f"Alive: {result['alive']}")
    print(f"Timestamp: {result['timestamp']}")

    if result.get('error'):
        print(f"Error: {result['error']}")

    print(f"{'='*60}\n")

    if result['success'] and result['alive']:
        print("✅ Test PASSED - Agent is working!")
        return 0
    else:
        print("❌ Test FAILED - Check errors above")
        return 1


if __name__ == "__main__":
    exit(main())
