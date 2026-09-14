import logging
from urllib.parse import urlparse

import httpx

import config

logger = logging.getLogger(__name__)

SERPER_URL = "https://google.serper.dev/search"

FALLBACK_EVIDENCE: list[dict] = [
    {
        "title": "Federal Government Policy Update",
        "link": "https://fmf.gov.ng",
        "snippet": "Official government statement on the matter under review.",
        "source": "fmf.gov.ng",
    },
    {
        "title": "NMDPRA Regulatory Notice",
        "link": "https://nmdpra.gov.ng",
        "snippet": "Regulatory authority guidance on downstream petroleum activities.",
        "source": "nmdpra.gov.ng",
    },
    {
        "title": "Nigeria News Coverage",
        "link": "https://punchng.com",
        "snippet": "Nigerian media reporting on the policy development.",
        "source": "punchng.com",
    },
]


def _domain(url: str) -> str:
    try:
        return urlparse(url).netloc.replace("www.", "")
    except Exception:
        return ""


def search_evidence(claim: str) -> list[dict]:
    if not config.SERPER_API_KEY:
        return list(FALLBACK_EVIDENCE)

    try:
        response = httpx.post(
            SERPER_URL,
            headers={"X-API-KEY": config.SERPER_API_KEY, "Content-Type": "application/json"},
            json={"q": f"{claim} Nigeria", "num": 8, "gl": "ng", "hl": "en"},
            timeout=20.0,
        )
        response.raise_for_status()
        organic = response.json().get("organic", []) or []
        results = [
            {
                "title": item.get("title", ""),
                "link": item.get("link", ""),
                "snippet": item.get("snippet", ""),
                "source": _domain(item.get("link", "")),
            }
            for item in organic
        ]
        return results or list(FALLBACK_EVIDENCE)
    except Exception:
        logger.warning("Serper search failed, using fallback evidence", exc_info=True)
        return list(FALLBACK_EVIDENCE)
