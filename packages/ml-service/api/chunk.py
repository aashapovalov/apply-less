"""
Chunking API Endpoints

Provides HTTP endpoints for chunking job descriptions and user profiles
into semantic sections, generating embeddings, extracting skills, and
returning structured results for downstream matching and UI use.

This module exposes:
- POST /chunk/job      → job sectioning + embeddings + prioritized skills
- POST /chunk/profile → profile sectioning + embeddings + skills + feedback
"""

import time
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel, Field

from services.profile_chunker_service import ProfileChunkerService

router = APIRouter(tags=["chunk"])

# ============================================================================
# Request / Response Models (API Schemas)
# ============================================================================

class JobChunkRequest(BaseModel):
    """
        Input payload for job chunking endpoint.

        Attributes:
            text:
                Full raw job description text
            title:
                Job title (optional, used to build header chunk)
            company:
                Company name (optional, used to build header chunk)
            location:
                Job location (optional, used to build header chunk)
        """
    text: str = Field(..., min_length=1, max_length=50000)
    title: str = Field(default="")
    company: str = Field(default="")
    location: str = Field(default="")

class ChunkItem(BaseModel):
    """
    Represents a single semantic chunk returned by the API.

    Attributes:
        type:
            Chunk type (header, about, responsibilities, requirements, etc.)
        text:
            Raw chunk text
        embedding:
            Optional embedding vector for this chunk
        token_count:
            Approximate number of tokens / words in this chunk
    """
    type: str
    text: str
    embedding: list[float] | None = None
    token_count: int = 0

class SkillItem(BaseModel):
    """
    Represents an extracted job skill with importance level.

    Attributes:
        skill:
            Skill name
        level:
            One of: mandatory / preferred / unknown
    """
    skill: str
    level: str = "unknown"

class JobChunkResponse(BaseModel):
    """
    Response payload for job chunking endpoint.

    Attributes:
        chunks:
            List of semantic job chunks with embeddings
        skills:
            List of extracted skills with mandatory / preferred levels
        model:
            Name of embedding model used
        dimension:
            Embedding vector dimension
        time_ms:
            Total processing time in milliseconds
    """
    chunks: list[ChunkItem]
    skills: list[SkillItem]
    model: str
    dimension: int
    time_ms: int

class ProfileChunkRequest(BaseModel):
    """
    Input payload for profile chunking endpoint.

    Attributes:
        text:
            Full raw profile / resume text
    """
    text: str = Field(..., min_length=1, max_length=50000)

class ProfileSkillItem(BaseModel):
    """
    Represents an extracted profile skill with source information.

    Attributes:
        skill:
            Skill name
        source:
            Origin of detection (currently always \"throughout\")
    """
    skill: str
    source: str = "throughout"

class ProfileChunkResponse(BaseModel):
    """
    Response payload for profile chunking endpoint.

    Attributes:
        chunks:
            List of semantic profile chunks with embeddings
        skills:
            List of extracted skills
        feedback:
            Human-readable feedback messages about profile quality
        completeness_score:
            Profile completeness score in range [0, 1]
        model:
            Name of embedding model used
        dimension:
            Embedding vector dimension
        time_ms:
            Total processing time in milliseconds
    """
    chunks: list[ChunkItem]
    skills: list[ProfileSkillItem]
    feedback: list[str]
    completeness_score: float
    model: str
    dimension: int
    time_ms: int

# ============================================================================
# Endpoints
# ============================================================================

@router.post("/chunk/job", response_model=JobChunkResponse)
async def chunk_job(request: Request, body: JobChunkRequest) -> JobChunkResponse:
    """
    Chunk a job description into semantic sections, generate embeddings,
    and extract prioritized skills.

    Processing steps:
    1. Validate that embedding and skill models are loaded
    2. Build JobChunker with injected services
    3. Run chunking + embedding + skill extraction pipeline
    4. Measure execution time
    5. Return structured response

    Errors:
    - 503 if embedding model is not loaded
    - 503 if skill extraction model is not loaded
    """
    # Retrieve shared services from application state
    embedding_service = request.app.state.embedding_service
    skills_extraction_service = request.app.state.skills_extraction_service

    # Ensure models are ready before processing
    if not embedding_service.is_loaded:
        raise HTTPException(status_code=503, detail="Embedding model not loaded")

    if not skills_extraction_service.is_loaded:
        raise HTTPException(status_code=503, detail="Skill extraction model not loaded")

    # Import locally to avoid circular imports during app startup
    from services.job_chunker_service import JobChunkerService

    start_time = time.time()

    # Initialize chunker with active services
    chunker = JobChunkerService(embedding_service, skills_extraction_service)

    # Run chunking pipeline
    result = chunker.chunk_job(
        body.text,
        body.title,
        body.company,
        body.location,
    )

    elapsed_time = int((time.time() - start_time) * 1000)

    # Build API response
    return JobChunkResponse(
        chunks=result["chunks"],
        skills=result["skills"],
        model=embedding_service.model_name,
        dimension=embedding_service.embedding_dim,
        time_ms=elapsed_time,
    )

@router.post("/chunk/profile", response_model=ProfileChunkResponse)
async def chunk_profile(request: Request, body: ProfileChunkRequest) -> ProfileChunkResponse:
    """
    Chunk a user profile into semantic aspects, generate embeddings,
    extract skills, and produce feedback with a completeness score.

    Processing steps:
    1. Validate that embedding and skill models are loaded
    2. Build ProfileChunker with injected services
    3. Run chunking + embedding + skill extraction + feedback pipeline
    4. Measure execution time
    5. Return structured response

    Errors:
    - 503 if embedding model is not loaded
    - 503 if skill extraction
    """
    # Retrieve shared services from application state
    embedding_service = request.app.state.embedding_service
    skills_extraction_service = request.app.state.skills_extraction_service

    # Ensure models are ready before processing
    if not embedding_service.is_loaded:
        raise HTTPException(status_code=503, detail="Embedding model not loaded")

    if not skills_extraction_service.is_loaded:
        raise HTTPException(status_code=503, detail="Skill extraction model not loaded")

    # Import locally to avoid circular imports during app startup
    from services.job_chunker_service import JobChunkerService

    start_time = time.time()

    # Initialize chunker with active services
    chunker = ProfileChunkerService(embedding_service, skills_extraction_service)

    # Run chunking pipeline
    result = chunker.chunk_profile(body.text)

    elapsed_ms = int((time.time() - start_time) * 1000)

    # Build API response
    return ProfileChunkResponse(
        chunks=result["chunks"],
        skills=result["skills"],
        feedback=result["feedback"],
        completeness_score=result["completeness_score"],
        model=embedding_service.model_name,
        dimension=embedding_service.embedding_dim,
        time_ms=elapsed_ms,
    )