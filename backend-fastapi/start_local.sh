#!/bin/bash
# Start the backend server
# Config automatically loads .env.local

cd "$(dirname "$0")"

# Activate virtual environment if it exists
if [ -d "venv/bin" ]; then
    source venv/bin/activate
fi

# Run uvicorn
uvicorn app.main:app --reload --port 8080
