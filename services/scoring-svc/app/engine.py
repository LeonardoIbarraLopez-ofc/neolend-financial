"""
Scoring engine: modelo dummy, circuit breaker (in-memory), blue/green, fraude.
Sin Redis, sin scikit-learn — todo en memoria para el MVP.
"""
from __future__ import annotations

import hashlib
import random
import time
from datetime import datetime, timezone

# ── Blue/Green state ──────────────────────────────────────────────────────────

_model: dict = {
    "active_slot": "BLUE",
    "blue_version": "v1.0.0-logistic-dummy",
    "green_version": "v1.1.0-logistic-dummy",
}


def get_model_state() -> dict:
    return dict(_model)


def promote_model() -> dict:
    before = _model["active_slot"]
    _model["active_slot"] = "GREEN" if before == "BLUE" else "BLUE"
    return get_model_state()


# ── Circuit Breaker (in-memory, reemplaza Redis) ──────────────────────────────

_FAILURE_THRESHOLD = 3
_RECOVERY_SECS = 30

_breaker: dict = {
    "state": "CLOSED",   # CLOSED | OPEN | HALF_OPEN
    "failure_count": 0,
    "open_until": None,  # epoch float
}

_bureau_cache: dict[str, dict] = {}  # doc_hash → resultado bureau


def _tick() -> None:
    """OPEN → HALF_OPEN tras ventana de recuperación."""
    if _breaker["state"] == "OPEN" and _breaker["open_until"]:
        if time.time() >= _breaker["open_until"]:
            _breaker["state"] = "HALF_OPEN"
            _breaker["failure_count"] = 0


def _fail() -> None:
    _breaker["failure_count"] += 1
    if _breaker["failure_count"] >= _FAILURE_THRESHOLD:
        _breaker["state"] = "OPEN"
        _breaker["open_until"] = time.time() + _RECOVERY_SECS


def _success() -> None:
    _breaker["state"] = "CLOSED"
    _breaker["failure_count"] = 0
    _breaker["open_until"] = None


def get_breaker_status() -> dict:
    _tick()
    open_until = (
        datetime.fromtimestamp(_breaker["open_until"], tz=timezone.utc).isoformat()
        if _breaker["open_until"]
        else None
    )
    return {
        "state": _breaker["state"],
        "failureCount": _breaker["failure_count"],
        "openUntil": open_until,
    }


def fetch_bureau(doc_hash: str) -> tuple[bool, dict]:
    """
    Simula llamada SOAP al buró con circuit breaker e in-memory cache.
    Retorna (bureau_available, bureau_data).
    """
    _tick()

    cache_key = hashlib.sha256(doc_hash.encode()).hexdigest()[:16]
    if cache_key in _bureau_cache:
        return True, _bureau_cache[cache_key]

    if _breaker["state"] == "OPEN":
        return False, {}

    # 90% éxito en demo; sube a 100% con BUREAU_ALWAYS_OK=true (env)
    import os
    always_ok = os.getenv("BUREAU_ALWAYS_OK", "true").lower() == "true"
    mock_ok = always_ok or random.random() > 0.10

    if not mock_ok:
        _fail()
        return False, {}

    bureau_data = {
        "source": "BUREAU_MOCK",
        "score": random.randint(580, 800),
        "hasFile": True,
        "delinquencies": random.randint(0, 1),
        "queriedAt": datetime.now(timezone.utc).isoformat(),
    }
    _bureau_cache[cache_key] = bureau_data
    _success()
    return True, bureau_data


# ── Fraude (local, data residency) ────────────────────────────────────────────

_BAD_FINGERPRINTS = {"fp-fraud-001", "fp-fraud-002", "fp-test-fraud"}


def assess_fraud(device_fp: str | None, selfie_ref: str | None) -> dict:
    if device_fp in _BAD_FINGERPRINTS:
        return {"decision": "FAIL", "fraudScore": 0.95}
    fraud_score = round(random.uniform(0.01, 0.10), 4)
    return {"decision": "PASS", "fraudScore": fraud_score}


# ── Modelo de scoring dummy (logistic-style) ──────────────────────────────────

def compute_score(
    on_time_ratio: float,
    avg_monthly_inflow: float,
    orders_6m: int,
    bureau_score: int,
    bureau_available: bool,
) -> dict:
    """
    Modelo dummy determinístico basado en 4 features.
    Rango de salida: 400–850.
    """
    # Contribuciones individuales (SHAP simulado proporcional al input)
    util_contrib   = round((on_time_ratio - 0.70) * 150, 2)          # ±45
    wallet_contrib = round(min(avg_monthly_inflow / 400.0 * 60, 70), 2)  # 0..70
    ecom_contrib   = round(min(orders_6m * 3.5, 35), 2)               # 0..35
    if bureau_available:
        bureau_contrib = round((bureau_score - 650) / 350.0 * 80, 2)  # ±~80
    else:
        bureau_contrib = -15.0  # penalización por datos parciales

    base = 650
    total = int(base + util_contrib + wallet_contrib + ecom_contrib + bureau_contrib)
    total = max(400, min(850, total))

    # Banda de riesgo + PD
    if total >= 700:
        risk_band = "A"
        pd = max(0.01, round(0.025 + (720 - total) * 0.0008, 4))
    elif total >= 550:
        risk_band = "B"
        pd = max(0.04, round(0.09 + (620 - total) * 0.0015, 4))
    else:
        risk_band = "C"
        pd = max(0.18, round(0.22 + (530 - total) * 0.002, 4))

    pd = min(pd, 0.50)

    # SHAP values (contribuciones normalizadas, base_value = 0.0)
    shap = [
        {"feature": "utilities.onTimeRatio",  "contribution": round(util_contrib / 100, 4)},
        {"feature": "wallet.avgMonthlyInflow", "contribution": round(wallet_contrib / 100, 4)},
        {"feature": "ecommerce.orders6m",      "contribution": round(ecom_contrib / 100, 4)},
        {"feature": "bureau.score",            "contribution": round(bureau_contrib / 100, 4)},
    ]

    return {
        "score": total,
        "risk_band": risk_band,
        "pd": pd,
        "shap": shap,
        "base_value": round((total - base) / 200, 4),
    }
