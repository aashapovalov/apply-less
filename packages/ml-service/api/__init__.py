"""
API package.

This package contains FastAPI router definitions for the ML service endpoints.

Exports:
    health_router: Router for /health endpoint
"""

from .health import router as health_router
from .embed import router as embed_router
from .chunk import router as chunk_router

__all__ = ["health_router", "embed_router"]