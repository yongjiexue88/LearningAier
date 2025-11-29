"""Flashcards API routes"""
from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import verify_firebase_token, AuthenticatedUser
from app.models.flashcards import (
    GenerateFlashcardsRequest, GenerateFlashcardsResponse,
    ReviewFlashcardRequest, ReviewFlashcardResponse,
    FlashcardItem, RecommendNextIntervalRequest, RecommendNextIntervalResponse
)
from app.services.flashcard_service import FlashcardService
from app.services.ml_prediction_service import MLPredictionService
from app.core.exceptions import NotFoundError, UnauthorizedError

router = APIRouter(prefix="/api/flashcards", tags=["flashcards"])


@router.get("/", response_model=list[FlashcardItem])
async def get_flashcards(
    user: AuthenticatedUser = Depends(verify_firebase_token)
):
    """
    Get all flashcards for the current user.
    """
    try:
        flashcard_service = FlashcardService()
        return await flashcard_service.get_all_flashcards(user.uid)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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


@router.post("/recommend-next", response_model=RecommendNextIntervalResponse)
async def recommend_next_interval(
    request: RecommendNextIntervalRequest,
    user: AuthenticatedUser = Depends(verify_firebase_token)
):
    """
    Get recommended next interval from ML model and SM-2.
    """
    try:
        # 1. Calculate SM-2 interval (Rule-based)
        # Simplified logic matching FlashcardService
        current_interval = request.current_interval
        # Assume current ease is 2.5 if we don't have it, or we should pass it.
        # For this estimation, we'll assume standard behavior.
        current_ease = 2.5 
        
        rating = request.rating
        
        if rating == 1:  # Again
            sm2_interval = 0
        else:
            if current_interval == 0:
                sm2_interval = 1
            elif current_interval == 1:
                sm2_interval = 6
            else:
                sm2_interval = int(current_interval * current_ease)
        
        # 2. Get ML prediction
        ml_service = MLPredictionService()
        ml_interval = await ml_service.predict_next_interval(request.model_dump())
        
        return RecommendNextIntervalResponse(
            ml_interval=ml_interval,
            sm2_interval=sm2_interval,
            difference=(ml_interval - sm2_interval) if ml_interval is not None else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
