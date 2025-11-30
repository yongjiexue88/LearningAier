"""
Integration tests for Flashcards API endpoints.
"""
import pytest
from unittest.mock import patch, AsyncMock


class TestFlashcardsAPI:
    """Test suite for /api/flashcards endpoints"""
    
    def test_generate_flashcards_success(
        self,
        client,
        mock_firebase_token,
        mock_firestore,
        auth_headers
    ):
        """Test flashcard generation endpoint"""
        # Arrange
        request_data = {
            "note_id": "note_123",
            "count": 5
        }
        
        # Mock flashcard service
        with patch('app.services.flashcard_service.FlashcardService') as mock_service:
            service_instance = AsyncMock()
            service_instance.generate_flashcards.return_value = {
                "flashcards": [
                    {
                        "term": "Machine Learning",
                        "definition": "A subset of AI that learns from data",
                        "context": "From AI fundamentals notes"
                    },
                    {
                        "term": "Neural Network",
                        "definition": "Computational model inspired by biological neurons"
                    }
                ],
                "note_id": "note_123"
            }
            mock_service.return_value = service_instance
            
            # Act
            response = client.post(
                "/api/flashcards/generate",
                json=request_data,
                headers=auth_headers
            )
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert "flashcards" in data
            assert len(data["flashcards"]) == 2
            assert data["note_id"] == "note_123"
            assert data["flashcards"][0]["term"] == "Machine Learning"
    
    def test_review_flashcard_success(
        self,
        client,
        mock_firebase_token,
        mock_firestore,
        auth_headers
    ):
        """Test flashcard review submission"""
        # Arrange
        request_data = {
            "flashcard_id": "card_123",
            "rating": 3  # Good
        }
        
        # Mock flashcard service
        with patch('app.services.flashcard_service.FlashcardService') as mock_service:
            service_instance = AsyncMock()
            service_instance.review_flashcard.return_value = {
                "success": True,
                "next_review": "2025-12-06T12:00:00Z",
                "interval": 6,
                "ease_factor": 2.6
            }
            mock_service.return_value = service_instance
            
            # Act
            response = client.post(
                "/api/flashcards/review",
                json=request_data,
                headers=auth_headers
            )
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["interval"] == 6
            assert data["ease_factor"] == 2.6
    
    def test_recommend_next_interval_ml_prediction(
        self,
        client,
        mock_firebase_token,
        auth_headers
    ):
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
        
        # Mock ML service
        with patch('app.services.ml_prediction_service.MLPredictionService') as mock_ml:
            ml_instance = AsyncMock()
            ml_instance.predict_next_interval.return_value = 12  # ML recommends 12 days
            mock_ml.return_value = ml_instance
            
            # Act
            response = client.post(
                "/api/flashcards/recommend-next",
                json=request_data,
                headers=auth_headers
            )
            
            # Assert
            assert response.status_code == 200
            data = response.json()
            assert "ml_interval" in data
            assert "sm2_interval" in data
            assert "difference" in data
            assert data["ml_interval"] == 12
    
    def test_generate_flashcards_invalid_count(
        self,
        client,
        mock_firebase_token,
        auth_headers
    ):
        """Test flashcard generation with invalid count"""
        # Arrange
        request_data = {
            "note_id": "note_123",
            "count": 25  # Exceeds max of 20
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
        client,
        mock_firebase_token,
        auth_headers
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
            json=request_data,
            headers=auth_headers
        )
        
        # Assert
        assert response.status_code ==422  # Validation error
