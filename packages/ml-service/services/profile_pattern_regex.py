"""
Profile Parsing Patterns

Regex patterns for extracting structured information from resumes/CVs.
Separated from business logic for easier maintenance and testing.
"""

# =============================================================================
# Date Patterns
# =============================================================================

# Month names (full and abbreviated)
MONTHS = (
    r"(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
    r"jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
)

# Single date: "Jan 2023", "2023", "01/2023", "2023/01", "03.2023"
DATE_SINGLE = rf"(?:{MONTHS}\.?\s*)?(?:\d{{1,2}}[\./])?\d{{4}}(?:[\./]\d{{1,2}})?"

# End date: date or "present", "current", "now", "ongoing"
DATE_END = rf"(?:{DATE_SINGLE}|present|current|now|ongoing|today)"

# Full date range: "Jan 2023 - Present", "2020 - 2022", "03/2023 ~ current"
DATE_RANGE = rf"{DATE_SINGLE}\s*[-–—~]|\s*(?:to|until)\s*{DATE_END}"


# =============================================================================
# Job Title Patterns
# =============================================================================

# Seniority levels / prefixes
SENIORITY_LEVELS = (
    r"(?:intern|junior|jr\.?|mid(?:-?level)?|senior|sr\.?|staff|principal|"
    r"lead|head|director|vp|vice\s*president|chief|c-level|"
    r"associate|assistant|executive|founding|co-?)"
)

# Common job roles
JOB_ROLES = (
    r"(?:engineer|developer|programmer|architect|scientist|analyst|"
    r"manager|director|lead|head|chief|officer|president|"
    r"designer|researcher|consultant|specialist|coordinator|"
    r"administrator|executive|founder|co-?founder|owner|"
    r"product\s*manager|project\s*manager|program\s*manager|"
    r"software\s*engineer|data\s*scientist|data\s*engineer|"
    r"devops|sre|qa|test|frontend|backend|fullstack|full-?stack|"
    r"mobile|ios|android|web|cloud|platform|infrastructure|"
    r"machine\s*learning|ml|ai|nlp|cv|computer\s*vision|"
    r"marketing|sales|hr|human\s*resources|finance|operations|"
    r"cto|ceo|coo|cfo|cmo|cpo|vp\s*of)"
)

# Combined job title pattern
JOB_TITLE = rf"(?:{SENIORITY_LEVELS}\s*)?{JOB_ROLES}"


# =============================================================================
# Action Verbs (for achievements / bullet points)
# =============================================================================

ACTION_VERBS = (
    # Leadership
    r"(?:led|lead|managed|mentored|coached|trained|hired|recruited|supervised|"
    # Building / Creating
    r"built|developed|created|designed|implemented|architected|engineered|"
    r"programmed|coded|automated|configured|integrated|"
    # Launching / Delivering
    r"launched|delivered|shipped|deployed|released|published|"
    # Impact / Improvement
    r"improved|increased|decreased|reduced|saved|optimized|scaled|"
    r"grew|expanded|accelerated|transformed|modernized|streamlined|"
    # Initiative
    r"founded|co-?founded|established|started|initiated|pioneered|"
    r"spearheaded|introduced|drove|owned|"
    # Collaboration
    r"collaborated|partnered|coordinated|facilitated|liaised|"
    # Analysis / Research
    r"analyzed|researched|evaluated|assessed|measured|investigated|"
    # Communication
    r"presented|communicated|reported|documented|authored|wrote|"
    # Business
    r"negotiated|secured|closed|won|achieved|exceeded|generated|acquired)"
)

# Action verb sentence pattern (bullet points)
ACTION_SENTENCE = rf"(?:^|\n|[•\-\*▪◦→])\s*{ACTION_VERBS}\s+.{{10,200}}"


# =============================================================================
# Company Context Patterns
# =============================================================================

# "at Company" or "@ Company"
AT_COMPANY = r"(?:at|@|for)\s+[\w][\w\s\-\.&,]{2,40}(?:\s*(?:,|\(|\|)|\s*$)"

# "Company Name |" or "Company Name," (delimiter style)
COMPANY_DELIMITER = r"^[\w][\w\s\-\.&]{2,40}(?:\s*[\|,\-–]\s*)(?=\w)"

# Narrative: "worked at X", "joined Y"
NARRATIVE_COMPANY = (
    r"(?:worked?\s+(?:at|for)|joined|employed\s+(?:at|by)|"
    r"started\s+(?:at|working)|left|quit|resigned\s+from)\s+"
    r"[\w][\w\s\-\.&]{2,40}"
)


# =============================================================================
# Education Patterns
# =============================================================================

EDUCATION = [
    # Degree abbreviations and full names
    (
        r"(?:b\.?s\.?c?|m\.?s\.?c?|ph\.?d\.?|b\.?a\.?|m\.?a\.?|m\.?b\.?a\.?|"
        r"ll\.?b|ll\.?m|b\.?eng|m\.?eng|"
        r"bachelor(?:'?s)?|master(?:'?s)?|doctorate|diploma|certificate)"
        r"\s+.{5,150}"
    ),

    # University/college mentions
    (
        r"(?:university|college|institute|school|academy|technion|"
        r"mit|stanford|harvard|berkeley|oxford|cambridge|yale|princeton)"
        r"\s*(?:of\s+)?[\w\s]{3,50}"
    ),

    # "Studied X at Y" pattern
    r"(?:studied|graduated|majored|degree)\s+(?:in\s+)?[\w\s]{3,100}",

    # Graduation year
    r"(?:class\s+of|graduated\s+in?|graduation)\s*:?\s*\d{4}",

    # Field of study
    (
        r"(?:computer\s*science|software\s*engineering|electrical\s*engineering|"
        r"information\s*(?:technology|systems)|data\s*science|"
        r"mathematics|physics|chemistry|biology|economics|business|"
        r"mba|law|medicine|psychology|linguistics)"
        r"\s*(?:degree|student|graduate|major)?"
    ),
]


# =============================================================================
# Metrics / Achievements Patterns
# =============================================================================

METRICS = (
    r"\d+%|"                                    # Percentages: 30%
    r"\d+x|"                                    # Multipliers: 3x
    r"\$[\d,]+(?:\s*[kmb])?|"                   # Dollar amounts: $50K, $1.2M
    r"[\d,]+\s*(?:users?|customers?|clients?|"  # User counts
    r"projects?|deliveries|orders?|"            # Deliverables
    r"requests?|transactions?|"                 # Volume
    r"employees?|team\s*members?|reports?)|"    # Team size
    r"(?:increased|improved|reduced|saved|grew|"# Impact verbs with numbers
    r"generated|achieved|exceeded)\s+.*?\d+"
)