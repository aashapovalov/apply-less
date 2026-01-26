"""
Skill Extractor Service

Extracts technical and professional skills from free-form text using
feliponi/hirly-ner-multi NER model.
"""
import re
import time
from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification

from transformers.pipelines import TokenClassificationPipeline
from typing import Optional, TypedDict

from config import get_settings
from services.skill_patterns import extract_skills_by_keywords


class SkillWithLevel(TypedDict):
    skill: str
    level: str


class SkillExtractorService:
    """
    Skill extraction using feliponi/hirly-ner-multi.

    Extracts:
    - SKILL: Technical skills
    - SOFT_SKILL: Soft skills
    - LANG: Languages
    - CERT: Certifications
    - EXPERIENCE_DURATION: Years of experience
    """

    def __init__(self) -> None:
        """
        Initialize the SkillExtractorService.

        The model is NOT loaded during initialization.
        """
        self.model: Optional[TokenClassificationPipeline] = None
        self.model_name = ""
        self._load_time: float = 0

    def load_model(self) -> None:
        """
        Load tokenizer and model weights using application settings and initialize
        the NER inference pipeline.

        This method:
        1. Downloads model/tokenizer if not cached
        2. Initializes the HuggingFace NER pipeline with entity aggregation
        3. Measures and stores model load time
        4. Marks the extractor as ready for inference

        The model is cached locally in SKILLS_EXTRACTION_MODEL_CACHE_DIR (default:
        ./model_cache) so subsequent loads are much faster (no download needed).

        @raises RuntimeError:
            If model or tokenizer loading fails
        """
        settings = get_settings()

        print(f"📥 Loading skill extraction model: {settings.skills_extraction_model_name}")
        start = time.time()

        tokenizer = AutoTokenizer.from_pretrained(
            settings.skills_extraction_model_name,
            cache_dir=settings.skills_extraction_model_cache_dir,
        )
        model = AutoModelForTokenClassification.from_pretrained(
            settings.skills_extraction_model_name,
            cache_dir=settings.skills_extraction_model_cache_dir,
        )

        # Create NER inference pipeline with entity aggregation enabled
        # "simple" aggregation merges subword tokens into full skill entities
        self.model = pipeline(
            "ner",
            model=model,
            tokenizer=tokenizer,
            aggregation_strategy="simple",
        )

        self._load_time = time.time() - start
        self.model_name = settings.skills_extraction_model_name

        print(f"✅ Skill model loaded in {self._load_time:.2f}s")

    def extract_skills(self, text: str) -> list[str]:
        """
        Extract a unique, normalized list of skills from the input text.

        @param text:
            Free-form input text (e.g. job description, resume)

        @returns:
            Sorted list of detected skill names

        @raises RuntimeError:
            If the model has not been loaded yet
        """
        if self.model is None:
            raise RuntimeError("Model is not loaded. Call load_model() first.")

        if not text or not text.strip():
            return []

        entities = self.model(text)
        skills: set[str] = set()

        # 1. NER model extraction
        for entity in entities:
            if entity.get("entity_group") in ("SKILL", "SOFT_SKILL") and entity.get("score", 0) > 0.5:
                skill = self._clean_skill(entity["word"].strip())
                if skill and len(skill) > 1:
                    skills.add(skill)

        # 2. Keyword fallback
        keyword_skills = extract_skills_by_keywords(text)
        skills.update(keyword_skills)

        return sorted(skills, key=str.lower)

    def extract_skills_with_context(
        self,
        text: str,
        mandatory_patterns: list[str] | None = None,
        preferred_patterns: list[str] | None = None,
    ) -> list[SkillWithLevel]:
        """
        Extract skills and classify each one as mandatory / preferred / unknown
        based on the line/sentence containing the skill.

        @param text:
            Free-form input text (typically a job description)

        @param mandatory_patterns:
            Regex patterns indicating mandatory requirements.

        @param preferred_patterns:
            Regex patterns indicating preferred / optional requirements.

        @returns:
            List of dicts: [{"skill": "Python", "level": "mandatory"}, ...]

        @raises RuntimeError:
            If the model has not been loaded yet
        """
        if self.model is None:
            raise RuntimeError("Model is not loaded. Call load_model() first.")

        if not text or not text.strip():
            return []

        if mandatory_patterns is None:
            mandatory_patterns = [
                r"requirements?", r"must\s+have", r"required",
                r"mandatory", r"essential", r"qualifications?",
            ]

        if preferred_patterns is None:
            preferred_patterns = [
                r"nice\s+to\s+have", r"preferred", r"bonus",
                r"ideally", r"plus", r"advantage"
            ]

        entities = self.model(text)
        skills_with_level: list[SkillWithLevel] = []
        seen_skills: set[str] = set()

        # 1. Extract skills from NER model
        for entity in entities:
            if entity.get("entity_group") not in ("SKILL", "SOFT_SKILL") or entity.get("score", 0) <= 0.5:
                continue

            skill = self._clean_skill(entity["word"].strip())

            if not skill or len(skill) <= 1 or skill.lower() in seen_skills:
                continue

            seen_skills.add(skill.lower())

            # Get the line/sentence containing this skill
            skill_context = self._get_skill_context(text, entity["start"], entity["end"])

            level = self._determine_skill_level(
                skill_context,
                mandatory_patterns,
                preferred_patterns,
            )

            skills_with_level.append({
                "skill": skill,
                "level": level,
            })

        # 2. Supplement with keyword fallback (catches skills NER missed)
        keyword_skills = extract_skills_by_keywords(text)
        
        for skill in keyword_skills:
            if skill.lower() in seen_skills:
                continue
            
            seen_skills.add(skill.lower())
            
            # Find skill position in text for context
            match = re.search(re.escape(skill), text, re.IGNORECASE)
            if match:
                skill_context = self._get_skill_context(text, match.start(), match.end())
            else:
                skill_context = text.lower()
            
            level = self._determine_skill_level(
                skill_context,
                mandatory_patterns,
                preferred_patterns,
            )
            
            skills_with_level.append({
                "skill": skill,
                "level": level,
            })

        return skills_with_level

    @staticmethod
    def _get_skill_context(text: str, start: int, end: int) -> str:
        """
        Get the logical context containing a skill (sentence, line, or bracketed section).

        Priority:
        1. If skill is inside brackets/parentheses, return that section
        2. Return the sentence containing the skill (split by . ! ?)
        3. Fallback to line if no sentence boundaries found

        @param text: Full text
        @param start: Skill start position
        @param end: Skill end position

        @returns: Context string (lowercased)
        """
        # Check if we're inside brackets or parentheses first
        bracket_pairs = [('(', ')'), ('[', ']'), ('{', '}')]
        
        for open_b, close_b in bracket_pairs:
            open_pos = text.rfind(open_b, 0, start)
            close_pos = text.find(close_b, end)
            
            if open_pos != -1 and close_pos != -1:
                # Verify no closing bracket between open and skill
                if text.find(close_b, open_pos, start) == -1:
                    return text[open_pos:close_pos + 1].lower()

        # Find sentence boundaries (. ! ? or double newline)
        sentence_markers = ['. ', '! ', '? ', '.\n', '!\n', '?\n', '\n\n']
        
        # Find sentence start - look for marker before skill
        sentence_start = 0
        for marker in sentence_markers:
            pos = text.rfind(marker, 0, start)
            if pos != -1:
                sentence_start = max(sentence_start, pos + len(marker))
        
        # Find sentence end - look for marker after skill
        sentence_end = len(text)
        for marker in sentence_markers:
            pos = text.find(marker, end)
            if pos != -1:
                sentence_end = min(sentence_end, pos + 1)  # Include the period
        
        sentence = text[sentence_start:sentence_end].strip()
        
        # If we found a reasonable sentence, return it
        if sentence:
            return sentence.lower()
        
        # Fallback: return line
        line_start = text.rfind('\n', 0, start) + 1
        line_end = text.find('\n', end)
        if line_end == -1:
            line_end = len(text)
        
        return text[line_start:line_end].lower()

    @staticmethod
    def _determine_skill_level(
        context: str,
        mandatory_patterns: list[str],
        preferred_patterns: list[str],
    ) -> str:
        """
        Determine requirement level based on context.

        @param context: Sentence containing the skill (lowercased)
        @param mandatory_patterns: Patterns indicating required skills
        @param preferred_patterns: Patterns indicating nice-to-have skills

        @returns: "mandatory", "preferred", or "unknown"
        """
        # Check mandatory first (more definitive)
        for pattern in mandatory_patterns:
            if re.search(pattern, context, re.IGNORECASE):
                return "mandatory"

        for pattern in preferred_patterns:
            if re.search(pattern, context, re.IGNORECASE):
                return "preferred"

        return "unknown"

    @staticmethod
    def _clean_skill(skill: str) -> str:
        """
        Normalize raw skill tokens from NER model.

        @param skill: Raw token from NER output
        @returns: Cleaned skill string
        """
        skill = re.sub(r'^[\s\-.,;:]+|[\s\-.,;:]+$', '', skill)
        skill = skill.replace("##", "")
        skill = " ".join(skill.split())
        return skill

    @property
    def is_loaded(self) -> bool:
        """Check if model is loaded."""
        return self.model is not None

    @property
    def info(self) -> dict:
        """Get model info."""
        return {
            "model_name": self.model_name,
            "is_loaded": self.is_loaded,
            "load_time_seconds": round(self._load_time, 2),
        }
