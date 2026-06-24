"""
scoring-svc — Motor de scoring (FastAPI).

Slice funcional de Fase 1: calcula un score explicable (contribuciones tipo SHAP)
a partir de features alternativas sintéticas + una señal de buró con fallback.

Pendiente para D3 (Fase 1+): integración HTTP real al buró SOAP con circuit
breaker + caché Redis, modelo ONNX con blue/green, módulos altdata/fraud reales,
y publicación del evento scoring.score.completed.
"""
import hashlib
import random
import uuid
from datetime import UTC, datetime

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="scoring-svc", version="0.1.0")

# Almacén en memoria (en producción: Redis — ver DISENO-BASES-DE-DATOS.md §3)
_SCORES: dict[str, dict] = {}

MODEL_VERSION = "baseline-logistic-v0.1"


class ScoreRequest(BaseModel):
    applicationId: str
    applicantId: str
    documentNumber: str


def _synthetic_features(applicant_id: str) -> dict[str, float]:
    """Deriva features deterministas del applicantId (mock de alt-data)."""
    h = hashlib.sha256(applicant_id.encode()).digest()
    return {
        "utilities.onTimeRatio": 0.5 + (h[0] / 255) * 0.5,   # 0.5–1.0
        "wallet.avgMonthlyInflow": 100 + (h[1] / 255) * 600,  # 100–700
        "ecommerce.orders6m": float(h[2] % 15),               # 0–14
        "topups.avgMonthly": 5 + (h[3] / 255) * 25,           # 5–30
    }


def _bureau_signal() -> tuple[float, bool]:
    """Mock de buró con fallback (datos parciales). El circuit breaker real es de D3."""
    if random.random() < 0.15:  # buró caído → fallback
        return 0.0, True
    return random.choice([600, 640, 680, 720]) / 1000.0, False


@app.get("/health")
def health() -> dict:
    return {
        "service": "scoring-svc",
        "status": "ok",
        "version": "0.1.0",
        "timestamp": datetime.now(UTC).isoformat(),
    }


@app.post("/v1/scores")
def create_score(req: ScoreRequest) -> dict:
    feats = _synthetic_features(req.applicantId)
    bureau_norm, partial = _bureau_signal()

    # Modelo logístico simple con pesos fijos (interpretable).
    weights = {
        "utilities.onTimeRatio": 220.0,
        "wallet.avgMonthlyInflow": 0.25,
        "ecommerce.orders6m": 6.0,
        "topups.avgMonthly": 1.5,
        "bureau.score": 180.0,
    }
    base = 350.0
    contributions = {k: round(weights[k] * v, 3) for k, v in feats.items()}
    contributions["bureau.score"] = round(weights["bureau.score"] * bureau_norm, 3)

    raw = base + sum(contributions.values())
    score = max(300, min(850, int(raw)))
    pd = round(max(0.01, min(0.6, 1 - (score - 300) / 550)), 3)
    band = "A" if score >= 720 else "B" if score >= 660 else "C" if score >= 600 else "D"

    shap = [{"feature": k, "contribution": v} for k, v in sorted(
        contributions.items(), key=lambda x: -abs(x[1]))]

    score_id = str(uuid.uuid4())
    result = {
        "scoreId": score_id,
        "applicationId": req.applicationId,
        "score": score,
        "riskBand": band,
        "probabilityOfDefault": pd,
        "modelVersion": MODEL_VERSION,
        "modelSlot": "BLUE",
        "partialData": partial,
        "fraud": {"decision": "PASS", "fraudScore": round(random.uniform(0, 0.2), 3)},
        "explanation": {"shap": shap, "baseValue": base},
        "computedAt": datetime.now(UTC).isoformat(),
    }
    _SCORES[score_id] = result
    return result


@app.get("/v1/scores/{score_id}")
def get_score(score_id: str) -> dict:
    return _SCORES.get(score_id, {"error": "not found", "scoreId": score_id})
