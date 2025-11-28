"""Notes API routes"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.core.auth import verify_firebase_token, AuthenticatedUser
from app.models.notes import (
    AIQARequest, AIQAResponse, AIQASource,
    ReindexRequest, ReindexResponse,
    TranslateRequest, TranslateResponse,
    TerminologyRequest, TerminologyResponse, TerminologyItem,
    NoteItem
)
from app.services.rag_service import RAGService
from app.services.note_service import NoteService
from app.services.user_service import UserService
from app.core.exceptions import NotFoundError, UnauthorizedError

router = APIRouter(prefix="/api/notes", tags=["notes"])


@router.get("/", response_model=list[NoteItem])
async def get_notes(
    user: AuthenticatedUser = Depends(verify_firebase_token)
):
    """
    Get all notes for the current user.
    """
    try:
        note_service = NoteService()
        return await note_service.get_all_notes(user.uid)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai-qa", response_model=AIQAResponse)
async def ai_qa(
    request: AIQARequest,
    user: AuthenticatedUser = Depends(verify_firebase_token)
):
    """
    RAG-based Q&A over note chunks.
    
    - Generates embedding for the question
    - Retrieves relevant chunks from vector DB
    - Generates answer using LLM with context
    """
    try:
        rag_service = RAGService()
        user_service = UserService()
        
        # Get user's preferred model
        model_name = await user_service.get_preferred_model(user.uid)
        
        result = await rag_service.answer_question(
            user_id=user.uid,
            note_id=request.note_id,
            question=request.question,
            top_k=request.top_k,
            model_name=model_name
        )
        
        return AIQAResponse(
            answer=result.answer,
            sources=[AIQASource(**s) for s in result.sources]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reindex-all")
async def reindex_all(
    background_tasks: BackgroundTasks,
    user: AuthenticatedUser = Depends(verify_firebase_token)
):
    """
    Reindex all notes for the user (Background Task).
    """
    try:
        note_service = NoteService()
        background_tasks.add_task(note_service.reindex_all_notes, user.uid)
        return {"message": "Reindexing started in background"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reindex", response_model=ReindexResponse)
async def reindex_note(
    request: ReindexRequest,
    background_tasks: BackgroundTasks,
    user: AuthenticatedUser = Depends(verify_firebase_token)
):
    """
    Rebuild embeddings for a note (Background Task).
    """
    try:
        note_service = NoteService()
        
        # Queue background task
        background_tasks.add_task(
            note_service.reindex_note,
            user_id=user.uid,
            note_id=request.note_id,
            force=request.force
        )
        
        return ReindexResponse(
            success=True,
            chunks_created=-1,  # Indicates pending
            note_id=request.note_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai-translate", response_model=TranslateResponse)
async def ai_translate(
    request: TranslateRequest,
    user: AuthenticatedUser = Depends(verify_firebase_token)
):
    """
    Translate note content between zh/en.
    """
    try:
        note_service = NoteService()
        user_service = UserService()
        
        # Get user's preferred model
        model_name = await user_service.get_preferred_model(user.uid)

        result = await note_service.translate_note(
            user_id=user.uid,
            note_id=request.note_id,
            target_lang=request.target_lang,
            model_name=model_name
        )
        return TranslateResponse(**result)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai-terminology", response_model=TerminologyResponse)
async def ai_terminology(
    request: TerminologyRequest,
    user: AuthenticatedUser = Depends(verify_firebase_token)
):
    """
    Extract bilingual terminology from note content.
    """
    try:
        note_service = NoteService()
        user_service = UserService()
        
        # Get user's preferred model
        model_name = await user_service.get_preferred_model(user.uid)

        terms = await note_service.extract_terminology(
            user_id=user.uid,
            note_id=request.note_id,
            model_name=model_name
        )
        return TerminologyResponse(terms=[TerminologyItem(**t) for t in terms])
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
