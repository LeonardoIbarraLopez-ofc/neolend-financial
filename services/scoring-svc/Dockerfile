FROM python:3.12-slim
WORKDIR /app

# Baseline (Fase 1): solo el runtime web. Las dependencias de ML
# (scikit-learn, shap, numpy) y de infraestructura (redis, aiokafka) se
# agregan cuando D3 implemente el modelo real y la integración del bus.
COPY services/scoring-svc/pyproject.toml ./
RUN pip install --no-cache-dir \
    "fastapi>=0.110.0" "uvicorn[standard]>=0.29.0" "pydantic>=2.6.0"

COPY services/scoring-svc/app ./app

EXPOSE 8102
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8102"]
