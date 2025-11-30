"""
Shared test fixtures for all test modules.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock, patch
from app.main import app


@pytest.fixture
def client():
    """FastAPI test client"""
    return TestClient(app)


@pytest.fixture
def mock_firebase_token():
    """Mock Firebase token verification"""
    with patch('app.core.auth.verify_firebase_token') as mock:
        mock_user = MagicMock()
        mock_user.uid = "test_user_123"
        mock_user.email = "test@example.com"
        mock.return_value = mock_user
        yield mock


@pytest.fixture
def mock_firestore():
    """Mock Firestore client"""
    with patch('app.core.firebase.get_firestore_client') as mock:
        mock_db = MagicMock()
        
        # Mock collection and document methods
        mock_collection = MagicMock()
        mock_doc = MagicMock()
        
        mock_db.collection.return_value = mock_collection
        mock_collection.document.return_value = mock_doc
        
        # Mock document snapshot
        mock_snapshot = MagicMock()
        mock_snapshot.exists = True
        mock_snapshot.to_dict.return_value = {
            "user_id": "test_user_123",
            "title": "Test Note",
            "content_md_zh": "测试内容",
            "content_md_en": "Test content"
        }
        mock_doc.get.return_value = mock_snapshot
        
        mock.return_value = mock_db
        yield mock_db


@pytest.fixture
def mock_llm_service():
    """Mock LLM service"""
    with patch('app.services.llm_service.LLMService') as mock:
        service = AsyncMock()
        service.generate_text.return_value = "Generated response"
        service.generate_embeddings.return_value = [[0.1] * 768]
        service.generate_flashcards.return_value = [
            {"term": "Test Term", "definition": "Test Definition"}
        ]
        mock.return_value = service
        yield service


@pytest.fixture
def mock_vector_service():
    """Mock Vector DB service"""
    with patch('app.services.vector_service.VectorService') as mock:
        service = AsyncMock()
        service.query_vectors.return_value = [
            {
                "id": "chunk_1",
                "score": 0.95,
                "metadata": {
                    "content": "Test content chunk",
                    "note_id": "note_123"
                }
            }
        ]
        service.upsert_vectors.return_value = None
        mock.return_value = service
        yield service


@pytest.fixture
def sample_note_data():
    """Sample note data for testing"""
    return {
        "note_id": "note_123",
        "user_id": "test_user_123",
        "title": "Test Note",
        "content_md_zh": "这是测试内容。包含中文文本。",
        "content_md_en": "This is test content. Contains English text.",
        "folder_id": "folder_123",
        "created_at": "2025-11-29T12:00:00Z",
        "updated_at": "2025-11-29T12:00:00Z"
    }


@pytest.fixture
def sample_flashcard_data():
    """Sample flashcard data for testing"""
    return {
        "flashcard_id": "card_123",
        "user_id": "test_user_123",
        "note_id": "note_123",
        "term": "Machine Learning",
        "definition": "A subset of AI that enables systems to learn from data",
        "interval": 1,
        "ease_factor": 2.5,
        "next_due_at": "2025-11-30T12:00:00Z"
    }


@pytest.fixture
def auth_headers():
    """Headers with valid auth token"""
    return {"Authorization": "Bearer mock_token_123"}
