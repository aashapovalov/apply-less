"""
CV Generation API Endpoint

POST /api/generate-cv - Generate a tailored CV for a job
"""

import time

import anthropic
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from services.skill_gap_service import analyze_skill_gap

router = APIRouter(tags=["cv"])

class CVGenerateRequest(BaseModel):
    """Request body for CV generation"""
    # Job details
    job_title: str
    job_company: str
    job_location: str = ""
    job_description: str

    # Profile
    profile_text: str

class CVGenerateResponse(BaseModel):
    """Response body for CV generation"""
    cv_markdown: str
    match_summary: dict
    job: dict
    model: str
    time_ms: int
    warning: str | None = None

@router.post("/generate-cv", response_model=CVGenerateResponse)
async def generate_cv(request: Request, body: CVGenerateRequest):
    """
    Generate a tailored CV for a specific job.

    Takes job description and profile text, analyzes skill gaps,
    and generates a customized CV using Claude.

    Validation:
    - Profile must be at least 200 words (hard limit)
    - Profile under 300 words triggers a warning
    - Completeness score must be at least 0.4
    """
    start_time = time.time()

    # Get services from app state
    job_chunker = request.app.state.job_chunker_service
    profile_chunker = request.app.state.profile_chunker_service
    cv_generator = request.app.state.cv_generator_service

    if not cv_generator:
        raise HTTPException(status_code=503, detail="CV generator not available")

    # === VALIDATION ===

    # 1. Hard word count limit
    word_count = len(body.profile_text.split())
    if word_count < 200:
        raise HTTPException(
            status_code=400,
            detail=f"Profile too short ({word_count} words). Minimum 200 words required for CV generation."
        )

    # 2. Soft word count warning
    warning = None
    if word_count < 300:
        warning = f"Profile is short ({word_count} words). CV quality may be limited. Recommended: 300+ words."

    # 3. Chunk profile and check completeness
    profile_chunks = profile_chunker.chunk_profile(body.profile_text)
    profile_skills = profile_chunks.get("skills", [])
    completeness_score = profile_chunks.get("completeness_score", 0)

    if completeness_score < 0.4:
        raise HTTPException(
            status_code=400,
            detail=f"Profile lacks sufficient detail (completeness: {completeness_score:.0%}). Please add work experience, skills, and achievements."
        )

    # === GENERATION ===

    try:
        # 1. Chunk job to extract skills
        job_chunks = job_chunker.chunk_job(
            text=body.job_description,
            title=body.job_title,
            company=body.job_company,
            location=body.job_location
        )
        job_skills = job_chunks.get("skills", [])

        # 2. Analyze skill gap
        gap_analysis = analyze_skill_gap(job_skills, profile_skills)

        # 3. Separate mandatory and preferred skills
        mandatory_skills = [s["skill"] for s in job_skills if s.get("level") == "mandatory"]
        preferred_skills = [s["skill"] for s in job_skills if s.get("level") == "preferred"]

        # 4. Generate CV
        cv_markdown = cv_generator.generate_cv(
            job_title=body.job_title,
            job_company=body.job_company,
            job_location=body.job_location,
            job_description=body.job_description,
            profile_text=body.profile_text,
            matching_skills=gap_analysis["matching_skills"],
            missing_skills=gap_analysis["missing_skills"],
            mandatory_skills=mandatory_skills,
            preferred_skills=preferred_skills,
            match_rate=gap_analysis["match_rate"]
        )

        elapsed_ms = int((time.time() - start_time) * 1000)

        return CVGenerateResponse(
            cv_markdown=cv_markdown,
            match_summary=gap_analysis,
            job={
                "title": body.job_title,
                "company": body.job_company,
                "location": body.job_location
            },
            model=cv_generator.model,
            time_ms=elapsed_ms,
            warning=warning
        )

    except anthropic.APIError as e:
        raise HTTPException(status_code=503, detail=f"Anthropic API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))