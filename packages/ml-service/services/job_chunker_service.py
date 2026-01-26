"""
Job Chunker Service

Splits job descriptions into semantic sections (about, responsibilities,
requirements, benefits, etc.), generates embeddings per section, and extracts
skills with mandatory / preferred levels.
"""

import re
from dataclasses import dataclass

from services.skill_extractor_service import SkillExtractorService
from services.embedding_service import EmbeddingService


@dataclass
class JobChunk:
    """
    Represents a single semantic chunk of a job description.

    Attributes:
        type:
            Section type (header, about, responsibilities, requirements, etc.)
        text:
            Raw text content of this section
        embedding:
            Optional embedding vector representing this section
        token_count:
            Approximate number of tokens / words in this chunk
    """
    type: str
    text: str
    embedding: list[float] | None = None
    token_count: int = 0

# Section header detection patterns.
# Each key corresponds to a semantic section type and contains regex patterns
# that match common job description headers.
SECTION_PATTERNS = {
    "about": [
        r"(?:^|\n)\s*(?:about\s+(?:us|the\s+company)|who\s+we\s+are|the\s+company|company\s+overview)\s*[:\-]?\s*",
    ],
    "responsibilities": [
        r"(?:^|\n)\s*(?:responsibilities|what\s+you'?ll\s+do|your\s+role|the\s+role|key\s+responsibilities|duties)\s*[:\-]?\s*",
    ],
    "requirements": [
        r"(?:^|\n)\s*(?:requirements|qualifications|what\s+we'?re\s+looking\s+for|must\s+have|skills?\s+required|you\s+have)\s*[:\-]?\s*",
    ],
    "benefits": [
        r"(?:^|\n)\s*(?:benefits|perks|what\s+we\s+offer|why\s+join|compensation)\s*[:\-]?\s*",
    ],
    "preferred": [
        r"(?:^|\n)\s*(?:nice\s+to\s+have|preferred|bonus\s+points?|ideally|good\s+to\s+have)\s*[:\-]?\s*",
    ],
}

class JobChunkerService:
    """
    Job description chunker that splits raw job text into semantic sections
    and enriches them with embeddings and structured skill data.

    Responsibilities:
    - Detect section boundaries using regex heuristics
    - Build semantic chunks (header + sections)
    - Generate embeddings per chunk (if embedding service is provided)
    - Extract prioritized skills (if skill extractor is provided)
    """
    def __init__(
        self,
        embedding_service: EmbeddingService = None,
        skill_extraction_service: SkillExtractorService = None,
    ):
        """
          Initialize the chunker with optional services.

          @param embedding_service:
              Service capable of generating embeddings for a list of texts.
              Must expose:
                - is_loaded
                - embed(texts, text_type=...)

          @param skill_extractor:
              Service capable of extracting skills with mandatory/preferred levels.
              Must expose:
                - is_loaded
                - extract_skills_with_context(...)
          """
        self.embedding_service = embedding_service
        self.skill_extraction_service = skill_extraction_service

    def chunk_job(
        self,
        text: str,
        title: str = "",
        company: str = "",
        location: str = "",
    ) -> dict:
        """
        Chunk a job description into semantic sections, generate embeddings,
        and extract prioritized skills.

        Pipeline:
        1. Create a synthetic "header" chunk from title/company/location
        2. Split the job text into semantic sections using regex heuristics
        3. Generate embeddings for each chunk (if embedding service is available)
        4. Extract skills with mandatory / preferred levels from full text
        5. Return structured chunks + skills

        @param text:
            Full raw job description text

        @param title:
            Job title (optional, used for header chunk)

        @param company:
            Company name (optional, used for header chunk)

        @param location:
            Job location (optional, used for header chunk)

        @returns:
            Dictionary with:
              - "chunks": list of chunk dicts with text + embedding + token_count
              - "skills": list of extracted skills with levels
        """
        chunks: list[JobChunk] = []

        # 1. Create synthetic header chunk from metadata (if provided)
        header_parts = [part for part in [title, company, location] if part]
        if header_parts:
            header_text = " - ".join(header_parts)
            chunks.append(JobChunk(type="header", text=header_text))

        # 2. Split job description into semantic sections
        sections = self._split_into_sections(text)

        if sections:
            # Create one chunk per detected section
            for section_type, section_text in sections.items():
                if section_text.strip():
                    chunks.append(
                        JobChunk(
                            type=section_type,
                            text=section_text.strip()
                        )
                    )
        else:
            # Fallback: if no headers detected, treat entire text as one chunk
            chunks.append(JobChunk(type="description", text=text.strip()))

        # 3. Generate embeddings for each chunk (section-level semantic vectors)
        if self.embedding_service and self.embedding_service.is_loaded:
            texts = [chunk.text for chunk in chunks]

            # Batch embedding is much faster than per-chunk calls
            embeddings = self.embedding_service.embed(texts, text_type="passage")

            for chunk, embedding in zip(chunks, embeddings):
                chunk.embedding = embedding

                # Approximate token count *used for diagnostics / limits/ UI)
                chunk.token_count = len(chunk.text.split())

        # 4. Extract prioritized skills from the full job description
        skills = []

        if self.skill_extraction_service and self.skill_extraction_service.is_loaded:
            skills = self.skill_extraction_service.extract_skills_with_context(text)

        # 5. Serialize output into plain dicts ( safe for JSON / API / DB)
        return {
            "chunks": [
                {
                    "type": c.type,
                    "text": c.text,
                    "embedding": c.embedding,
                    "token_count": c.token_count
                }
                for c in chunks
            ],
            "skills": skills,
        }

    @staticmethod
    def _split_into_sections(text: str) -> dict[str, str]:
        """
        Split raw job description text into semantic sections using
        header-detection heuristics.

        Strategy:
        - Scan text for all known section header patterns
        - Collect their character boundaries
        - Sort by position
        - Slice the text between consecutive headers
        - Assign each slice to the detected section type

        Special handling:
        - If there is text before the first detected section and it is long enough,
          treat it as an "about" section

        @param text:
            Full job description text

        @returns:
            Dictionary mapping:
              section_type -> section_text
        """
        sections: dict[str, str] = {}

        # 1. Detect all section header boundaries in the text
        boundaries: list[tuple[int, int, str]] = []

        for section_type, patterns in SECTION_PATTERNS.items():
            for pattern in patterns:
                for match in re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE):
                    boundaries.append((match.start(), match.end(), section_type)
                    )

        # If no headers found, return empty (caller will fallback to full text)
        if not boundaries:
            return {}

        # 2. Sort boundaries by their position in the text
        boundaries.sort(key=lambda x: x[0])

        # 3. Extract section contents between consecutive boundaries
        for i, (start, end, section_type) in enumerate(boundaries):

            # Content goes until the start of the next header or end of text
            if i + 1 < len(boundaries):
                content_end = boundaries[i + 1][0]
            else:
                content_end = len(text)

            content = text[end:content_end].strip()

            # Only keep first occurrence of each section type
            # (some job descriptions repeat headers)
            if content and section_type not in sections:
                sections[section_type] = content

        # 4. Handle intro text before first section (often company overview)
        if boundaries and boundaries[0][0] > 100:
            intro = text[:boundaries[0][0]].strip()

            # Treat long intro as "about" if not already present
            if intro and "about" not in sections:
                sections["about"] = intro

        return sections