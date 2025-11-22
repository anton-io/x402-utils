"""
Job registry for managing available job types
"""
from typing import Dict, Type, Optional
from .base import Job
from .ping import PingJob


class JobRegistry:
    """Registry of all available job types"""

    def __init__(self):
        self._jobs: Dict[str, Type[Job]] = {}
        self._register_default_jobs()

    def _register_default_jobs(self):
        """Register built-in job types"""
        self.register(PingJob)

    def register(self, job_class: Type[Job]):
        """Register a new job type"""
        job_name = job_class.get_name()
        self._jobs[job_name] = job_class

    def get_job_class(self, job_name: str) -> Optional[Type[Job]]:
        """Get a job class by name"""
        return self._jobs.get(job_name)

    def list_jobs(self) -> Dict[str, Dict]:
        """List all available jobs with their details"""
        return {
            name: {
                "name": job_class.get_name(),
                "price": str(job_class.get_price())
            }
            for name, job_class in self._jobs.items()
        }


# Global registry instance
job_registry = JobRegistry()
