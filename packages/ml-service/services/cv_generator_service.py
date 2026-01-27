"""
CV Generator Service

Generates tailored CVs using Anthropic Claude API.
Combines structured skill analysis with raw text for context.
"""

import anthropic
from config.settings import get_settings
from .cv_gen_prompt_template import PROMPT_TEMPLATE

class CVGeneratorService:
    def __init__(self):
        settings = get_settings()
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = settings.cv_model_name

    def generate_cv(
        self,
        job_title: str,
        job_company: str,
        job_location: str,
        job_description: str,
        profile_text: str,
        matching_skills: list[str],
        missing_skills: list[str],
        mandatory_skills: list[str],
        preferred_skills: list[str],
        match_rate: dict
    ) -> str:
        """
        Generate a tailored CV using Claude.

        Returns:
            Generated CV in Markdown format
        """
        prompt = PROMPT_TEMPLATE.format(
            title=job_title,
            company=job_company,
            location=job_location or "Not specified",
            mandatory_skills=", ".join(mandatory_skills) if mandatory_skills else "Not specified",
            preferred_skills=", ".join(preferred_skills) if preferred_skills else "Not specified",
            matching_skills=", ".join(matching_skills) if matching_skills else "Not identified",
            missing_skills=", ".join(missing_skills) if missing_skills else "None",
            match_rate=f"{match_rate.get('mandatory', '0/0')} required skills",
            job_description=job_description,
            profile_text=profile_text,
        )

        message = self.client.messages.create(
            model=self.model,
            max_tokens=1500,
            temperature=0.7,
            messages=[
                {"role": "user", "content": prompt },
            ]
        )

        return message.content[0].text