"""PDF processing module for worker service"""
import logging
import tempfile
import os
from typing import Dict, Any, Optional
import PyPDF2
import io

logger = logging.getLogger(__name__)


class PDFProcessor:
    """Handles PDF document processing"""
    
    def __init__(self):
        """Initialize PDF processor with Firebase and LLM clients"""
        # Import here to avoid issues if not in GKE environment
        try:
            import firebase_admin
            from firebase_admin import credentials, firestore, storage
            from google.cloud import storage as gcs_storage
            
            # Initialize Firebase if not already initialized
            if not firebase_admin._apps:
                # Use default credentials in GKE (Workload Identity)
                firebase_admin.initialize_app()
            
            self.db = firestore.client()
            self.storage_bucket = storage.bucket()
            logger.info("Firebase initialized successfully")
        except Exception as e:
            logger.warning(f"Firebase initialization failed: {e}")
            self.db = None
            self.storage_bucket = None
    
    async def process_document(
        self,
        document_id: str,
        file_path: str,
        user_id: str,
        extract_text: bool = True,
        generate_embeddings: bool = True
    ):
        """
        Process a PDF document end-to-end.
        
        Args:
            document_id: Firestore document ID
            file_path: Firebase Storage path (e.g., "documents/user123/file.pdf")
            user_id: User ID for ownership
            extract_text: Whether to extract text from PDF
            generate_embeddings: Whether to generate embeddings
        """
        try:
            logger.info(f"Processing document {document_id} for user {user_id}")
            
            # Step 1: Download PDF from Firebase Storage
            pdf_bytes = await self._download_from_storage(file_path)
            
            # Step 2: Extract text
            extracted_text = ""
            if extract_text:
                extracted_text = await self._extract_text_from_pdf(pdf_bytes)
                logger.info(f"Extracted {len(extracted_text)} characters from PDF")
            
            # Step 3: Update Firestore with extracted text
            if self.db and extracted_text:
                doc_ref = self.db.collection('documents').document(document_id)
                doc_ref.update({
                    'content': extracted_text,
                    'processing_status': 'completed',
                    'text_length': len(extracted_text)
                })
                logger.info(f"Updated Firestore document {document_id}")
            
            # Step 4: Generate embeddings (if requested)
            if generate_embeddings and extracted_text:
                from worker.embedding_worker import EmbeddingWorker
                worker = EmbeddingWorker()
                
                # Split text into chunks (simplified - use proper chunking in production)
                chunks = self._chunk_text(extracted_text, chunk_size=500)
                embeddings = await worker.generate_bulk_embeddings(chunks)
                
                # Store embeddings in Pinecone (via vector service)
                await self._store_embeddings(document_id, user_id, chunks, embeddings)
                logger.info(f"Generated and stored {len(embeddings)} embeddings")
            
            logger.info(f"Successfully processed document {document_id}")
            return {
                "status": "success",
                "document_id": document_id,
                "text_length": len(extracted_text)
            }
            
        except Exception as e:
            logger.error(f"Error processing document {document_id}: {e}", exc_info=True)
            
            # Update Firestore with error status
            if self.db:
                doc_ref = self.db.collection('documents').document(document_id)
                doc_ref.update({
                    'processing_status': 'failed',
                    'error': str(e)
                })
            
            raise
    
    async def _download_from_storage(self, file_path: str) -> bytes:
        """Download file from Firebase Storage"""
        try:
            blob = self.storage_bucket.blob(file_path)
            pdf_bytes = blob.download_as_bytes()
            logger.info(f"Downloaded {len(pdf_bytes)} bytes from {file_path}")
            return pdf_bytes
        except Exception as e:
            logger.error(f"Error downloading from storage: {e}")
            raise
    
    async def _extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        """Extract text from PDF bytes using PyPDF2"""
        try:
            pdf_file = io.BytesIO(pdf_bytes)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            text_parts = []
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text_parts.append(page.extract_text())
            
            full_text = "\n\n".join(text_parts)
            return full_text.strip()
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            raise
    
    def _chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
        """
        Split text into overlapping chunks.
        Simple implementation - use proper semantic chunking in production.
        """
        chunks = []
        words = text.split()
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i:i + chunk_size])
            if chunk:
                chunks.append(chunk)
        
        return chunks
    
    async def _store_embeddings(
        self,
        document_id: str,
        user_id: str,
        chunks: list[str],
        embeddings: list[list[float]]
    ):
        """Store embeddings in Pinecone via vector service"""
        # This would call the vector service to store in Pinecone
        # For now, just log
        logger.info(f"Would store {len(embeddings)} embeddings for document {document_id}")
        
        # TODO: Implement actual Pinecone storage
        # This could use the existing vector_service from the main backend
        pass
