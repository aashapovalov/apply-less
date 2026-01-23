"""
Embedding API Endpoints

This module provides REST API endpoints for generating text embeddings.
These endpoints are called by the Node.js API to:
- Generate embeddings for job descriptions during ingestion
- Generate embeddings for user profiles during matching

Endpoints:
    POST /api/embed - Generate embeddings for multiple texts
    POST /api/embed/single - Generate embedding for a single text
"""

import time
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(tags=["embed"])

# =============================================================================
# Request/Response Models
# =============================================================================

class EmbedRequest(BaseModel):
    """
     Request body for batch embedding generation.

    Attributes:
        texts: List of texts to embed. Each text is converted to a
            768-dimensional vector. Maximum 100 texts per request
            to prevent memory issues and timeouts.
        normalize: Whether to L2-normalize embeddings. Normalized
            embeddings allow using dot product for similarity search,
            which is faster than cosine similarity. Default: True.
        text_type: Type of text being embedded. Important for BGE models!
            - "passage" (default): For documents/job descriptions stored in DB
            - "query": For search queries at query time (adds instruction prefix)
    """
    texts: list[str] = Field(
        ...,                # Required field
        min_length=1,       # At least one text
        max_length=100,     # Maximum 100 texts per request
        description="List of texts to embed (1-100 items)"
    )
    normalize: bool = Field(
        default=True,
        description="Whether to L2-normalize embeddings for cosine similarity"
    )
    text_type: str = Field(
        default="passage",
        pattern="^(query|passage)$",
        description="Type of text: 'passage' for documents, 'query' for search queries",
    )

class EmbedResponse(BaseModel):
    """
    Response body containing generated embeddings.

    Attributes:
        embeddings: List of embedding vectors. Each vector is a list of
            768 floats (for BGE-base). Order matches input texts.
        model: Name of the model used (e.g., "BAAI/bge-base-en-v1.5").
        dimension: Dimension of each embedding vector (768 for BGE-base).
        count: Number of embeddings generated (matches input texts count).
        time_ms: Time taken to generate embeddings in milliseconds.
    """
    embeddings: list[list[float]]
    model: str
    dimension: int
    count: int
    time_ms: int

class EmbedSingleRequest(BaseModel):
    """
    Request body for single text embedding.

    Attributes:
        text: The text to embed. Can be a sentence, paragraph, or
            document. For best results, keep under ~2000 characters.
            Longer texts are truncated by the model.
        normalize: Whether to L2-normalize the embedding. Default: True.
        text_type: Type of text being embedded. Important for BGE models!
            - "passage" (default): For documents stored in database
            - "query": For search queries (adds instruction prefix)
    """
    text: str = Field(
        ...,                # Required field
        min_length=1,       # At least one character
        max_length=10000,   # Maximum 10K characters
        description="Text to embed (1-10000 characters)"
    )
    normalize: bool = Field(
        default=True,
        description="Whether to L2-normalize embeddings"
    )
    text_type: str = Field(
        default="passage",
        pattern="^(query|passage)$",
        description="Type of text: 'passage' for documents, 'query' for search queries",
    )

class EmbedSingleResponse(BaseModel):
    """
    Response body containing a single embedding.

    Attributes:
        embedding: The embedding vector as a list of 768 floats.
        model: Name of the model used.
        dimension: Dimension of the embedding (768 for BGE-base).
        time_ms: Time taken to generate embedding in milliseconds.
    """
    embedding: list[float]
    model: str
    dimension: int
    time_ms: int


# =============================================================================
# API Endpoints
# =============================================================================

@router.post("/embed", response_model=EmbedResponse)
async def embed_texts(request: Request, body: EmbedRequest) -> EmbedResponse:
    """
    Generate embeddings for multiple texts.

    This endpoint takes a list of texts and returns their vector embeddings.

    Args:
        request: FastAPI request object for accessing app state.
        body: Request body containing texts to embed.
            - texts: List of 1-100 texts to embed
            - normalize: Whether to L2-normalize (default: true)

    Returns:
        EmbedResponse containing:
        - embeddings: List of embedding vectors (768 floats each)
        - model: Model name used
        - dimension: Embedding dimension (768)
        - count: Number of embeddings
        - time_ms: Processing time

    Raises:
        HTTPException 503: If model is not loaded (service starting up).
    """
    # Get embedding service from app state
    embeddings_service = request.app.state.embeddings_service

    # Check if model is loaded (may not be during start up)
    if not embeddings_service.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Service is starting up",
        )

    # Generate embeddings and measure time
    start_time = time.time()
    embeddings = embeddings_service.embed(
        body.texts,
        normalize=body.normalize,
        text_type=body.text_type,
    )
    elapsed_time = int((time.time() - start_time) * 1000)

    return EmbedResponse(
        embeddings=embeddings,
        model=embeddings_service.model_name,
        dimension=embeddings_service.embedding_dim,
        count=len(embeddings),
        time_ms=elapsed_time,
    )

@router.post("/embed/single", response_model=EmbedSingleResponse)
async def embed_single_text(request: Request, body: EmbedSingleRequest) -> EmbedSingleResponse:
    """
        Generate embedding for a single text.

    This endpoint takes a single text and returns its vector embedding.

    Args:
        request: FastAPI request object for accessing app state.
        body: Request body containing text to embed.
            - text: Text to embed (1-10000 characters)
            - normalize: Whether to L2-normalize (default: true)

    Returns:
        EmbedSingleResponse containing:
        - embedding: Embedding vector (768 floats)
        - model: Model name used
        - dimension: Embedding dimension (768)
        - time_ms: Processing time

    Raises:
        HTTPException 503: If model is not loaded.
    """
    # Get embedding service from app state
    embeddings_service = request.app.state.embeddings_service

    # Check if model is loaded
    if not embeddings_service.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Service is starting up",
        )

    # Generate embedding and measure time
    start_time = time.time()
    embedding = embeddings_service.embed_single(
        body.text,
        normalize=body.normalize,
        text_type=body.text_type,
    )
    elapsed_time = int((time.time() - start_time) * 1000)

    return EmbedSingleResponse(
        embedding=embedding,
        model=embeddings_service.model_name,
        dimension=embeddings_service.embedding_dim,
        time_ms=elapsed_time,
    )

