FROM python:3.11-slim
WORKDIR /app

# System deps
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

COPY packages/ml-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY packages/ml-service/ ./

# Model cache directory (mounted as volume for persistence)
RUN mkdir -p /app/models

RUN addgroup --system app && adduser --system --ingroup app app && \
    chown -R app:app /app
USER app

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
