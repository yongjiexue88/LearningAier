"""Flashcards API routes"""
from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import verify_firebase_token, AuthenticatedUser
from app.models.flashcards import (
    GenerateFlashcardsRequest, GenerateFlashcardsResponse,
    ReviewFlashcardRequest, ReviewFlashcardResponse,
    FlashcardItem
)
from app.services.flashcard_service import FlashcardService
from app.core.exceptions import NotFoundError, UnauthorizedError

router = APIRouter(prefix="/api/flashcards", tags=["flashcards"])


@router.post("/generate", response_model=GenerateFlashcardsResponse)
async def generate_flashcards(
    request: GenerateFlashcardsRequest,
    user: AuthenticatedUser = Depends(verify_firebase_token)
):
    """
    Generate flashcards from note content.
    """
    try:
        flashcard_service = FlashcardService()
        result = await flashcard_service.generate_flashcards(
            user_id=user.uid,
            note_id=request.note_id,
            count=request.count
        )
        return GenerateFlashcardsResponse(**result)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/review", response_model=ReviewFlashcardResponse)
async def review_flashcard(
    request: ReviewFlashcardRequest,
    user: AuthenticatedUser = Depends(verify_firebase_token)
):
    """
    Submit flashcard review and update SM-2 schedule.
    """
    try:
        flashcard_service = FlashcardService()
        result = await flashcard_service.review_flashcard(
            user_id=user.uid,
            flashcard_id=request.flashcard_id,
            rating=request.rating
        )
        return ReviewFlashcardResponse(**result)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
