from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch, AsyncMock

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

@patch("app.api.notes.UserService")
@patch("app.api.notes.RAGService")
def test_ai_qa(mock_rag_cls, mock_user_cls, client):
    # Setup Mock
    mock_rag = mock_rag_cls.return_value
    mock_rag.answer_question = AsyncMock(return_value=MagicMock(
        answer="Test Answer",
        sources=[]
    ))
    
    mock_user = mock_user_cls.return_value
    mock_user.get_preferred_model = AsyncMock(return_value="gemini-1.5-flash")
    
    # Test
    response = client.post(
        "/api/notes/ai-qa",
        json={"note_id": "note_1", "question": "Test Question"}
    )
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["answer"] == "Test Answer"

def test_ai_translate(client):
    # Test
    response = client.post(
        "/api/notes/ai-translate",
        json={"note_id": "note_1", "target_lang": "en"}
    )
    
    # Assert
    assert response.status_code == 200
    assert "translated_text" in response.json()

@patch("app.api.notes.UserService")
@patch("app.api.notes.NoteService")
def test_ai_terminology(mock_note_cls, mock_user_cls, client):
    # Setup Mock
    mock_note = mock_note_cls.return_value
    mock_note.extract_terminology = AsyncMock(return_value=[
        {"term": "AI", "definition": "Artificial Intelligence"}
    ])
    
    mock_user = mock_user_cls.return_value
    mock_user.get_preferred_model = AsyncMock(return_value="gemini-1.5-flash")
    
    # Test
    response = client.post(
        "/api/notes/ai-terminology",
        json={"note_id": "note_1"}
    )
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert len(data["terms"]) == 1
    assert data["terms"][0]["term"] == "AI"

@patch("app.api.flashcards.FlashcardService")
def test_generate_flashcards(mock_flash_cls, client):
    # Setup Mock with async method
    mock_flash = mock_flash_cls.return_value
    mock_flash.generate_flashcards = AsyncMock(return_value={
        "flashcards": [{"front": "Q", "back": "A"}],
        "note_id": "note_1"
    })
    
    # Test
    response = client.post(
        "/api/flashcards/generate",
        json={"note_id": "note_1", "count": 5}
    )
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert len(data["flashcards"]) == 1
    assert data["flashcards"][0]["front"] == "Q"

@patch("app.api.flashcards.FlashcardService")
def test_review_flashcard(mock_flash_cls, client):
    # Setup Mock with async method
    mock_flash = mock_flash_cls.return_value
    mock_flash.review_flashcard = AsyncMock(return_value={
        "success": True,
        "next_review": "2025-01-01T00:00:00Z",
        "interval": 1,
        "ease_factor": 2.6
    })
    
    # Test
    response = client.post(
        "/api/flashcards/review",
        json={"flashcard_id": "card_1", "rating": 3}
    )
    
    # Assert
    assert response.status_code == 200
    assert response.json()["success"] is True
