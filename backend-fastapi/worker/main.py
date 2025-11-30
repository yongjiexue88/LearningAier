"""Document worker main application"""
import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
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


@app.on_event("startup")
async def startup():
    app.state.redis = await create_pool(redis_settings)


@app.on_event("shutdown")
async def shutdown():
    await app.state.redis.close()


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for Kubernetes probes"""
    # Check Redis connection
    try:
        await app.state.redis.ping()
        redis_status = "connected"
    except Exception:
        redis_status = "disconnected"

    return HealthResponse(
        status="healthy" if redis_status == "connected" else "degraded",
        service="document-worker",
        version="1.0.0"
    )


@app.post("/process-pdf")
async def process_pdf(request: ProcessPDFRequest):
    """
    Process a PDF document:
    Enqueues a job in Redis for background processing.
    """
    try:
        logger.info(f"Received PDF processing request for document {request.document_id}")
        
        # Enqueue job in Redis
        job = await app.state.redis.enqueue_job(
            'process_document_task',
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
                "task_id": job.job_id,
                "message": f"Processing document {request.document_id} queued"
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
        "endpoints": {
            "health": "/health",
            "process_pdf": "/process-pdf",
            "generate_embeddings": "/generate-embeddings"
        }
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
