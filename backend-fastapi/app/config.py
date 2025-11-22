"""Application configuration using pydantic-settings"""
from pydantic_settings import BaseSettings
from functools import lru_cache


from typing import Optional

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Server
    app_env: str = "local"
    port: int = 8787
    
    # Firebase
    firebase_project_id: str
    firebase_storage_bucket: str
    firebase_credentials_json: Optional[str] = None
    firebase_client_email: Optional[str] = None
    firebase_private_key: Optional[str] = None
    
    # LLM
    llm_provider: str = "gemini"
    llm_model: str = "gemini-2.0-flash-exp"
    llm_api_key: str
    llm_base_url: Optional[str] = None
    
    # Embeddings
    embeddings_provider: str = "gemini"
    embeddings_model: str = "text-embedding-004"
    embeddings_api_key: str
    embeddings_dimensions: int = 768
    
    # Vector DB (Pinecone)
    vector_db_provider: str = "pinecone"
    pinecone_api_key: str
    pinecone_environment: str = "us-east-1"
    pinecone_index_name: str = "learningaier-chunks"
    
    class Config:
        env_file = ".env.local"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
