"""Document service for PDF processing"""
from app.core.firebase import get_firestore_client, get_storage_bucket
from app.services.pdf_service import PDFService
from app.services.llm_service import LLMService
from app.services.vector_service import VectorService
from app.core.exceptions import NotFoundError, UnauthorizedError
from google.cloud.firestore import SERVER_TIMESTAMP
import tempfile
import os


class DocumentService:
    """Service for document processing operations"""
    
    def __init__(self):
        self.db = get_firestore_client()
        self.bucket = get_storage_bucket()
        self.pdf_service = PDFService()
        self.llm_service = LLMService()
        self.vector_service = VectorService()
    
    async def process_upload(
        self,
        user_id: str,
        document_id: str,
        file_path: str,
        chunk_size: int = 500
    ) -> dict:
        """
        Process uploaded PDF document:
        1. Download from Cloud Storage
        2. Extract text
        3. Create draft note
        4. Chunk and embed content
        5. Store in vector DB
        
        Args:
            user_id: User ID for authorization
            document_id: Document ID in Firestore
            file_path: Cloud Storage path
            chunk_size: Size of text chunks
            
        Returns:
            Dict with success, document_id, note_id, chunks_created, text_preview
        """
        # 1. Verify document ownership
        doc_ref = self.db.collection("documents").document(document_id)
        doc_snapshot = doc_ref.get()
        
        if not doc_snapshot.exists:
            raise NotFoundError(f"Document {document_id} not found")
        
        doc_data = doc_snapshot.to_dict()
        
        if doc_data.get("user_id") != user_id:
            raise UnauthorizedError("Unauthorized access to document")
        
        # 2. Download PDF from Cloud Storage
        blob = self.bucket.blob(file_path)
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            blob.download_to_filename(tmp_file.name)
            pdf_path = tmp_file.name
        
        try:
            # 3. Extract text
            extracted_text = await self.pdf_service.extract_text(pdf_path)
            
            # 4. Create draft note in Firestore
            note_ref = self.db.collection("notes").document()
            note_id = note_ref.id
            
            note_data = {
                "user_id": user_id,
                "folder_id": doc_data.get("folder_id"),
                "title": doc_data.get("title", "Untitled"),
                "content_md_zh": extracted_text,
                "content_md_en": "",
                "word_count": len(extracted_text.split()),
                "created_at": SERVER_TIMESTAMP,
                "updated_at": SERVER_TIMESTAMP
            }
            
            note_ref.set(note_data)
            
            # 5. Chunk and embed
            chunks = self._chunk_text(extracted_text, chunk_size)
            embeddings = await self.llm_service.generate_embeddings(chunks)
            
            vectors = []
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                vectors.append({
                    "id": f"{note_id}_chunk_{i}",
                    "values": embedding,
                    "metadata": {
                        "user_id": user_id,
                        "note_id": note_id,
                        "document_id": document_id,
                        "content": chunk,
                        "position": i
                    }
                })
            
            await self.vector_service.upsert_vectors(vectors)
            
            return {
                "success": True,
                "document_id": document_id,
                "note_id": note_id,
                "chunks_created": len(chunks),
                "text_preview": extracted_text[:500]
            }
        
        finally:
            # Clean up temp file
            if os.path.exists(pdf_path):
                os.unlink(pdf_path)
    
    def _chunk_text(self, text: str, chunk_size: int) -> list[str]:
        """Chunk text with overlap"""
        chunks = []
        overlap = chunk_size // 4
        for i in range(0, len(text), chunk_size - overlap):
            chunk = text[i:i + chunk_size].strip()
            if chunk:
                chunks.append(chunk)
        return chunks
