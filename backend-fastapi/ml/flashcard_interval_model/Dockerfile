FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy training script
COPY train_cloud.py .

# Entrypoint
ENTRYPOINT ["python", "train_cloud.py"]
