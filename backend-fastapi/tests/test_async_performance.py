
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch, AsyncMock
from app.main import app
from app.core.auth import verify_firebase_token, AuthenticatedUser

# Mock auth
async def mock_verify_token():
    return AuthenticatedUser(uid="test_user", email="test@example.com")

app.dependency_overrides[verify_firebase_token] = mock_verify_token

client = TestClient(app)

@patch("app.api.notes.NoteService")
def test_async_reindex(MockNoteService):
    # Setup mock
    mock_service = MockNoteService.return_value
    mock_service.reindex_note = MagicMock()

    # Call endpoint
    response = client.post(
        "/api/notes/reindex",
        json={"note_id": "test_note", "force": True}
    )

    # Verify response
    if response.status_code != 200:
        print(f"Error detail: {response.text}")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["chunks_created"] == -1  # Should be pending
    assert data["note_id"] == "test_note"

    # Verify background task was NOT called synchronously (it's hard to test background tasks with TestClient directly 
    # without a bit more setup, but we can verify the service wasn't called *during* the request if we had a delay)
    # However, TestClient runs background tasks after the response is returned.
    # So we can verify it WAS called eventually.
    mock_service.reindex_note.assert_called_once()

@patch("app.api.documents.DocumentService")
def test_async_upload_process(MockDocService):
    # Setup mock
    mock_service = MockDocService.return_value
    mock_service.create_placeholder_note = AsyncMock(return_value={"note_id": "new_note_id", "title": "Untitled"})
    mock_service.process_upload_background = MagicMock()

    # Call endpoint
    response = client.post(
        "/api/documents/upload-process",
        json={"document_id": "doc_123", "file_path": "path/to/file.pdf"}
    )

    # Verify response
    if response.status_code != 200:
        print(f"Error detail: {response.json().get('detail')}")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["note_id"] == "new_note_id"
    assert data["chunks_created"] == -1
    assert data["text_preview"] == "Processing document..."

    # Verify synchronous call happened
    mock_service.create_placeholder_note.assert_called_once()
    
    # Verify background task was called
    mock_service.process_upload_background.assert_called_once()

@patch("app.api.notes.NoteService")
def test_async_reindex_all(MockNoteService):
    # Setup mock
    mock_service = MockNoteService.return_value
    mock_service.reindex_all_notes = MagicMock()

    # Call endpoint
    response = client.post("/api/notes/reindex-all")

    # Verify response
    if response.status_code != 200:
        print(f"Error detail: {response.text}")
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Reindexing started in background"

    # Verify background task was called
    mock_service.reindex_all_notes.assert_called_once()
