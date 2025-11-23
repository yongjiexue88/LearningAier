"""Pydantic models for note-related requests and responses"""
from pydantic import BaseModel, Field
from typing import List, Optional


class AIQARequest(BaseModel):
    """Request model for AI Q&A endpoint"""
    note_id: Optional[str] = None
    question: str = Field(..., min_length=1, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=20)


class AIQASource(BaseModel):
    """Source chunk in Q&A response"""
    chunk_id: str
    note_id: Optional[str]
    position: Optional[int]
    score: float
    preview: str


class AIQAResponse(BaseModel):
    """Response model for AI Q&A endpoint"""
    answer: str
    sources: List[AIQASource]


class ReindexRequest(BaseModel):
    """Request model for note reindexing"""
    note_id: str
    force: bool = False


class ReindexResponse(BaseModel):
    """Response model for note reindexing"""
    success: bool
    chunks_created: int
    note_id: str


class TranslateRequest(BaseModel):
    """Request model for note translation"""
    note_id: str
    target_lang: str = Field(..., pattern="^(en|zh)$")


class TranslateResponse(BaseModel):
    """Response model for note translation"""
    note_id: str
    translated_content: str
    target_language: str


class TerminologyRequest(BaseModel):
    """Request model for terminology extraction"""
    note_id: str


class TerminologyItem(BaseModel):
    """Single terminology item"""
    term: str
    definition: str


class TerminologyResponse(BaseModel):
    """Response model for terminology extraction"""
    terms: List[TerminologyItem]
