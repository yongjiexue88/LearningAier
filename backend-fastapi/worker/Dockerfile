# Worker Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy worker requirements and install
COPY worker/requirements.txt ./worker/requirements.txt
RUN pip install --no-cache-dir -r worker/requirements.txt

# Copy shared app code (needed for LLM service imports)
COPY app ./app

# Copy worker code
COPY worker ./worker

# Environment
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

# Non-root user
RUN useradd -m workeruser
USER workeruser

# Start worker service
CMD ["python", "-m", "uvicorn", "worker.main:app", "--host", "0.0.0.0", "--port", "8000"]
