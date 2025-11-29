# Worker Service

This directory contains the document processing worker microservice that runs on GKE Autopilot.

## Purpose

Offload CPU-intensive tasks from the main backend (Cloud Run) to dedicated worker pods:
- PDF text extraction and parsing
- Bulk embedding generation
- Heavy document processing

## Architecture

**Async (Pub/Sub)**: 
- Backend publishes task to `document-processing` topic
- Worker subscribes and processes
- Worker publishes completion event to `document-completed` topic

**Sync (HTTP)**:
- Backend makes HTTP POST to worker `/process-pdf` endpoint
- Worker processes synchronously and returns result

## Endpoints

- `GET /health` - Health check for Kubernetes liveness/readiness probes
- `POST /process-pdf` - Synchronous PDF processing
- `POST /generate-embeddings` - Bulk embedding generation
