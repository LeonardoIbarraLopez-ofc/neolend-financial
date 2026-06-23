"""
scoring-svc — Motor de scoring (FastAPI).

Único servicio en Python (justificado por el ecosistema ML/SHAP).
Módulos a implementar en Fase 1 (carpeta app/modules):
  - bureau   : cliente SOAP (mock) + circuit breaker + caché Redis  (contexto a)
  - altdata  : features de servicios públicos / billetera / e-commerce
  - fraud    : detección de fraude local (data residency)            (inciso VII)
  - ml       : model_server (blue/green) + explain_shap (SHAP)        (inciso II)
"""
from datetime import datetime, timezone

from fastapi import FastAPI

app = FastAPI(title="scoring-svc", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {
        "service": "scoring-svc",
        "status": "ok",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# Endpoints reales (a implementar): POST /v1/scores, GET /v1/scores/{id},
# POST /v1/fraud/assess, GET /v1/bureau/health/breaker, POST /v1/model/promote
