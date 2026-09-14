"""Presentation helpers for assessment output.

The verifier already returns user-facing prose. These helpers exist so that
wording can be adjusted in one place without touching the pipeline.
"""

ASSESSMENT_LABELS = {
    "TRUE": "True",
    "FALSE": "False",
    "MISLEADING": "Misleading",
    "UNVERIFIABLE": "Unverifiable",
}

DEFAULT_LIMITATIONS = (
    "This assessment reflects only the evidence retrieved at the time of checking."
)


def label(assessment: str) -> str:
    return ASSESSMENT_LABELS.get(assessment.upper(), "Unverifiable")


def ensure_limitations(result: dict) -> dict:
    if not result.get("limitations"):
        result["limitations"] = DEFAULT_LIMITATIONS
    return result
