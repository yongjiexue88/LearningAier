"""FastAPI application initialization"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import get_settings
from app.api import notes, documents, flashcards, graph, chat, analytics
import time
import json


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    from app.core.firebase import get_firebase_app
    
    settings = get_settings()
    print("="*80)
    print("🚀 LearningAier API Starting Up")
    print("="*80)
    print(f"📍 Environment: {settings.app_env}")
    print(f"🔌 Port: {settings.port}")
    print(f"🔥 Firebase Project: {settings.firebase_project_id}")
    print(f"🤖 LLM Provider: {settings.llm_provider}")
    print(f"🤖 LLM Model: {settings.llm_model}")
    print(f"📊 Vector DB: {settings.vector_db_provider}")
    
    # Initialize Firebase Admin SDK
    try:
        get_firebase_app()
        print("✅ Firebase Admin SDK initialized successfully")
    except Exception as e:
        print(f"❌ Firebase initialization failed: {e}")
        raise
    
    # Initialize Vertex AI if configured
    if settings.llm_provider == "vertex_ai":
        try:
            from app.core.vertex import init_vertex_ai
            init_vertex_ai()
        except Exception as e:
            print(f"❌ Vertex AI initialization failed: {e}")
            raise
    
    print("="*80)
    
    yield  # Server runs here
    
    # Shutdown (if needed in the future)
    print("👋 Shutting down LearningAier API")


app = FastAPI(
    title="LearningAier API",
    description="AI-powered note-taking and flashcard backend with RAG",
    version="2.0.0",
    lifespan=lifespan
)

# Include routers
app.include_router(notes.router)
app.include_router(documents.router)
app.include_router(flashcards.router)
app.include_router(graph.router)
app.include_router(chat.router)
app.include_router(analytics.router)


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins including Firebase Hosting (Dec 2, 2025)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiter middleware
from app.middleware.rate_limiter import add_rate_limiter
add_rate_limiter(app)

# Request/Response Logging Middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Skip logging for streaming endpoints to avoid consuming request body
    if request.url.path.endswith("/stream"):
        return await call_next(request)

    start_time = time.time()
    
    # Log request
    print(f"\n{'='*80}")
    print(f"🔵 INCOMING REQUEST")
    print(f"{'='*80}")
    print(f"📍 Method: {request.method}")
    print(f"🔗 URL: {request.url}")
    print(f"👤 Client: {request.client.host if request.client else 'Unknown'}")
    
    # Log headers (excluding sensitive auth tokens)
    headers_to_log = {k: v for k, v in request.headers.items() if k.lower() not in ['authorization']}
    if 'authorization' in dict(request.headers):
        headers_to_log['authorization'] = 'Bearer ***' 
    print(f"📋 Headers: {json.dumps(headers_to_log, indent=2)}")
    
    # Log request body for POST/PUT requests
    if request.method in ["POST", "PUT", "PATCH"]:
        try:
            body = await request.body()
            if body:
                body_str = body.decode()
                try:
                    body_json = json.loads(body_str)
                    print(f"📦 Request Body:")
                    print(json.dumps(body_json, indent=2))
                except:
                    print(f"📦 Request Body (raw): {body_str[:500]}")
                
                # Re-create request with body for downstream processing
                async def receive():
                    return {"type": "http.request", "body": body}
                request._receive = receive
        except Exception as e:
            print(f"⚠️  Could not read request body: {e}")
    
    # Process request
    response = await call_next(request)
    
    # Calculate duration
    duration = time.time() - start_time
    
    # Log response
    print(f"\n{'='*80}")
    print(f"🟢 OUTGOING RESPONSE")
    print(f"{'='*80}")
    print(f"📊 Status Code: {response.status_code}")
    print(f"⏱️  Duration: {duration:.3f}s")
    print(f"{'='*80}\n")
    
    return response


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
