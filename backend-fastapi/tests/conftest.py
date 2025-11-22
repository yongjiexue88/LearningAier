import pytest
import os
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import json

# Set test environment variables before importing app
test_creds = {
    "type": "service_account",
    "project_id": "test-project",
    "private_key_id": "test-key-id",
    "private_key": "-----BEGIN PRIVATE KEY-----\\ntest_key\\n-----END PRIVATE KEY-----\\n",
    "client_email": "test@test-project.iam.gserviceaccount.com",
    "client_id": "123456789",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
}
os.environ["FIREBASE_PROJECT_ID"] = "test-project"
os.environ["FIREBASE_STORAGE_BUCKET"] = "test-bucket"
os.environ["FIREBASE_CREDENTIALS_JSON"] = json.dumps(test_creds)
os.environ["LLM_API_KEY"] = "test-llm-key"
os.environ["EMBEDDINGS_API_KEY"] = "test-embed-key"
os.environ["PINECONE_API_KEY"] = "test-pinecone-key"

# Mock Firebase credentials and initialization BEFORE importing anything
import firebase_admin
from firebase_admin import credentials

# Create a mock credential
mock_cred = MagicMock()
original_certificate = credentials.Certificate

def mock_certificate(*args, **kwargs):
    return mock_cred

# Patch Certificate globally
credentials.Certificate = mock_certificate

# Mock initialize_app and other firebase functions
firebase_admin.initialize_app = MagicMock(return_value=MagicMock())

# Now import the app
from app.main import app
from app.core.auth import verify_firebase_token, AuthenticatedUser

# Mock User
mock_user = AuthenticatedUser(uid="test_user_123", email="test@example.com")

# Override Auth Dependency
async def override_auth():
    return mock_user

app.dependency_overrides[verify_firebase_token] = override_auth

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def mock_firestore():
    with patch("app.services.note_service.get_firestore_client") as mock:
        yield mock

@pytest.fixture
def mock_llm_service():
    with patch("app.services.note_service.LLMService") as mock:
        yield mock.return_value

@pytest.fixture
def mock_vector_service():
    with patch("app.services.note_service.VectorService") as mock:
        yield mock.return_value
