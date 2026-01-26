"""
Skill Patterns - Keyword Fallback

Common technical skills that NER models may miss.
Used as a fallback/supplement to model-based extraction.
"""
import re

# =============================================================================
# Skill Patterns by Category
# =============================================================================

PROGRAMMING_LANGUAGES = [
    r"\bPython\b",
    r"\bJava\b",
    r"\bJavaScript\b",
    r"\bTypeScript\b",
    r"\bGo\b(?:lang)?",
    r"\bRust\b",
    r"\bC\+\+\b",
    r"\bC#\b",
    r"\bRuby\b",
    r"\bPHP\b",
    r"\bSwift\b",
    r"\bKotlin\b",
    r"\bScala\b",
    r"\bPerl\b",
    r"\bR\b(?=\s|,|$)",  # R language (careful with single letter)
    r"\bLua\b",
    r"\bHaskell\b",
    r"\bElixir\b",
    r"\bErlang\b",
    r"\bClojure\b",
    r"\bF#\b",
    r"\bDart\b",
    r"\bSQL\b",
]

CLOUD_DEVOPS = [
    r"\bAWS\b",
    r"\bAmazon Web Services\b",
    r"\bGCP\b",
    r"\bGoogle Cloud\b",
    r"\bAzure\b",
    r"\bDocker\b",
    r"\bKubernetes\b",
    r"\bK8s\b",
    r"\bTerraform\b",
    r"\bAnsible\b",
    r"\bJenkins\b",
    r"\bCircleCI\b",
    r"\bGitHub Actions\b",
    r"\bGitLab CI\b",
    r"\bArgoCD\b",
    r"\bHelm\b",
    r"\bPrometheus\b",
    r"\bGrafana\b",
    r"\bDatadog\b",
    r"\bNew Relic\b",
    r"\bCloudFormation\b",
    r"\bPulumi\b",
]

FRONTEND = [
    r"\bReact\b",
    r"\bReact\.js\b",
    r"\bAngular\b",
    r"\bVue\b",
    r"\bVue\.js\b",
    r"\bSvelte\b",
    r"\bNext\.js\b",
    r"\bNuxt\b",
    r"\bGatsby\b",
    r"\bHTML5?\b",
    r"\bCSS3?\b",
    r"\bSASS\b",
    r"\bSCSS\b",
    r"\bTailwind\b",
    r"\bBootstrap\b",
    r"\bMaterial UI\b",
    r"\bRedux\b",
    r"\bMobX\b",
    r"\bWebpack\b",
    r"\bVite\b",
]

BACKEND = [
    r"\bNode\.?js\b",
    r"\bExpress\b",
    r"\bNestJS\b",
    r"\bDjango\b",
    r"\bFlask\b",
    r"\bFastAPI\b",
    r"\bSpring\b",
    r"\bSpring Boot\b",
    r"\bRails\b",
    r"\bRuby on Rails\b",
    r"\bLaravel\b",
    r"\bASP\.NET\b",
    r"\bGin\b",
    r"\bEcho\b",
    r"\bFiber\b",
    r"\bKoa\b",
]

DATABASES = [
    r"\bPostgreSQL\b",
    r"\bPostgres\b",
    r"\bMySQL\b",
    r"\bMariaDB\b",
    r"\bMongoDB\b",
    r"\bRedis\b",
    r"\bElasticsearch\b",
    r"\bDynamoDB\b",
    r"\bCassandra\b",
    r"\bSQLite\b",
    r"\bOracle\b",
    r"\bSQL Server\b",
    r"\bNeo4j\b",
    r"\bInfluxDB\b",
    r"\bTimescaleDB\b",
    r"\bCockroachDB\b",
    r"\bFirebase\b",
    r"\bSupabase\b",
]

DATA_ML = [
    r"\bMachine Learning\b",
    r"\bML\b",
    r"\bAI\b",
    r"\bArtificial Intelligence\b",
    r"\bNLP\b",
    r"\bNatural Language Processing\b",
    r"\bComputer Vision\b",
    r"\bDeep Learning\b",
    r"\bTensorFlow\b",
    r"\bPyTorch\b",
    r"\bKeras\b",
    r"\bscikit-learn\b",
    r"\bPandas\b",
    r"\bNumPy\b",
    r"\bSpark\b",
    r"\bHadoop\b",
    r"\bAirflow\b",
    r"\bDBT\b",
    r"\bSnowflake\b",
    r"\bBigQuery\b",
    r"\bDatabricks\b",
    r"\bMLflow\b",
    r"\bKubeflow\b",
]

TOOLS_PROTOCOLS = [
    r"\bGit\b",
    r"\bGitHub\b",
    r"\bGitLab\b",
    r"\bBitbucket\b",
    r"\bLinux\b",
    r"\bUnix\b",
    r"\bBash\b",
    r"\bShell\b",
    r"\bREST\b",
    r"\bRESTful\b",
    r"\bGraphQL\b",
    r"\bgRPC\b",
    r"\bWebSocket\b",
    r"\bKafka\b",
    r"\bRabbitMQ\b",
    r"\bCelery\b",
    r"\bSQS\b",
    r"\bSNS\b",
    r"\bNginx\b",
    r"\bApache\b",
]

MOBILE = [
    r"\biOS\b",
    r"\bAndroid\b",
    r"\bReact Native\b",
    r"\bFlutter\b",
    r"\bSwiftUI\b",
    r"\bJetpack Compose\b",
    r"\bXamarin\b",
    r"\bCordova\b",
    r"\bIonic\b",
]

TESTING = [
    r"\bJest\b",
    r"\bMocha\b",
    r"\bPytest\b",
    r"\bJUnit\b",
    r"\bCypress\b",
    r"\bSelenium\b",
    r"\bPlaywright\b",
    r"\bTestNG\b",
    r"\bRSpec\b",
    r"\bPostman\b",
]

OTHER = [
    r"\bAgile\b",
    r"\bScrum\b",
    r"\bKanban\b",
    r"\bJira\b",
    r"\bConfluence\b",
    r"\bFigma\b",
    r"\bSketch\b",
    r"\bCI/CD\b",
    r"\bMicroservices\b",
    r"\bServerless\b",
    r"\bOAuth\b",
    r"\bJWT\b",
    r"\bSAML\b",
    r"\bSSO\b",
    r"\bOpenAPI\b",
    r"\bSwagger\b",
]

# Combined list of all patterns
ALL_SKILL_PATTERNS = (
    PROGRAMMING_LANGUAGES +
    CLOUD_DEVOPS +
    FRONTEND +
    BACKEND +
    DATABASES +
    DATA_ML +
    TOOLS_PROTOCOLS +
    MOBILE +
    TESTING +
    OTHER
)


def extract_skills_by_keywords(text: str) -> set[str]:
    """
    Extract skills from text using keyword patterns.
    
    This is a fallback for skills that NER models may miss.
    
    @param text: Input text to search
    @returns: Set of matched skill names
    """
    skills: set[str] = set()
    
    for pattern in ALL_SKILL_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            skill = match.group(0)
            # Normalize common variations
            skill = _normalize_skill(skill)
            skills.add(skill)
    
    return skills


def _normalize_skill(skill: str) -> str:
    """
    Normalize skill name to canonical form.
    
    @param skill: Raw skill name
    @returns: Normalized skill name
    """
    normalizations = {
        "golang": "Go",
        "k8s": "Kubernetes",
        "postgres": "PostgreSQL",
        "react.js": "React",
        "vue.js": "Vue",
        "node.js": "Node.js",
        "nodejs": "Node.js",
    }
    
    lower = skill.lower()
    if lower in normalizations:
        return normalizations[lower]
    
    return skill
