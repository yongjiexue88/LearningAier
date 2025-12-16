"""Document worker main application"""
import os
import logging
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from arq import create_pool
from arq.connections import RedisSettings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="LearningAier Document Worker",
    description="Microservice for heavy document processing tasks",
    version="1.0.0"
)

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_settings = RedisSettings.from_dsn(REDIS_URL)
redis_settings.conn_timeout = 2 # Fail fast if no Redis


class ProcessPDFRequest(BaseModel):
    """Request model for PDF processing"""
    document_id: str
    file_path: str  # Firebase Storage path
    user_id: str
    extract_text: bool = True
    generate_embeddings: bool = True


class EmbeddingRequest(BaseModel):
    """Request model for bulk embedding generation"""
    texts: List[str]
    user_id: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str
    redis_status: str


@app.on_event("startup")
async def startup():
    try:
        app.state.redis = await create_pool(redis_settings)
        # Test connection
        await app.state.redis.ping()
        logger.info(f"✅ Connected to Redis at {REDIS_URL}")
    except Exception as e:
        logger.warning(f"⚠️  Could not connect to Redis: {e}. Falling back to in-memory/background tasks.")
        app.state.redis = None


@app.on_event("shutdown")
async def shutdown():
    if getattr(app.state, "redis", None):
        await app.state.redis.close()


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for Kubernetes probes"""
    redis_status = "disconnected"
    status = "healthy" # Always healthy even if Redis is down (graceful degradation)
    
    if getattr(app.state, "redis", None):
        try:
            await app.state.redis.ping()
            redis_status = "connected"
        except Exception:
            redis_status = "error"
            # If we expect Redis but it fails ping, maybe we should be degraded?
            # But for migration, we want to start up.
            pass

    return HealthResponse(
        status=status,
        service="document-worker",
        version="1.0.0",
        redis_status=redis_status
    )


async def run_process_document_task_sync(document_id: str, file_path: str, user_id: str, extract_text: bool, generate_embeddings: bool):
    """Helper to run task synchronously when Redis is missing"""
    logger.info(f"Running process_document_task for {document_id} in background task")
    try:
        from worker.worker import process_document_task
        # Pass None as ctx mock
        await process_document_task(None, document_id, file_path, user_id, extract_text, generate_embeddings)
        logger.info(f"Completed process_document_task for {document_id}")
    except Exception as e:
        logger.error(f"Error in background process_document_task: {e}", exc_info=True)


@app.post("/process-pdf")
async def process_pdf(request: ProcessPDFRequest, background_tasks: BackgroundTasks):
    """
    Process a PDF document:
    Enqueues a job in Redis if available, else runs as BackgroundTask.
    """
    try:
        logger.info(f"Received PDF processing request for document {request.document_id}")
        
        task_id = "background_task"
        message = "Processing document queued (background)"

        if getattr(app.state, "redis", None):
            # Enqueue job in Redis
            job = await app.state.redis.enqueue_job(
                'process_document_task',
                document_id=request.document_id,
                file_path=request.file_path,
                user_id=request.user_id,
                extract_text=request.extract_text,
                generate_embeddings=request.generate_embeddings
            )
            task_id = job.job_id
            message = "Processing document queued (Redis)"
        else:
            # Run in background task
            background_tasks.add_task(
                run_process_document_task_sync,
                document_id=request.document_id,
                file_path=request.file_path,
                user_id=request.user_id,
                extract_text=request.extract_text,
                generate_embeddings=request.generate_embeddings
            )
        
        return JSONResponse(
            status_code=202,
            content={
                "status": "accepted",
                "task_id": task_id,
                "message": message
            }
        )
    except Exception as e:
        logger.error(f"Error queuing PDF request: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-embeddings")
async def generate_embeddings(request: EmbeddingRequest):
    """
    Generate embeddings for a list of texts.
    Used for bulk operations.
    """
    try:
        logger.info(f"Generating embeddings for {len(request.texts)} texts")
        
        from worker.embedding_worker import EmbeddingWorker
        
        worker = EmbeddingWorker()
        embeddings = await worker.generate_bulk_embeddings(request.texts)
        
        return {
            "status": "success",
            "count": len(embeddings),
            "embeddings": embeddings
        }
    except Exception as e:
        logger.error(f"Error generating embeddings: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "LearningAier Document Worker",
        "status": "running",
        "redis_enabled": bool(getattr(app.state, "redis", None)),
        "endpoints": {
            "health": "/health",
            "process_pdf": "/process-pdf",
            "generate_embeddings": "/generate-embeddings"
        }
    }


if __name__ == "__main__":
    import uvicorn
    # Use standard PORT env var
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
