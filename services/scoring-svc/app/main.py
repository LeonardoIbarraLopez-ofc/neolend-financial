"""
scoring-svc — Motor de scoring (FastAPI, MVP local-first).

Sin Redis, sin scikit-learn: in-memory cache + modelo dummy + SHAP simulado.
Arrancar: uvicorn app.main:app --port 8102 --reload
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.engine import (
    assess_fraud,
    compute_score,
    fetch_bureau,
    get_breaker_status,
    get_model_state,
    promote_model,
)

app = FastAPI(
    title="scoring-svc",
    version="0.1.0",
    description="Motor de scoring: buró/CB + alt-data + fraude + SHAP + blue/green ML",
)

# In-memory store de scores (reemplaza Redis para MVP)
_scores: dict[str, dict[str, Any]] = {}


# ── Schemas ───────────────────────────────────────────────────────────────────

class AltDataUtilities(BaseModel):
    onTimeRatio: float = 0.75

class AltDataWallet(BaseModel):
    avgMonthlyInflow: float = 300.0

class AltDataEcommerce(BaseModel):
    orders6m: int = 5

class AltData(BaseModel):
    utilities: AltDataUtilities = Field(default_factory=AltDataUtilities)
    wallet: AltDataWallet = Field(default_factory=AltDataWallet)
    ecommerce: AltDataEcommerce = Field(default_factory=AltDataEcommerce)

class FraudInput(BaseModel):
    selfieRef: str | None = None
    deviceFingerprint: str | None = None

class ScoreRequest(BaseModel):
    applicationId: str
    applicantId: str
    documentNumber: str | None = None
    altData: AltData = Field(default_factory=AltData)
    fraud: FraudInput = Field(default_factory=FraudInput)

class FraudAssessRequest(BaseModel):
    applicantId: str
    selfieRef: str | None = None
    deviceFingerprint: str | None = None


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> dict:
    return {
        "service": "scoring-svc",
        "status": "ok",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ── Scoring ───────────────────────────────────────────────────────────────────

@app.post("/v1/scores", status_code=201)
def create_score(req: ScoreRequest) -> dict[str, Any]:
    # 1. Evaluación de fraude (local, data residency)
    fraud_result = assess_fraud(req.fraud.deviceFingerprint, req.fraud.selfieRef)
    if fraud_result["decision"] == "FAIL":
        raise HTTPException(
            status_code=422,
            detail={
                "type": "urn:neolend:error:fraud_detected",
                "title": "Fraud detected",
                "status": 422,
                "detail": "Application flagged by local fraud module",
                "applicationId": req.applicationId,
            },
        )

    # 2. Buró (circuit breaker + in-memory cache)
    doc_key = req.documentNumber or req.applicantId
    bureau_available, bureau_data = fetch_bureau(doc_key)
    bureau_score: int = bureau_data.get("score", 650) if bureau_available else 650

    # 3. Modelo de scoring
    model = get_model_state()
    result = compute_score(
        on_time_ratio=req.altData.utilities.onTimeRatio,
        avg_monthly_inflow=req.altData.wallet.avgMonthlyInflow,
        orders_6m=req.altData.ecommerce.orders6m,
        bureau_score=bureau_score,
        bureau_available=bureau_available,
    )

    slot = model["active_slot"]
    version_key = "blue_version" if slot == "BLUE" else "green_version"

    score_id = str(uuid.uuid4())
    response: dict[str, Any] = {
        "scoreId": score_id,
        "applicationId": req.applicationId,
        "applicantId": req.applicantId,
        "score": result["score"],
        "riskBand": result["risk_band"],
        "probabilityOfDefault": result["pd"],
        "modelVersion": model[version_key],
        "modelSlot": slot,
        "partialData": not bureau_available,
        "bureau": (
            bureau_data
            if bureau_available
            else {"source": "FALLBACK", "hasFile": False}
        ),
        "fraud": fraud_result,
        "explanation": {
            "shap": result["shap"],
            "baseValue": result["base_value"],
        },
        "computedAt": datetime.now(timezone.utc).isoformat(),
    }

    _scores[score_id] = response
    return response


@app.get("/v1/scores/{score_id}")
def get_score(score_id: str) -> dict[str, Any]:
    score = _scores.get(score_id)
    if not score:
        raise HTTPException(status_code=404, detail="Score not found")
    return score


# ── Fraude ────────────────────────────────────────────────────────────────────

@app.post("/v1/fraud/assess")
def fraud_assess(req: FraudAssessRequest) -> dict[str, Any]:
    result = assess_fraud(req.deviceFingerprint, req.selfieRef)
    return {"applicantId": req.applicantId, **result}


# ── Buró / Circuit Breaker ────────────────────────────────────────────────────

@app.get("/v1/bureau/health/breaker")
def bureau_breaker_status() -> dict:
    return get_breaker_status()


# ── Blue/Green ────────────────────────────────────────────────────────────────

@app.get("/v1/model/active")
def model_active() -> dict:
    m = get_model_state()
    slot = m["active_slot"]
    return {
        "activeSlot": slot,
        "activeVersion": m["blue_version" if slot == "BLUE" else "green_version"],
        "blueVersion": m["blue_version"],
        "greenVersion": m["green_version"],
    }


@app.post("/v1/model/promote")
def model_promote() -> dict:
    before = get_model_state()["active_slot"]
    m = promote_model()
    after = m["active_slot"]
    return {
        "promoted": True,
        "previousSlot": before,
        "activeSlot": after,
        "activeVersion": m["blue_version" if after == "BLUE" else "green_version"],
        "promotedAt": datetime.now(timezone.utc).isoformat(),
    }
