"""
Skill Extractor Service

Extracts technical and professional skills from free-form text using the
`jjzha/jobbert_skill_extraction` NER model.
"""
import re
import time
from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification

from transformers.pipelines import TokenClassificationPipeline
from typing import Optional, TypedDict

from config import get_settings

class SkillWithLevel(TypedDict):
    skill: str
    level: str

class SkillExtractorService:
    """
    Skill extraction service powered by JobBERT NER model.

    Responsibilities:
    - Load and initialize the skill NER model
    - Extract normalized skill names from text
    - Optionally classify skills as mandatory / preferred based on context
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

        print(f"📥 Loading skill extraction model: { settings.skills_extraction_model_name }")
        start = time.time()

        # Load model and tokenizer using AutoModelForTokenClassification and AutoTokenizer
        # - cache-folder: where to store  downloaded files
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

        Behavior:
        - Runs NER inference on full text
        - Filters entities by: entity_group == "SKILL", confidence score > 0.5
        - Cleans and normalizes skill strings
        - Removes duplicates
        - Returns alphabetically sorted list

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

        # Run NER model
        entities = self.model(text)

        skills: set[str] = set()

        for entity in entities:
            # Keep only confident SKILL entities
            if entity.get("entity_group") == "SKILL" and entity.get("score", 0) > 0.5:
                skill = self._clean_skill(entity["word"].strip())

                # Ignore very short / malformed tokens
                if skill and len(skill) > 1:
                    skills.add(skill)

        # return sorted, stable output
        return sorted(skills, key=str.lower)

    def extract_skills_with_context(
        self,
        text: str,
        mandatory_patterns: list[str] | None = None,
        preferred_patterns: list[str] | None = None,
    ) -> list[SkillWithLevel]:
        """
        Extract skills and classify each one as mandatory / preferred / unknown
        based on surrounding textual context.

        Logic:
        - Extract SKILL entities via NER
        - For each skill:
            - Inspect ±150 characters around the entity
            - Match context against mandatory / preferred regex patterns
            - Assign level accordingly

        @param text:
            Free-form input text (typically a job description)

        @param mandatory_patterns:
            Regex patterns indicating mandatory requirements.
            Defaults to common job-posting phrases.

        @param preferred_patterns:
            Regex patterns indicating preferred / optional requirements.

        @returns:
            List of dictionaries:
            [
                { "skill": "Python", "level": "mandatory" },
                { "skill": "Docker", "level": "preferred" },
                ...
            ]

        @raises RuntimeError:
            If the model has not been loaded yet
        """
        if self.model is None:
            raise RuntimeError("Model is not loaded. Call load_model() first.")

        if not text or not text.strip():
            return []

        # Default regex patterns for requirement classification
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

        # Run NER model

        entities = self.model(text)
        skills_with_level: list[SkillWithLevel] = []
        seen_skills: set[str] = set()

        for entity in entities:
            # Filter low-confidence or non-skill entities
            if entity.get("entity_group") != "SKILL" or entity.get("score", 0) <= 0.5:
                continue

            skill = self._clean_skill(entity["word"].strip())

            # Skip duplicates and invalid tokens
            if (
                not skill
                or len(skill) <= 1
                or skill.lower() in seen_skills
            ):
                continue

            seen_skills.add(skill.lower())

            # Extract surrounding context window for classification
            start = max(0, entity["start"] - 150)
            end = min(len(text), entity["end"] + 150)
            context = text[start:end].lower()

            level = self._determine_skill_level(
                context,
                mandatory_patterns,
                preferred_patterns,
            )

            skills_with_level.append({
                "skill": skill,
                "level": level,
            })
        return skills_with_level

    @staticmethod
    def _clean_skill(skill: str) -> str:
        """
        Normalize raw skill tokens returned by the NER model.

        Operations:
        - Trim punctuation and separators from edges
        - Remove WordPiece continuation markers ("##")
        - Collapse repeated whitespace

        @param skill:
            Raw token extracted from the NER output

        @returns:
            Cleaned, human-readable skill string
        """
        # Remove punctuation at beginning/end
        skill = re.sub(r'^[\s\-.,;:]+|[\s\-.,;:]+$', '', skill)

        # Remove subword markers used by BERT tokenization
        skill = skill.replace("##", "")

        # Normalize whitespace
        skill = " ".join(skill.split())

        return skill

    @staticmethod
    def _determine_skill_level(
            context: str,
            mandatory_patterns: list[str],
            preferred_patterns: list[str],
    ) -> str:
        """
        Determine requirement level of a skill based on nearby text context.

        Priority:
        1. Preferred patterns
        2. Mandatory patterns
        3. Unknown (fallback)

        @param context:
            Lower-cased text window surrounding the skill mention

        @param mandatory_patterns:
            Regex patterns indicating mandatory requirement

        @param preferred_patterns:
            Regex patterns indicating preferred / optional requirement

        @returns:
            One of: "mandatory", "preferred", "unknown"
        """
        for pattern in preferred_patterns:
            if re.search(pattern, context, re.IGNORECASE):
                return "preferred"

        for pattern in mandatory_patterns:
            if re.search(pattern, context, re.IGNORECASE):
                return "mandatory"

        return "unknown"

    @property
    def is_loaded(self) -> bool:
        """
        Indicates whether the NER model has been loaded and is ready for inference.

        @returns:
            True if model is initialized, False otherwise
        """
        return self.model is not None