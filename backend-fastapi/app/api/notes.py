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


@router.post("/reindex-lab-vertex")
async def reindex_lab_vertex(
    request: ReindexRequest,
    user: AuthenticatedUser = Depends(verify_firebase_token)
):
    """
    Lab-only endpoint: Reindex a note using Vertex AI embeddings to a separate namespace.
    
    This endpoint is for testing Vertex AI integration without affecting production data.
    Embeddings are stored in a separate Pinecone namespace: {user_id}-vertex-lab
    """
    try:
        from app.core.firebase import get_firestore_client
        from app.services.llm_service import LLMService
        from app.services.vector_service import VectorService
        from app.config import get_settings
        
        settings = get_settings()
        
        # Verify Vertex AI is configured
        if settings.llm_provider != "vertex_ai":
            raise HTTPException(
                status_code=400, 
                detail="This endpoint requires LLM_PROVIDER=vertex_ai in configuration"
            )
        
        db = get_firestore_client()
        llm_service = LLMService()
        vector_service = VectorService()
        
        # 1. Fetch note from Firestore
        note_ref = db.collection("notes").document(request.note_id)
        note_doc = note_ref.get()
        
        if not note_doc.exists:
            raise HTTPException(status_code=404, detail=f"Note {request.note_id} not found")
        
        note_data = note_doc.to_dict()
        
        # Verify ownership
        if note_data.get("user_id") != user.uid:
            raise HTTPException(status_code=403, detail="Unauthorized access to note")
        
        # 2. Get content (bilingual)
        content_zh = note_data.get("content_md_zh", "")
        content_en = note_data.get("content_md_en", "")
        combined_content = f"{content_zh}\n\n{content_en}".strip()
        
        if not combined_content:
            return {
                "success": True,
                "chunks_created": 0,
                "note_id": request.note_id,
                "namespace": f"{user.uid}-vertex-lab"
            }
        
        # 3. Chunk content (using same logic as NoteService)
        def chunk_text(text: str, chunk_size: int = 500) -> list[str]:
            chunks = []
            overlap = chunk_size // 4
            for i in range(0, len(text), chunk_size - overlap):
                chunk = text[i:i + chunk_size].strip()
                if chunk:
                    chunks.append(chunk)
            return chunks
        
        chunks = chunk_text(combined_content, chunk_size=500)
        
        # 4. Generate embeddings using Vertex AI (via router)
        embeddings = await llm_service.generate_embeddings(chunks)
        
        # 5. Upsert to separate lab namespace
        lab_namespace = f"{user.uid}-vertex-lab"
        vectors = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            vectors.append({
                "id": f"{request.note_id}_chunk_{i}_lab",
                "values": embedding,
                "metadata": {
                    "user_id": user.uid,
                    "note_id": request.note_id,
                    "content": chunk,
                    "position": i,
                    "lab": True,
                    "provider": "vertex_ai"
                }
            })
        
        await vector_service.upsert_vectors(vectors, namespace=lab_namespace)
        
        return {
            "success": True,
            "chunks_created": len(chunks),
            "note_id": request.note_id,
            "namespace": lab_namespace,
            "provider": "vertex_ai"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
