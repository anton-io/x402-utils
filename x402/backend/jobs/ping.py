"""
Ping job implementation
"""
import asyncio
import re
from typing import AsyncIterator, Dict, Any
from decimal import Decimal
from .base import Job
from config import PING_PRICE_U, MAX_PING_COUNT, PING_TIMEOUT


class PingJob(Job):
    """Ping a host and stream results"""

    @classmethod
    def get_name(cls) -> str:
        return "ping"

    @classmethod
    def get_price(cls) -> Decimal:
        return PING_PRICE_U

    def validate_params(self) -> tuple[bool, str]:
        """Validate ping parameters"""
        host = self.params.get("host")
        count = self.params.get("count", 4)

        if not host:
            return False, "Missing 'host' parameter"

        # Basic validation for host (domain or IP)
        if not self._is_valid_host(host):
            return False, f"Invalid host: {host}"

        if not isinstance(count, int) or count < 1 or count > MAX_PING_COUNT:
            return False, f"Count must be between 1 and {MAX_PING_COUNT}"

        return True, ""

    def _is_valid_host(self, host: str) -> bool:
        """Basic validation for hostname or IP address"""
        # Allow alphanumeric, dots, hyphens (basic check)
        pattern = r'^[a-zA-Z0-9]([a-zA-Z0-9\-\.]*[a-zA-Z0-9])?$'
        return bool(re.match(pattern, host)) and len(host) <= 253

    async def execute(self) -> AsyncIterator[str]:
        """Execute ping command and stream output"""
        host = self.params.get("host")
        count = self.params.get("count", 4)

        yield f"Starting ping to {host} ({count} packets)...\n"

        try:
            # Build ping command (works on Linux)
            cmd = ["ping", "-c", str(count), "-W", str(PING_TIMEOUT), host]

            # Start the process
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            # Stream output line by line
            async for line in process.stdout:
                decoded_line = line.decode('utf-8')
                yield decoded_line

            # Wait for process to complete
            await process.wait()

            # Check for errors
            if process.returncode != 0:
                stderr = await process.stderr.read()
                error_msg = stderr.decode('utf-8')
                yield f"\nError: {error_msg}\n"
            else:
                yield f"\nPing completed successfully!\n"

        except Exception as e:
            yield f"\nError executing ping: {str(e)}\n"
