"""Pydantic models for flashcard-related requests and responses"""
from pydantic import BaseModel, Field
from typing import List, Literal, Optional


class GenerateFlashcardsRequest(BaseModel):
    """Request model for generating flashcards"""
    note_id: str
    count: int = Field(default=5, ge=1, le=20)


class FlashcardItem(BaseModel):
    """Single flashcard item"""
    term: str
    definition: str
    context: Optional[str] = None


class GenerateFlashcardsResponse(BaseModel):
    """Response model for generated flashcards"""
    flashcards: List[FlashcardItem]
    note_id: str


class ReviewFlashcardRequest(BaseModel):
    """Request model for reviewing a flashcard"""
    flashcard_id: str
    rating: Literal[1, 2, 3, 4]  # 1: Again, 2: Hard, 3: Good, 4: Easy


class ReviewFlashcardResponse(BaseModel):
    """Response model for review submission"""
    success: bool
    next_review: str  # ISO date string
    interval: int
    ease_factor: float
