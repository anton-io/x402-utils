"""
Server-Sent Events (SSE) for streaming job results
"""
import asyncio
from typing import AsyncIterator
from sse_starlette.sse import EventSourceResponse


async def stream_job_output(job) -> AsyncIterator[dict]:
    """
    Stream job execution output as SSE events

    Args:
        job: Job instance to execute

    Yields:
        SSE event dictionaries
    """
    try:
        # Send start event
        yield {
            "event": "start",
            "data": f"Job {job.job_id} started"
        }

        # Stream job output
        async for output in job.execute():
            yield {
                "event": "output",
                "data": output
            }

        # Send completion event
        yield {
            "event": "complete",
            "data": f"Job {job.job_id} completed"
        }

    except Exception as e:
        # Send error event
        yield {
            "event": "error",
            "data": str(e)
        }


def create_sse_response(job) -> EventSourceResponse:
    """
    Create an SSE response for job streaming

    Args:
        job: Job instance to execute

    Returns:
        EventSourceResponse for FastAPI
    """
    return EventSourceResponse(stream_job_output(job))
