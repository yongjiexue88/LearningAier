"""
Integration tests for Notes API endpoints.
"""
import pytest
from unittest.mock import patch, AsyncMock


class TestNotesAPI:
    """Test suite for /api/notes endpoints"""
    
    def test_ai_qa_success(
        self, 
        client, 
        mock_firebase_token,
        mock_firestore,
        mock_llm_service,
        mock_vector_service,
        auth_headers,
        sample_note_data
    ):
        """Test AI Q&A endpoint with successful response"""
        # Arrange
        request_data = {
            "question": "What is machine learning?",
            "note_id": "note_123",
            "top_k": 5
        }
        
        # Mock RAG service response
        with patch('app.services.rag_service.RAGService') as mock_rag:
            mock_rag_instance = AsyncMock()
            mock_rag_instance.answer_question.return_value = AsyncMock(
                answer="Machine learning is a subset of AI...",
                sources=[
                    {
                        "chunk_id": "chunk_1",
                        "note_id": "note_123",
                        "position": 0,
                        "score": 0.95,
                        "preview": "Machine learning enables..."
                    }
                ]
            )
            mock_rag.return_value = mock_rag_instance
            
            # Act
            response = client.post(
                "/api/notes/ai-qa",
                json=request_data,
                headers=auth_headers
            )
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert "answer" in data
            assert "sources" in data
            assert len(data["sources"]) > 0
    
    def test_reindex_note_success(
        self,
        client,
        mock_firebase_token,
        mock_firestore,
        mock_llm_service,
        mock_vector_service,
        auth_headers
    ):
        """Test note reindexing endpoint"""
        # Arrange
        request_data = {
            "note_id": "note_123",
            "force": False
        }
        
        # Act
        response = client.post(
            "/api/notes/reindex",
            json=request_data,
            headers=auth_headers
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["note_id"] == "note_123"
        assert data["chunks_created"] == -1  # Pending
    
    def test_translate_note_success(
        self,
        client,
        mock_firebase_token,
        mock_firestore,
        auth_headers
    ):
        """Test note translation endpoint"""
        # Arrange
        request_data = {
            "note_id": "note_123",
            "target_lang": "en"
        }
        
        # Mock note service translation
        with patch('app.services.note_service.NoteService') as mock_service:
            service_instance = AsyncMock()
            service_instance.translate_note.return_value = {
                "note_id": "note_123",
                "translated_content": "This is translated content",
                "target_language": "en"
            }
            mock_service.return_value = service_instance
            
            # Act
            response = client.post(
                "/api/notes/ai-translate",
                json=request_data,
                headers=auth_headers
            )
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["note_id"] == "note_123"
            assert data["translated_content"] is not None
            assert data["target_language"] == "en"
    
    def test_extract_terminology_success(
        self,
        client,
        mock_firebase_token,
        mock_firestore,
        auth_headers
    ):
        """Test terminology extraction endpoint"""
        # Arrange
        request_data = {
            "text": "Machine learning is a subset of AI",
            "note_id": "note_123"
        }
        
        # Mock note service
        with patch('app.services.note_service.NoteService') as mock_service:
            service_instance = AsyncMock()
            service_instance.extract_terminology.return_value = [
                {"term": "Machine Learning", "definition": "A subset of AI"},
                {"term": "AI", "definition": "Artificial Intelligence"}
            ]
            mock_service.return_value = service_instance
            
            # Act
            response = client.post(
                "/api/notes/ai-terminology",
                json=request_data,
                headers=auth_headers
            )
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert "terms" in data
            assert len(data["terms"]) == 2
            assert data["terms"][0]["term"] == "Machine Learning"
    
    def test_ai_qa_unauthorized(self, client):
        """Test AI Q&A without authentication"""
        # Arrange
        request_data = {
            "question": "What is ML?",
            "top_k": 5
        }
        
        # Act
        response = client.post("/api/notes/ai-qa", json=request_data)
        
        # Assert
        assert response.status_code == 401  # Unauthorized
