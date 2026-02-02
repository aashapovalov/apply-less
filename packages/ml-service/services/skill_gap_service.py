"""
Skill Gap Analysis Service

Compares job requirements with candidate skills to identify
matches, gaps, and calculate match rates.
"""

def analyze_skill_gap(job_skills: list, profile_skills: list) -> dict:
    """
        Compare job requirements with candidate skills.

        Args:
            job_skills: [{"skill": "Python", "level": "mandatory"}, ...]
            profile_skills: [{"skill": "Python"}, ...]

        Returns:
            {
                "matching_skills": [...],
                "missing_skills": [...],
                "match_rate": {"mandatory": "4/6", "preferred": "1/3"}
            }
        """
    # Normalize profile skills to lowercase set for comparison
    profile_skill_names = {skill["skill"].lower() for skill in profile_skills}

    # Separate job skills by level
    mandatory = [skill["skill"] for skill in job_skills if skill.get("level") == "mandatory"]
    preferred = [skill["skill"] for skill in job_skills if skill.get("level") == "preferred"]

    # Find matches and gaps
    matching_mandatory = [skill for skill in mandatory if skill.lower() in profile_skill_names]
    matching_preferred = [skill for skill in preferred if skill.lower() in profile_skill_names]
    missing_mandatory = [skill for skill in mandatory if skill.lower() not in profile_skill_names]

    # Deduplicate matching skills
    all_matching = list(dict.fromkeys(matching_mandatory + matching_preferred))

    return {
        "matching_skills": all_matching,
        "missing_skills": missing_mandatory,
        "preferred_skills_matched": matching_preferred,
        "match_rate": {
            "mandatory": f"{len(matching_mandatory)}/{len(mandatory)}" if mandatory else "0/0",
            "preferred": f"{len(matching_preferred)}/{len(preferred)}" if preferred else "0/0"
        }
    }