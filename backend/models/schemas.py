from typing import Optional

from pydantic import BaseModel


class VerifyRequest(BaseModel):
    claim: str
    has_image: bool = False


class SourceItem(BaseModel):
    title: str
    publisher: str
    source_type: str
    published_at: Optional[str] = None
    url: Optional[str] = None
    relevance: str
    evidence_summary: str


class VerifyResponse(BaseModel):
    assessment: str
    summary: str
    why: str
    confidence_context: str
    assessed_at: str
    sources: list[SourceItem]
    next_steps: list[str]
    limitations: str
