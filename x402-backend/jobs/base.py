"""
Base class for all executable jobs
"""
from abc import ABC, abstractmethod
from typing import AsyncIterator, Dict, Any
from decimal import Decimal


class Job(ABC):
    """Abstract base class for jobs"""

    def __init__(self, job_id: str, params: Dict[str, Any]):
        self.job_id = job_id
        self.params = params

    @classmethod
    @abstractmethod
    def get_name(cls) -> str:
        """Return the job type name"""
        pass

    @classmethod
    @abstractmethod
    def get_price(cls) -> Decimal:
        """Return the price for this job in U tokens"""
        pass

    @abstractmethod
    async def execute(self) -> AsyncIterator[str]:
        """
        Execute the job and yield results as they become available.
        This is a generator that streams output.
        """
        pass

    @abstractmethod
    def validate_params(self) -> tuple[bool, str]:
        """
        Validate job parameters.
        Returns: (is_valid, error_message)
        """
        pass
