"""Pydantic models for document-related requests and responses"""
from pydantic import BaseModel, Field


class UploadProcessRequest(BaseModel):
    """Request model for document upload processing"""
    document_id: str
    file_path: str
    chunk_size: int = Field(default=500, ge=100, le=2000)


from typing import Optional

class UploadProcessResponse(BaseModel):
    """Response model for document upload processing"""
    success: bool
    document_id: str
    note_id: Optional[str]
    chunks_created: int
    text_preview: str
