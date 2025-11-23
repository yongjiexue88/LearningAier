# 1) Base image
FROM python:3.11-slim AS base

# 2) Set workdir
WORKDIR /app

# 3) Install system dependencies (for PDF parsing etc. optional)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# 4) Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5) Copy the app code
COPY app ./app

# 6) For Cloud Run: listen on port 8080, 0.0.0.0
ENV PORT=8080

# 7) Non-root user (recommended for Cloud Run)
RUN useradd -m appuser
USER appuser

# 8) Start FastAPI with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
