"""
Integration tests for Flashcards API endpoints.
"""
import pytest
from unittest.mock import patch, AsyncMock


class TestFlashcardsAPI:
    """Test suite for /api/flashcards endpoints"""
    
    def test_generate_flashcards_success(self, client):
        """Test flashcard generation endpoint"""
        # Arrange
        request_data = {
            "note_id": "note_123",
            "count": 5
        }
        
        # Act
        response = client.post(
            "/api/flashcards/generate",
            json=request_data
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "flashcards" in data
        assert len(data["flashcards"]) == 2
        assert data["note_id"] == "note_123"
        assert data["flashcards"][0]["term"] == "AI"
    
    def test_review_flashcard_success(self, client):
        """Test flashcard review submission"""
        # Arrange
        request_data = {
            "flashcard_id": "card_123",
            "rating": 3  # Good
        }
        
        # Act
        response = client.post(
            "/api/flashcards/review",
            json=request_data
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["interval"] == 12
        assert data["ease_factor"] == 2.5
    
    def test_recommend_next_interval_ml_prediction(self, client):
        """Test ML interval recommendation endpoint"""
        # Arrange
        request_data = {
            "flashcard_id": "card_123",
            "rating": 3,
            "current_interval": 6,
            "category": "Technology",
            "word_count": 15,
            "review_sequence_number": 5
        }
        
        # Act
        response = client.post(
            "/api/flashcards/recommend-next",
            json=request_data
        )
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        assert "ml_interval" in data
        assert "sm2_interval" in data
        assert "difference" in data
        assert data["ml_interval"] in [1, 2, 5, 14]  # Valid bucket mappings
    
    def test_generate_flashcards_invalid_count(self, client, auth_headers):
        """Test generating flashcards with invalid count"""
        request_data = {
            "note_id": "note_123",
            "count": 0
        }
        
        # Act
        response = client.post(
            "/api/flashcards/generate",
            json=request_data,
            headers=auth_headers
        )
        
        # Assert
        assert response.status_code == 422  # Validation error
    
    def test_review_flashcard_invalid_rating(
        self,
        client
    ):
        """Test flashcard review with invalid rating"""
        # Arrange
        request_data = {
            "flashcard_id": "card_123",
            "rating": 5  # Invalid (must be 1-4)
        }
        
        # Act
        response = client.post(
            "/api/flashcards/review",
            json=request_data
        )
        
        # Assert
        assert response.status_code == 422  # Validation error

