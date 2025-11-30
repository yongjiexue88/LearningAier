"""Application configuration using pydantic-settings"""
from pydantic_settings import BaseSettings
from functools import lru_cache


from typing import Optional

from pydantic import field_validator

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Server
    app_env: str = "local"
    port: int = 8080  # Default to 8080 for Cloud Run compatibility
    
    # Firebase
    firebase_project_id: str
    firebase_storage_bucket: str
    firebase_credentials_json: Optional[str] = None
    firebase_client_email: Optional[str] = None
    firebase_private_key: Optional[str] = None
    
    # LLM
    llm_provider: str = "google_ai"  # "google_ai" or "vertex_ai"
    llm_model: str = "gemini-2.0-flash-exp"
    llm_api_key: str
    llm_base_url: Optional[str] = None
    
    # Vertex AI (optional, used when llm_provider = "vertex_ai")
    vertex_project_id: Optional[str] = None
    vertex_location: str = "us-central1"
    vertex_gemini_model: str = "gemini-2.0-flash-exp"
    vertex_embedding_model: str = "text-embedding-004"
    
    # Embeddings
    embeddings_provider: str = "gemini"
    embeddings_model: str = "text-embedding-004"
    embeddings_api_key: str
    embeddings_dimensions: int = 768
    
    # Vector DB (Pinecone)
    vector_db_provider: str = "pinecone"
    pinecone_api_key: str
    pinecone_environment: Optional[str] = None  # Optional for modern Pinecone (v3+)
    pinecone_index_name: str = "learningaier-chunks"
    pinecone_index_host: Optional[str] = None  # Optional index host URL
    
    # BigQuery
    bigquery_project_id: Optional[str] = None  # Defaults to firebase_project_id if not set
    bigquery_dataset_id: str = "learningaier_analytics"

    # ML Models
    flashcard_model_endpoint_id: Optional[str] = None
    
    # Worker Service (GKE Autopilot)
    worker_service_url: Optional[str] = None  # URL of document worker service

    
    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings,
        env_settings,
        dotenv_settings,
        file_secret_settings,
    ):
        import os
        from pydantic_settings import DotEnvSettingsSource
        
        # Determine which .env file to use based on ENV variable
        env = os.getenv("ENV", "local")
        env_file = f".env.{env}" if env != "local" else ".env.local"
        
        # Create a new DotEnvSettingsSource with the correct file
        custom_dotenv = DotEnvSettingsSource(
            settings_cls,
            env_file=env_file,
            env_file_encoding='utf-8'
        )
        
        return (
            init_settings,
            env_settings,
            custom_dotenv,
            file_secret_settings,
        )

    @field_validator("llm_api_key", "embeddings_api_key", "pinecone_api_key", mode="before")
    @classmethod
    def strip_api_keys(cls, v: str) -> str:
        return v.strip() if v else v


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
