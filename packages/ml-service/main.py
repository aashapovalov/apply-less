"""
ApplyLess ML Service - Main Entry Point

This is the main FastAPI application for the ML service. It provides:
- Text embedding generation using sentence-transformers
- Health check endpoint with model status

The service loads a BGE-base-en-v1.5 model (~400MB) on startup and
keeps it in memory for fast inference. Typical embedding generation
takes 50-200ms per text on CPU.

Usage:
    python main.py

    Or with uvicorn directly:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Environment Variables:
    MODEL_NAME: Model to load (default: BAAI/bge-base-en-v1.5)
    MODEL_CACHE_DIR: Where to cache downloaded models (default: ./model_cache)
    HOST: Server host (default: 0.0.0.0)
    PORT: Server port (default: 8000)
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.embedding_service import EmbeddingService
from services.skill_extractor_service import SkillExtractorService
from api.health import router as health_router
from api.embed import router as embed_router
from api.chunk import router as chunk_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle - load model on startup, cleanup on shutdown.

    This async context manager is called by FastAPI when the application
    starts and stops. We use it to:
    1. Load the embedding model into memory on startup
    2. Store the service instance in app.state for access in routes
    3. Perform cleanup on shutdown (if needed)

    Args:
        app: The FastAPI application instance.

    Yields:
        None. The model is stored in app.state.embedding_service.

    Note:
        Model loading takes 10-60 seconds on first run (download required).
        Subsequent starts are faster as the model is cached locally.
    """
    print("Starting ML-service...")

    # Create and load embedding service
    # This downloads the model on first run and loads it into memory
    embedding_service = EmbeddingService()
    embedding_service.load_model()

    # Load skill extraction model
    skills_extraction_service = SkillExtractorService()
    skills_extraction_service.load_model()

    # Store in app.state so routes can access it via request.app.state
    app.state.embedding_service = embedding_service
    app.state.skills_extraction_service = skills_extraction_service

    print("✅ ML Service ready!")

    # Yield control to the application
    yield

    # Cleanup on shutdown (model is garbage collected automatically)
    print("👋 Shutting down ML-service...")


# Create FastAPI application with metadata for docs
app = FastAPI(
    title="ApplyLess ML-service",
    description="""Embedding generation and ML inference for job matching.
    
    ## Endpoints
    
    - **GET /health** - Health check with model status
    - **POST /api/embed** - Generate embeddings for multiple texts
    - **POST /api/embed/single** - Generate embedding for single text
    
    ## Model
    
    Uses BAAI/bge-base-en-v1.5 by default, which produces 768-dimensional
    embeddings optimized for semantic similarity search.
    """,
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for cross-origin requests from frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (restrict in production)
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Register routers
# Health check at root level (/health)
app.include_router(health_router)
# Embedding endpoints under /api prefix (/api/embed, /api/embed/single)
app.include_router(embed_router, prefix="/api")
app.include_router(chunk_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn

    # Run with uvicorn when executed directly
    # reload=True enables auto-reload on code changes (dev only)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)