"""Document worker main application"""
import os
import logging
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import asyncio

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


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for Kubernetes probes"""
    return HealthResponse(
        status="healthy",
        service="document-worker",
        version="1.0.0"
    )


@app.post("/process-pdf")
async def process_pdf(request: ProcessPDFRequest, background_tasks: BackgroundTasks):
    """
    Process a PDF document:
    1. Download from Firebase Storage
    2. Extract text
    3. Generate embeddings (optional)
    4. Save to Firestore/Pinecone
    
    Returns immediately with task_id, processes in background.
    """
    try:
        logger.info(f"Received PDF processing request for document {request.document_id}")
        
        # Import here to avoid circular dependencies
        from worker.pdf_processor import PDFProcessor
        
        processor = PDFProcessor()
        
        # Schedule background processing
        task_id = f"task_{request.document_id}"
        background_tasks.add_task(
            processor.process_document,
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
                "message": f"Processing document {request.document_id} in background"
            }
        )
    except Exception as e:
        logger.error(f"Error processing PDF request: {e}", exc_info=True)
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
