"""FastAPI application initialization"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.api import notes, documents, flashcards
from app.core.firebase import get_firebase_app

# Initialize Firebase on startup
get_firebase_app()

app = FastAPI(
    title="LearningAier API",
    description="AI-powered note-taking and flashcard backend with RAG",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(notes.router)
app.include_router(documents.router)
app.include_router(flashcards.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "LearningAier API",
        "version": "2.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True
    )
