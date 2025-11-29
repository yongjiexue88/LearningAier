"""Vertex AI initialization"""
from functools import lru_cache
from app.config import get_settings


@lru_cache()
def init_vertex_ai():
    """
    Initialize Vertex AI SDK.
    
    Uses Application Default Credentials (ADC) from the environment.
    This should be called during application startup if using Vertex AI.
    """
    settings = get_settings()
    
    if not settings.vertex_project_id:
        raise ValueError(
            "VERTEX_PROJECT_ID is required when using Vertex AI provider. "
            "Please set it in your .env.local file."
        )
    
    try:
        import vertexai
        
        vertexai.init(
            project=settings.vertex_project_id,
            location=settings.vertex_location
        )
        
        print(f"✅ Vertex AI initialized (Project: {settings.vertex_project_id}, Location: {settings.vertex_location})")
        return True
    except Exception as e:
        print(f"❌ Vertex AI initialization failed: {e}")
        raise
