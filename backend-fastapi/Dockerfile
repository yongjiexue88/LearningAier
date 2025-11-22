# Use the official Python 3.11 slim image as the base image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Set environment variables
# PYTHONDONTWRITEBYTECODE: Prevents Python from writing pyc files to disc
# PYTHONUNBUFFERED: Prevents Python from buffering stdout and stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
# libgl1-mesa-glx is often needed for opencv or similar libs if used, 
# build-essential for compiling some python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file to the working directory
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port that the application listens on
# Cloud Run expects the application to listen on port 8080 by default
EXPOSE 8080

# Run the application using uvicorn
# host 0.0.0.0 makes the server accessible externally
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
