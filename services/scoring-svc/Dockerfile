FROM python:3.12-slim
WORKDIR /app

# Instala dependencias primero (mejor caché)
COPY services/scoring-svc/pyproject.toml ./
RUN pip install --no-cache-dir \
    "fastapi>=0.110.0" "uvicorn[standard]>=0.29.0" "pydantic>=2.6.0" \
    "redis>=5.0.0" "scikit-learn>=1.4.0" "shap>=0.45.0" "numpy>=1.26.0" "aiokafka>=0.10.0"

COPY services/scoring-svc/app ./app

EXPOSE 8102
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8102"]
