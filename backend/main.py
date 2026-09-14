import logging

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import config
from models.schemas import VerifyRequest, VerifyResponse
from services import claim_extractor, explainer, retriever, verifier

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CivicCheck NG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.allowed_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@router.post("/api/verify", response_model=VerifyResponse)
async def verify(payload: VerifyRequest) -> VerifyResponse:
    claim_text = (payload.claim or "").strip()
    if not claim_text:
        raise HTTPException(status_code=400, detail="A claim is required.")

    normalized_claim = claim_extractor.normalize_claim(claim_text)
    evidence = retriever.search_evidence(normalized_claim)
    result = explainer.ensure_limitations(verifier.assess(normalized_claim, evidence))

    try:
        return VerifyResponse(**result)
    except Exception:
        logger.exception("Assessment payload did not match the response schema")
        raise HTTPException(status_code=503, detail="Verification service temporarily unavailable.")


app.include_router(router)
