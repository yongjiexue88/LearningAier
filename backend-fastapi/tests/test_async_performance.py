import pytest
from unittest.mock import MagicMock, patch, AsyncMock

@patch("app.api.notes.NoteService")
def test_async_reindex(MockNoteService, client):
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

    # Verify background task was called
    mock_service.reindex_note.assert_called_once()

@patch("app.api.documents.DocumentService")
def test_async_upload_process(MockDocService, client):
    # Setup mock
    mock_service = MockDocService.return_value
    mock_service.create_placeholder_note = AsyncMock(return_value={"note_id": "new_note_id", "title": "Untitled"})
    mock_service.process_upload_via_worker = MagicMock()

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
    mock_service.process_upload_via_worker.assert_called_once()

@patch("app.api.notes.NoteService")
def test_async_reindex_all(MockNoteService, client):
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
