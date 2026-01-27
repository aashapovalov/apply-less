"""
Profile Chunker Service

Splits user profiles / resumes into semantic aspects (full, experience, education),
optionally generates embeddings, extracts skills, and produces structured feedback
with a completeness score.

This service prepares candidate profiles for:
- semantic matching against job descriptions
- section-level embedding comparison
- skill overlap analysis
- UI feedback on profile quality and completeness
"""

import re
from dataclasses import dataclass
from typing import TYPE_CHECKING

from services.profile_pattern_regex import *

# These imports are only needed for type checking and do not create runtime
# dependencies (prevents circular imports and speeds up startup)
if TYPE_CHECKING:
    from services.embedding_service import EmbeddingService
    from services.skill_extractor_service import SkillExtractorService


@dataclass
class ProfileChunk:
    """
    Represents a single semantic chunk of a user profile.

    Attributes:
        type:
            Aspect type ("full", "experience", "education")
        text:
            Raw text content of this aspect
        embedding:
            Optional embedding vector representing this aspect
        token_count:
            Approximate number of tokens / words in this chunk
    """
    type: str
    text: str
    embedding: list[float] | None = None
    token_count: int = 0

class ProfileChunkerService:
    """
    Profile chunker that extracts semantic aspects from user profiles and
    generates structured data for matching and quality feedback.


    Multi‑signal extraction strategy:
    1. Date ranges              → structured CV sections
    2. Job titles               → role‑based blocks
    3. Action verb sentences    → bullet achievements
    4. Narrative detection      → free‑form descriptions


    Responsibilities:
    - Build semantic chunks (full / experience / education)
    - Generate embeddings per chunk (optional)
    - Extract technical skills (optional)
    - Produce feedback and a completeness score
    """
    def __init__(
        self,
        embedding_service: "EmbeddingService | None" = None,
        skill_extractor_service: "SkillExtractorService | None" = None,
    ) -> None:
        self.embedding_service = embedding_service
        self.skill_extractor_service = skill_extractor_service

    # =========================================================================
    # Main pipeline
    # =========================================================================

    def chunk_profile(self, text: str) -> dict:
        """
        Chunk a user profile into semantic aspects, enrich them with embeddings
        and skills, and generate quality feedback with a completeness score.

        Pipeline:
        1. Create a truncated "full" profile chunk
        2. Extract experience aspect using multi‑signal detection
        3. Extract education aspect using regex patterns
        4. Generate embeddings per chunk (if embedding service is available)
        5. Extract technical skills from the full profile
        6. Generate feedback and completeness score


        @param text:
        Full raw profile / resume text

        @returns:
        Dictionary with:
        - "chunks": list of semantic profile chunks
        - "skills": extracted skills with source labels
        - "feedback": human‑readable feedback messages
        - "completeness_score": float in [0, 1]
        """
        chunks: list[ProfileChunk] = []

        # 1. Full chunk (always present)
        # Truncated to protect embedding cost and avoid huge payloads
        full_text = self._truncate_text(text, max_chars=2000)
        chunks.append(ProfileChunk(type="full", text=full_text))

        # 2. Experience chunk (multi-signal extraction)
        experience_text = self._extract_experience(text)
        if experience_text:
            chunks.append(ProfileChunk(type="experience", text=experience_text))

        # 3. Education chunk
        education_text = self._extract_education(text)
        if education_text:
            chunks.append(ProfileChunk(type="education", text=education_text))

        # 4. Generate embeddings per chunk (optional enrichment)
        if self.embedding_service and self.embedding_service.is_loaded:
            texts = [chunk.text for chunk in chunks]

            # Batch embedding is faster and more GPU efficient
            embeddings = self.embedding_service.embed(texts, text_type="passage")

            for c, emb in zip(chunks, embeddings):
                c.embedding = emb

                # Approximate token count used for diagnostics / limits / UI
                c.token_count = self._count_tokens(c.text)
        # 5. Extract skills from the full profile text
        skills: list[dict] = []
        if self.skill_extractor_service and self.skill_extractor_service.is_loaded:
            raw_skills = self.skill_extractor_service.extract_skills(text)

            # Attach a source label (future extension: per-section skills)
            skills = [
                {"skill": s, "source": "throughout"}
                for s in raw_skills
            ]

        # 6. Generate feedback and completeness score
        feedback, completeness = self._generate_feedback(text, chunks, skills)

        # 7. Serialize output into JSON-safe structures
        return {
            "chunks": [
                {
                    "type": c.type,
                    "text": c.text,
                    "embedding": c.embedding,
                    "token_count": c.token_count,
                }
                for c in chunks
            ],
            "skills": skills,
            "feedback": feedback,
            "completeness_score": completeness,
        }

    # =========================================================================
    # Experience extraction (multi‑signal)
    # =========================================================================
    def _extract_experience(self, text: str) -> str:
        """
        Extract experience content using multiple complementary signals.

        Signals (priority order):
        1. Date‑range blocks → structured CV sections
        2. Job title blocks → role‑based detection
        3. Action verb sentences → bullet achievements
        4. Narrative fallback → free‑form company mentions

        @param text:
        Full profile text

        @returns:
        Concatenated experience text or empty string if nothing detected
        """
        extracted: list[str] = []

        # Signal 1: Date-range blocks (best for classic CV format)
        date_blocks = self._extract_by_dates(text)
        extracted.extend(date_blocks[:5])

        #Signal 3: Job title blocks
        title_blocks = self._extract_by_job_titles(text)
        for block in title_blocks[:3]:
            if block not in extracted:
                extracted.append(block)

        # Signal 3: Action verb sentences (achievement bellets)
        action_sentences = self._extract_action_sentences(text)
        for sentence in action_sentences[:5]:
            # Avoid duplicating content already captured in blocks
            if not any (sentence in part for part in extracted):
                extracted.append(sentence)

        # Signal 4: Narrative fallback (if nothing structured was found)
        if not extracted:
            narrative = self._extract_narrative(text)
            extracted.extend(narrative[:3])

        # Separate blocks with spacing for readability and embedding clarity
        return '\n\n'.join(extracted) if extracted else ''

    @staticmethod
    def _extract_by_dates(text: str) -> list[str]:
        """
        Extract experience blocks based on date range detection.

        Strategy:
        - Split text into lines
        - When a line contains a date range, start a new block
        - Accumulate subsequent non‑empty lines as part of the same job
        - Stop at blank lines or next date range

        @returns:
        List of experience blocks grouped by date ranges
        """
        lines = text.split("\n")
        blocks: list[str] = []
        current: list[str] = []

        for line in lines:
            if re.search(DATE_RANGE, line, re.IGNORECASE):
                if current:
                    blocks.append('\n'.join(current))
                current = [line]
            elif current:
                if line.strip():
                    current.append(line)
                elif len(current) > 1:
                    blocks.append('\n'.join(current))
                    current = []
        if current:
            blocks.append('\n'.join(current))

        return blocks

    @staticmethod
    def _extract_by_job_titles(text: str) -> list[str]:
        """
        Extract job title lines and their immediate context.

        Strategy:
        - Scan line by line
        - When a line matches a job title pattern
        - Capture the next few non‑empty lines as context

        @returns:
        List of job‑title‑centered experience blocks
        """
        lines = text.split("\n")
        blocks: list[str] = []

        for index, line in enumerate(lines):
            if re.search(JOB_TITLE, line, re.IGNORECASE):
                block_lines = [line]

                # Capture up to 3 following context lines
                for j in range(index + 1, min(index + 7, len(lines))):
                    next_line = lines[j].strip()
                    if next_line:
                        # Stop if another job title starts
                        if re.search(JOB_TITLE, next_line, re.IGNORECASE):
                            break
                        block_lines.append(next_line)
                    else:
                        break

                blocks.append('\n'.join(block_lines))

        return blocks

    @staticmethod
    def _extract_action_sentences(text: str) -> list[str]:
        """
        Extract sentences starting with strong action verbs.

        Used to capture bullet‑style achievements and responsibilities.

        @returns:
        List of cleaned action‑oriented sentences
        """
        matches: list[str] = []

        for matsh in re.finditer(ACTION_SENTENCE, text, re.IGNORECASE | re.MULTILINE):
            # Remove bullet characters if present
            sentence = re.sub(r'^[•\-*▪◦→]\s*', '', matsh.group(0).strip())

            # Ignore very short or trivial fragments
            if len(sentence) > 20:
                matches.append(sentence)

        return matches

    @staticmethod
    def _extract_narrative(text: str) -> list[str]:
        """
        Extract narrative‑style experience mentions.

        Strategy:
        - Split text into sentences
        - Keep sentences that mention companies or "at <company>" patterns

        @returns:
        List of narrative experience sentences
        """
        matches: list[str] = []
        sentences = re.split(r'[.!?]+', text)

        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) > 20:
                if re.match(NARRATIVE_COMPANY, sentence, re.IGNORECASE):
                    matches.append(sentence)
                elif re.search(AT_COMPANY, sentence, re.IGNORECASE):
                    matches.append(sentence)

        return matches

    # =========================================================================
    # Education extraction
    # =========================================================================
    @staticmethod
    def _extract_education(text: str) -> str:
        """
        Extract education‑related content using predefined patterns.

        @returns:
        Compact string with up to 5 detected education mentions
        """
        matches: list[str] = []

        for pattern in EDUCATION:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                matched = match.group(0).strip()
                if matched and matched not in matches:
                    matches.append(matched)
        # Join multiple education items into a short summary
        return ' | '.join(matches[:5]) if matches else ''

    # =========================================================================
    # Feedback & scoring
    # =========================================================================

    @staticmethod
    def _generate_feedback(
        text: str,
        chunks: list[ProfileChunk],
        skills: list[dict],
    ) -> tuple[list[str], float]:
        """
        Generate qualitative feedback and a completeness score for the profile.

        Scoring dimensions:
        - Skill variety
        - Presence of experience section
        - Use of action verbs
        - Presence of education section
        - Quantified achievements
        - Overall length / level of detail

        @returns:
        Tuple:
        - feedback: list of messages
        - completeness_score: float in [0, 1]
        """
        feedback: list[str] = []
        score: float = 0.0

        # --- Skill coverage ---

        if len(skills) >= 5:
            feedback.append("✅ Good variety of skills detected")
            score += 0.25
        elif len(skills) >= 2:
            feedback.append("⚠️ Consider adding more skills")
            score += 0.15
        else:
            feedback.append("❌ Few skills detected - add technical and soft skills")
            score += 0.05

        # --- Experience presence ---
        if any(c.type == "experience" for c in chunks):
            feedback.append("✅ Work experience well documented")
            score += 0.25
        else:
            feedback.append("⚠️ Add work experience with dates")
            score += 0.05

        # --- Action verbs ---
        if re.search(ACTION_VERBS, text, re.IGNORECASE):
            feedback.append("✅ Uses strong action verbs")
            score += 0.05
        else:
            feedback.append("⚠️ Use action verbs (led, built, managed)")

        # --- Education ---
        if any(c.type == "education" for c in chunks):
            feedback.append("✅ Education background included")
            score += 0.15
        else:
            feedback.append("⚠️ Consider adding education")
            score += 0.05

        # --- Metrics / achievements ---
        if re.search(METRICS, text, re.IGNORECASE):
            feedback.append("✅ Includes quantified achievements")
            score += 0.15
        else:
            feedback.append("⚠️ Add metrics (e.g., 'increased sales by 30%')")

        # --- Length / detail ---
        word_count = len(text.split())

        if word_count >= 200:
            feedback.append("✅ Good level of detail")
            score += 0.15
        elif word_count >= 100:
            feedback.append("⚠️ Could use more detail")
            score += 0.10
        else:
            feedback.append("❌ Too short - aim for 200+ words")
            score += 0.05

        # Cap score to maximum 1.0
        return feedback, min(score, 1.0)

    # =========================================================================
    # Utilities
    # =========================================================================
    @staticmethod
    def _truncate_text(text: str, max_chars: int = 2000) -> str:
        """
        Safely truncate long profile text without cutting words in the middle.
        """
        text = text.strip()
        if len(text) <= max_chars:
            return text
        return text[:max_chars].rsplit(" ", 1)[0] + "..."

    @staticmethod
    def _count_tokens(text: str) -> int:
        """
        Approximate token count from word count.

        Used for diagnostics and size estimation (not exact tokenizer output).
        """
        return int(len(text.split()) * 1.3)