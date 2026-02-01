"""
CV Comparison API Endpoint

POST /api/compare-cv - Compare a CV against a job description
Returns match score, skill coverage, and gap analysis.
"""

import time
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel, Field
import numpy as np

router = APIRouter(tags=["compare"])

class CompareCVRequest(BaseModel):
    """
    Input payload for CV-to-job comparison endpoint.

    Attributes:
        cv_text:
            Full raw CV or resume text of the candidate.
        job_title:
            Optional job title, used to enrich semantic comparison.
        job_company:
            Optional company name for additional job context.
        job_description:
            Full raw job description text to compare against the CV.
    """
    cv_text: str = Field(..., min_length=1, max_length=50000)
    job_title: str = Field(default="")
    job_company: str = Field(default="")
    job_description: str = Field(..., min_length=1, max_length=50000)

class RequirementItem(BaseModel):
    """
    Represents a single job requirement and its coverage status.

    Attributes:
        skill:
            Name of the required or preferred skill.
        covered:
            Indicates whether the skill is present in the CV.
    """
    skill: str
    covered: bool

class RequirementsAnalysis(BaseModel):
    """
    Job requirements grouped by priority with coverage information.

    Attributes:
        mandatory:
            List of mandatory job requirements and their coverage status.
        preferred:
            List of preferred job requirements and their coverage status.
    """
    mandatory: list[RequirementItem]
    preferred: list[RequirementItem]

class ComparisonSummary(BaseModel):
    """
    Aggregated coverage statistics for the CV comparison.

    Attributes:
        covered_count:
            Total number of job requirements covered by the CV.
        total_count:
            Total number of job requirements analyzed.
        mandatory_covered:
            Coverage summary for mandatory requirements (e.g. "4/6").
        preferred_covered:
            Coverage summary for preferred requirements (e.g. "1/2").
    """
    covered_count: int
    total_count: int
    mandatory_covered: str  # e.g., "4/6"
    preferred_covered: str  # e.g., "1/2"

class CompareCVResponse(BaseModel):
    """
    Response payload for CV comparison endpoint.

    Attributes:
        score:
            Overall semantic match score between CV and job description
            in the range [0.0, 1.0].
        job_requirements:
            Structured analysis of mandatory and preferred requirements
            with coverage status.
        summary:
            Aggregated coverage statistics.
        cv_skills:
            List of skills extracted from the CV.
        time_ms:
            Total processing time in milliseconds.
    """
    score: float  # 0.0 - 1.0
    job_requirements: RequirementsAnalysis
    summary: ComparisonSummary
    cv_skills: list[str]
    time_ms: int

@router.post("/compare-cv", response_model=CompareCVResponse)
async def compare_cv(request: Request, body: CompareCVRequest) -> CompareCVResponse:
    """
       Compare a CV against a job description and return a match score,
       skill coverage, and gap analysis.

       This endpoint combines two evaluation layers:
       - Explicit skill coverage: which job requirements are covered by the CV
       - Semantic similarity: cosine similarity between CV and job embeddings

       Processing steps:
       1. Validate that the embedding model is loaded and ready
       2. Extract skills from the CV using the profile chunker
       3. Extract skills from the job description using the job chunker
       4. Group job skills into mandatory vs preferred and mark CV coverage
       5. Compute coverage summary statistics (counts and ratios)
       6. Generate normalized embeddings for:
          - CV text
          - Job text (title + description)
       7. Compute cosine similarity score and clamp to [0.0, 1.0]
       8. Measure execution time and return structured response

       Notes:
       - Skill coverage uses case-insensitive exact matching on extracted skill names.
       - Semantic score reflects overall textual similarity and may remain high even if
         some mandatory skills are missing (and vice versa).
       - Job company name is used only for chunking context (not in the job embedding).

       Errors:
       - 503 if the embedding model is not loaded
       - 500 for unexpected processing errors
       """
    start_time = time.time()

    # Get services from app state
    embedding_service = request.app.state.embedding_service
    job_chunker = request.app.state.job_chunker_service
    profile_chunker = request.app.state.profile_chunker_service

    if not embedding_service.is_loaded:
        raise HTTPException(status_code=503, detail="Embedding model not loaded")

   # 1. Extract skills from CV
    cv_chunks = profile_chunker.chunk_profile(body.cv_text)
    cv_skills = [skill["skill"] for skill in cv_chunks.get("skills", [])]
    cv_skills_lower = {skill.lower() for skill in cv_skills}

    # 2. Extract skills from job
    job_chunks = job_chunker.chunk_job(
        text=body.job_description,
        title=body.job_title,
        company=body.job_company,
        location=""
    )
    job_skills = job_chunks.get("skills", [])

    # 3. Separate mandatory and preferred, check coverage
    mandatory_reqs: list[RequirementItem] = []
    preferred_reqs: list[RequirementItem] = []

    for skill in job_skills:
        skill_name = skill["skill"]
        is_covered = skill_name.lower() in cv_skills_lower
        req_item = RequirementItem(skill=skill_name, covered=is_covered)

        if skill.get("level") == "mandatory":
            mandatory_reqs.append(req_item)
        else:
            preferred_reqs.append(req_item)

    # 4. Calculate coverage stats
    mandatory_covered = sum(1 for r in mandatory_reqs if r.covered)
    preferred_covered = sum(1 for r in preferred_reqs if r.covered)
    total_mandatory = len(mandatory_reqs)
    total_preferred = len(preferred_reqs)

    total_covered = mandatory_covered + preferred_covered
    total_count = total_mandatory + total_preferred

    # 5. Generate embeddings and calculate similarity
    cv_embedding = embedding_service.embed_single(body.cv_text, normalize=True)

    # Combine job title and description for embedding
    job_text = f"{body.job_title}\n\n{body.job_description}"
    job_embedding = embedding_service.embed_single(job_text, normalize=True)

    # Calculate cosine similarity
    cv_vec = np.array(cv_embedding)
    job_vec = np.array(job_embedding)
    score = float(np.dot(cv_vec, job_vec) / (np.linalg.norm(cv_vec) * np.linalg.norm(job_vec)))

    # Clamp score to 0-1 range
    score = max(0.0, min(1.0, score))

    elapsed_ms = int((time.time() - start_time) * 1000)

    return CompareCVResponse(
        score=round(score, 3),
        job_requirements=RequirementsAnalysis(
            mandatory=mandatory_reqs,
            preferred=preferred_reqs
        ),
        summary=ComparisonSummary(
            covered_count=total_covered,
            total_count=total_count,
            mandatory_covered=f"{mandatory_covered}/{total_mandatory}",
            preferred_covered=f"{preferred_covered}/{total_preferred}"
        ),
        cv_skills=cv_skills,
        time_ms=elapsed_ms
    )