from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch, AsyncMock

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_ai_qa(client):
    # Test
    response = client.post(
        "/api/notes/ai-qa",
        json={"note_id": "note_1", "question": "Test Question"}
    )
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["answer"] == "This is an AI-generated answer."

def test_ai_translate(client):
    # Test
    response = client.post(
        "/api/notes/ai-translate",
        json={"note_id": "note_1", "target_lang": "en"}
    )
    
    # Assert
    assert response.status_code == 200
    assert "translated_content" in response.json()

def test_ai_terminology(client):
    # Test
    response = client.post(
        "/api/notes/ai-terminology",
        json={"note_id": "note_1"}
    )
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert len(data["terms"]) == 2
    assert data["terms"][0]["term"] == "Test Term 1"

def test_generate_flashcards(client):
    # Test
    response = client.post(
        "/api/flashcards/generate",
        json={"note_id": "note_1", "count": 5}
    )
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert len(data["flashcards"]) == 2
    assert data["flashcards"][0]["term"] == "AI"

def test_review_flashcard(client):
    # Test
    response = client.post(
        "/api/flashcards/review",
        json={"flashcard_id": "card_1", "rating": 3}
    )
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["interval"] == 12  # Mocked ML service returns 12
