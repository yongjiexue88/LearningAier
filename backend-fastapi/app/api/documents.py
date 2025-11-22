"""Documents API routes"""
from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import verify_firebase_token, AuthenticatedUser
from app.models.documents import UploadProcessRequest, UploadProcessResponse
from app.services.document_service import DocumentService
from app.core.exceptions import NotFoundError, UnauthorizedError

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload-process", response_model=UploadProcessResponse)
async def upload_process(
    request: UploadProcessRequest,
    user: AuthenticatedUser = Depends(verify_firebase_token)
):
    """
    Process uploaded PDF document.
    
    Steps:
    1. Download PDF from Cloud Storage
    2. Extract text
    3. Create draft note in Firestore
    4. Chunk and embed content
    5. Store embeddings in vector DB
    """
    try:
        doc_service = DocumentService()
        
        result = await doc_service.process_upload(
            user_id=user.uid,
            document_id=request.document_id,
            file_path=request.file_path,
            chunk_size=request.chunk_size
        )
        
        return UploadProcessResponse(**result)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except UnauthorizedError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
