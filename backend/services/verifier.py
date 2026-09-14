import json
import logging
from datetime import datetime, timezone

from anthropic import Anthropic
from fastapi import HTTPException

import config

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a civic fact-checking assistant for Nigerian citizens. Your job is to assess civic claims based only on the evidence provided to you. You do not use your own knowledge or make things up. If the evidence is insufficient, return UNVERIFIABLE. You must respond with a single valid JSON object and nothing else. No markdown. No explanation outside the JSON.

The JSON must have exactly these fields:
{
  assessment: one of TRUE, FALSE, MISLEADING, or UNVERIFIABLE,
  summary: plain language explanation of what the evidence shows, 2 to 3 sentences,
  why: the reasoning behind the assessment based on the evidence, 2 to 3 sentences,
  confidence_context: one of High, Medium, or Low,
  sources: array of source objects, one per evidence item, each with fields:
    title, publisher, source_type (Primary if a .gov.ng domain, Secondary otherwise),
    published_at (null if unknown), url, relevance (one sentence), evidence_summary
    (one sentence paraphrase of what the snippet says about the claim),
  next_steps: array of 2 to 3 plain string sentences telling the user what to do next,
  limitations: one sentence about the limits of this assessment
}

Never fabricate source content. Only use what is in the evidence provided."""


def _format_evidence(evidence: list[dict]) -> str:
    blocks = []
    for index, item in enumerate(evidence, start=1):
        blocks.append(
            f"SOURCE {index}\n"
            f"Title: {item.get('title', '')}\n"
            f"URL: {item.get('link', '')}\n"
            f"Snippet: {item.get('snippet', '')}"
        )
    return "\n\n".join(blocks)


def _unverifiable_fallback(evidence: list[dict]) -> dict:
    return {
        "assessment": "UNVERIFIABLE",
        "summary": "The available evidence was not sufficient to reach a conclusion about this claim.",
        "why": "The retrieved material did not directly address the specific claim, so no assessment could be made.",
        "confidence_context": "Low",
        "sources": [
            {
                "title": item.get("title", ""),
                "publisher": item.get("source", ""),
                "source_type": "Primary" if ".gov.ng" in item.get("link", "") else "Secondary",
                "published_at": None,
                "url": item.get("link") or None,
                "relevance": "Retrieved while searching for evidence about this claim.",
                "evidence_summary": item.get("snippet", ""),
            }
            for item in evidence
        ],
        "next_steps": [
            "Check the websites of the relevant Nigerian government agencies for an official statement.",
            "Compare reporting from more than one established Nigerian news organisation before sharing.",
        ],
        "limitations": "The assessment could not be completed because the evidence could not be interpreted reliably.",
    }


def assess(claim: str, evidence: list[dict]) -> dict:
    user_message = f"Claim to assess: {claim}\n\nEvidence:\n{_format_evidence(evidence)}"

    try:
        client = Anthropic(api_key=config.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=config.MODEL,
            max_tokens=1500,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        raw = " ".join(
            block.text for block in response.content if getattr(block, "type", "") == "text"
        ).strip()
    except Exception:
        logger.exception("Assessment call failed")
        raise HTTPException(status_code=503, detail="Verification service temporarily unavailable.")

    try:
        start = raw.index("{")
        end = raw.rindex("}") + 1
        result = json.loads(raw[start:end])
        if not isinstance(result, dict) or "assessment" not in result:
            raise ValueError("unexpected payload")
    except Exception:
        logger.warning("Could not parse assessment JSON")
        result = _unverifiable_fallback(evidence)

    result["assessed_at"] = datetime.now(timezone.utc).isoformat()
    return result
