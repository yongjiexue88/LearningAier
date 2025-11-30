"""
Shared test fixtures for all test modules.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, AsyncMock, patch
from app.main import app


@pytest.fixture
def client():
    """FastAPI test client with dependency overrides"""
    from app.core.auth import verify_firebase_token, AuthenticatedUser, security
    from fastapi.security import HTTPAuthorizationCredentials
    
    # Override the verify_firebase_token dependency to return test user
    async def override_verify_firebase_token(
        credentials: HTTPAuthorizationCredentials = None  # Make it optional
    ) -> AuthenticatedUser:
        """Mock authenticated user that bypasses token verification"""
        return AuthenticatedUser(
            uid="test_user_123",
            email="test@example.com"
        )
    
    # Apply dependency overrides
    app.dependency_overrides[verify_firebase_token] = override_verify_firebase_token
    
    # Create client
    test_client = TestClient(app)
    
    yield test_client
    
    # Clean up
    app.dependency_overrides.clear()


# =============================================================================
# AUTO-USE GLOBAL MOCKS (applied to all tests automatically)
# =============================================================================

@pytest.fixture(autouse=True)
def mock_firestore_global():
    """Automatically mock Firestore for ALL tests"""
    with patch('app.core.firebase.get_firestore_client') as mock:
        mock_db = MagicMock()
        
        # Mock collection and document methods
        mock_collection = MagicMock()
        mock_doc = MagicMock()
        mock_query = MagicMock()
        
        # Setup collection chain
        mock_db.collection.return_value = mock_collection
        mock_collection.document.return_value = mock_doc
        mock_collection.where.return_value = mock_query
        mock_collection.order_by.return_value = mock_query
        mock_collection.limit.return_value = mock_query
        mock_collection.stream.return_value = []
        
        # Mock query methods
        mock_query.where.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.stream.return_value = []
        mock_query.get.return_value = []
        
        # Mock document snapshot
        mock_snapshot = MagicMock()
        mock_snapshot.exists = True
        mock_snapshot.id = "test_doc_123"
        mock_snapshot.to_dict.return_value = {
            "user_id": "test_user_123",
            "title": "Test Note",
            "content_md_zh": "测试内容",
            "content_md_en": "Test content"
        }
        mock_doc.get.return_value = mock_snapshot
        mock_doc.set.return_value = None
        mock_doc.update.return_value = None
        mock_doc.delete.return_value = None
        
        # Mock batch operations
        mock_batch = MagicMock()
        mock_batch.commit.return_value = None
        mock_db.batch.return_value = mock_batch
        
        mock.return_value = mock_db
        yield mock_db


@pytest.fixture(autouse=True)
def mock_firebase_auth_global():
    """Automatically mock Firebase Auth for ALL tests"""
    with patch('app.core.auth.verify_firebase_token') as mock:
        mock_user = MagicMock()
        mock_user.uid = "test_user_123"
        mock_user.email = "test@example.com"
        mock.return_value = mock_user
        yield mock


@pytest.fixture(autouse=True)
def mock_firebase_storage_global():
    """Automatically mock Firebase Storage for ALL tests"""
    with patch('app.core.firebase.get_storage_bucket') as mock:
        mock_bucket = MagicMock()
        mock_blob = MagicMock()
        mock_blob.public_url = "https://storage.example.com/test.pdf"
        mock_blob.generate_signed_url.return_value = "https://signed-url.example.com/test.pdf"
        mock_bucket.blob.return_value = mock_blob
        mock.return_value = mock_bucket
        yield mock_bucket


@pytest.fixture(autouse=True)
def mock_llm_global():
    """Automatically mock LLM service for ALL tests"""
    with patch('app.services.llm_service.LLMService') as mock_class:
        service = AsyncMock()
        service.generate_text.return_value = "Generated AI response"
        service.generate_embeddings.return_value = [[0.1] * 768]
        service.generate_query_embedding.return_value = [0.1] * 768
        service.translate_text.return_value = "Translated text"
        service.extract_terminology.return_value = [
            {"term": "Test Term", "definition": "Test Definition", "context": "Test context"}
        ]
        service.generate_flashcards.return_value = [
            {"term": "AI", "definition": "Artificial Intelligence", "example": "ML is a subset of AI"}
        ]
        service.generate_chat_completion.return_value = "This is an AI-generated answer."
        
        # Mock streaming response
        async def mock_stream():
            yield "This "
            yield "is "
            yield "streaming"
        service.generate_chat_stream.return_value = mock_stream()
        
        mock_class.return_value = service
        yield service


@pytest.fixture(autouse=True)
def mock_vector_db_global():
    """Automatically mock Vector DB (Pinecone) for ALL tests"""
    with patch('app.services.vector_service.VectorService') as mock:
        service = AsyncMock()
        service.query_vectors.return_value = [
            {
                "id": "chunk_1",
                "score": 0.95,
                "metadata": {
                    "content": "Test content chunk",
                    "note_id": "note_123",
                    "user_id": "test_user_123"
                }
            }
        ]
        service.upsert_vectors.return_value = {"upserted_count": 1}
        service.delete_vectors.return_value = None
        mock.return_value = service
        yield service


@pytest.fixture(autouse=True)
def mock_bigquery_global():
    """Automatically mock BigQuery for ALL tests"""
    with patch('google.cloud.bigquery.Client') as mock:
        client = MagicMock()
        query_job = MagicMock()
        query_job.result.return_value = []
        client.query.return_value = query_job
        mock.return_value = client
        yield client


@pytest.fixture(autouse=True)
def mock_vertex_ai_global():
    """Automatically mock Vertex AI for ALL tests"""
    with patch('google.cloud.aiplatform.Endpoint') as mock_endpoint:
        endpoint = MagicMock()
        # Mock prediction response
        prediction = MagicMock()
        prediction.predictions = [{"interval": 12, "confidence": 0.85}]
        endpoint.predict.return_value = prediction
        mock_endpoint.return_value = endpoint
        yield endpoint


# =============================================================================
# OPTIONAL FIXTURES (use when needed)
# =============================================================================

@pytest.fixture
def mock_firebase_token():
    """Mock Firebase token verification (optional, already global)"""
    with patch('app.core.auth.verify_firebase_token') as mock:
        mock_user = MagicMock()
        mock_user.uid = "test_user_123"
        mock_user.email = "test@example.com"
        mock.return_value = mock_user
        yield mock


@pytest.fixture
def mock_firestore():
    """Mock Firestore client (optional, already global)"""
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
    """Mock LLM service (optional, already global)"""
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
    """Mock Vector DB service (optional, already global)"""
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


# =============================================================================
# SAMPLE DATA FIXTURES
# =============================================================================

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
