"""
Tests for GKE Document Worker Service.
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import sys
import os

# Add worker directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'worker'))


class TestPDFProcessor:
    """Test suite for PDF processing worker"""
    
    @pytest.mark.asyncio
    async def test_download_from_storage(self):
        """Test PDF download from Firebase Storage"""
        from worker.pdf_processor import PDFProcessor
        
        # Arrange
        processor = PDFProcessor()
        mock_bytes = b"PDF file content here"
        
        # Mock storage bucket
        with patch.object(processor, 'storage_bucket') as mock_bucket:
            mock_blob = MagicMock()
            mock_blob.download_as_bytes.return_value = mock_bytes
            mock_bucket.blob.return_value = mock_blob
            
            # Act
            result = await processor._download_from_storage("documents/test.pdf")
            
            # Assert
            assert result == mock_bytes
            mock_bucket.blob.assert_called_once_with("documents/test.pdf")
    
    @pytest.mark.asyncio
    async def test_extract_text_from_pdf(self):
        """Test text extraction from PDF bytes"""
        from worker.pdf_processor import PDFProcessor
        import io
        
        # Arrange
        processor = PDFProcessor()
        
        # Mock PyPDF2
        with patch('worker.pdf_processor.PyPDF2') as mock_pypdf:
            mock_reader = MagicMock()
            mock_page = MagicMock()
            mock_page.extract_text.return_value = "Sample PDF text"
            mock_reader.pages = [mock_page]
            mock_pypdf.PdfReader.return_value = mock_reader
            
            # Act
            result = await processor._extract_text_from_pdf(b"pdf bytes")
            
            # Assert
            assert "Sample PDF text" in result
    
    @pytest.mark.asyncio
    async def test_process_document_end_to_end(self):
        """Test complete document processing flow"""
        from worker.pdf_processor import PDFProcessor
        
        # Arrange
        processor = PDFProcessor()
        
        # Mock all dependencies
        with patch.object(processor, '_download_from_storage') as mock_download, \
             patch.object(processor, '_extract_text_from_pdf') as mock_extract, \
             patch.object(processor, 'db') as mock_db:
            
            mock_download.return_value = b"pdf bytes"
            mock_extract.return_value = "Extracted text content from PDF"
            
            # Mock Firestore
            mock_doc_ref = MagicMock()
            mock_db.collection.return_value.document.return_value = mock_doc_ref
            
            # Act
            result = await processor.process_document(
                document_id="doc_123",
                file_path="documents/test.pdf",
                user_id="user_123",
                extract_text=True,
                generate_embeddings=False
            )
            
            # Assert
            assert result["status"] == "success"
            assert result["document_id"] == "doc_123"
            mock_doc_ref.update.assert_called_once()


class TestWorkerHealthEndpoints:
    """Test worker service health and endpoints"""
    
    @pytest.mark.asyncio
    async def test_health_endpoint(self):
        """Test worker /health endpoint"""
        from worker.main import app
        from fastapi.testclient import TestClient
        
        # Arrange
        client = TestClient(app)
        
        # Act
        response = client.get("/health")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "document-worker"
    
    @pytest.mark.asyncio
    async def test_process_pdf_endpoint(self):
        """Test worker /process-pdf endpoint"""
        from worker.main import app
        from fastapi.testclient import TestClient
        
        # Arrange
        client = TestClient(app)
        request_data = {
            "user_id": "user_123",
            "document_id": "doc_123",
            "note_id": "note_123",
            "file_url": "gs://bucket/documents/test.pdf"
        }
        
        # Mock processor
        with patch('worker.main.PDFProcessor') as mock_processor_class:
            processor_instance = AsyncMock()
            processor_instance.process_document.return_value = {
                "status": "success",
                "document_id": "doc_123"
            }
            mock_processor_class.return_value = processor_instance
            
            # Act
            response = client.post("/process-pdf", json=request_data)
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "accepted"
            assert data["document_id"] == "doc_123"


class TestWorkerScaling:
    """Test worker autoscaling behavior"""
    
    def test_chunk_text_for_embeddings(self):
        """Test text chunking logic"""
        from worker.pdf_processor import PDFProcessor
        
        # Arrange
        processor = PDFProcessor()
        long_text = "word " * 1000  # 1000 words
        
        # Act
        chunks = processor._chunk_text(long_text, chunk_size=500, overlap=50)
        
        # Assert
        assert len(chunks) > 1
        assert all(len(chunk.split()) <= 500 for chunk in chunks)
        # Check overlap exists (last words of chunk N in first words of chunk N+1)
        if len(chunks) > 1:
            assert any(word in chunks[1] for word in chunks[0].split()[-10:])
