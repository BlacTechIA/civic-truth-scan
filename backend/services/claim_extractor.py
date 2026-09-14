import logging

from anthropic import Anthropic
from fastapi import HTTPException

import config

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a civic claim normalizer. Your job is to take informal or colloquial civic "
    "claims and restate them as a clear, precise, testable claim without changing the "
    "meaning. Remove emotional language. Output only the normalized claim as a single "
    "sentence. Do not add any explanation."
)


def normalize_claim(claim: str) -> str:
    try:
        client = Anthropic(api_key=config.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=config.MODEL,
            max_tokens=200,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": claim}],
        )
        parts = [block.text for block in response.content if getattr(block, "type", "") == "text"]
        normalized = " ".join(parts).strip()
        return normalized or claim.strip()
    except Exception:
        logger.exception("Claim normalization failed")
        raise HTTPException(status_code=503, detail="Verification service temporarily unavailable.")
