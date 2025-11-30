"""Documents API routes"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.core.auth import verify_firebase_token, AuthenticatedUser
from app.models.documents import UploadProcessRequest, UploadProcessResponse
from app.services.document_service import DocumentService
from app.core.exceptions import NotFoundError, UnauthorizedError

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload-process", response_model=UploadProcessResponse)
async def upload_process(
    request: UploadProcessRequest,
    background_tasks: BackgroundTasks,
    user: AuthenticatedUser = Depends(verify_firebase_token)
):
    """
    Process uploaded PDF document.
    
    Steps:
    1. Create placeholder note (sync)
    2. Queue background task for processing (async)
    """
    try:
        doc_service = DocumentService()
        
        # 1. Create placeholder note immediately
        result = await doc_service.create_placeholder_note(
            user_id=user.uid,
            document_id=request.document_id
        )
        
        note_id = result["note_id"]
        
        # 2. Queue background processing (via worker service)
        background_tasks.add_task(
            doc_service.process_upload_via_worker,
            user_id=user.uid,
            document_id=request.document_id,
            note_id=note_id,
            file_path=request.file_path
        )
        
        return UploadProcessResponse(
            success=True,
            document_id=request.document_id,
            note_id=note_id,
            chunks_created=-1,  # Indicates pending
            text_preview="Processing document..."
        )
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
