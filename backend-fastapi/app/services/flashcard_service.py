"""Flashcard service for generation and review scheduling"""
from datetime import datetime, timedelta, timezone
from app.core.firebase import get_firestore_client
from app.services.llm_service import LLMService
from app.core.exceptions import NotFoundError, UnauthorizedError


class FlashcardService:
    """Service for flashcard operations"""
    
    def __init__(self):
        self.db = get_firestore_client()
        self.llm_service = LLMService()
    
    async def generate_flashcards(self, user_id: str, note_id: str, count: int = 5) -> dict:
        """
        Generate flashcards from a note.
        """
        # 1. Fetch note
        note_ref = self.db.collection("notes").document(note_id)
        note_doc = note_ref.get()
        
        if not note_doc.exists:
            raise NotFoundError(f"Note {note_id} not found")
            
        note_data = note_doc.to_dict()
        if note_data.get("user_id") != user_id:
            raise UnauthorizedError("Unauthorized access to note")
            
        # 2. Get content
        content = note_data.get("content_md_zh", "") + "\n" + note_data.get("content_md_en", "")
        
        # 3. Generate with LLM
        cards_data = await self.llm_service.generate_flashcards(content, count)
        
        # 4. Save to Firestore
        batch = self.db.batch()
        flashcards_collection = self.db.collection("flashcards")
        
        created_cards = []
        for card in cards_data:
            new_card_ref = flashcards_collection.document()
            card_doc = {
                "user_id": user_id,
                "note_id": note_id,
                "front": card["front"],
                "back": card["back"],
                "status": "new",
                "interval": 0,
                "ease_factor": 2.5,
                "next_review": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc)
            }
            batch.set(new_card_ref, card_doc)
            created_cards.append(card)
            
        batch.commit()
        
        return {
            "flashcards": created_cards,
            "note_id": note_id
        }

    async def review_flashcard(self, user_id: str, flashcard_id: str, rating: int) -> dict:
        """
        Process flashcard review using SM-2 algorithm.
        Rating: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
        """
        # 1. Fetch flashcard
        card_ref = self.db.collection("flashcards").document(flashcard_id)
        card_doc = card_ref.get()
        
        if not card_doc.exists:
            raise NotFoundError(f"Flashcard {flashcard_id} not found")
            
        card_data = card_doc.to_dict()
        if card_data.get("user_id") != user_id:
            raise UnauthorizedError("Unauthorized access to flashcard")
            
        # 2. Calculate new schedule (Simplified SM-2)
        current_interval = card_data.get("interval", 0)
        current_ease = card_data.get("ease_factor", 2.5)
        
        if rating == 1:  # Again
            new_interval = 0
            new_ease = max(1.3, current_ease - 0.2)
        else:
            if current_interval == 0:
                new_interval = 1
            elif current_interval == 1:
                new_interval = 6
            else:
                new_interval = int(current_interval * current_ease)
            
            # Adjust ease factor
            # SM-2 formula: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
            # Mapping our 1-4 to SM-2's 0-5 scale roughly:
            # 1->0 (Fail), 2->3 (Pass hard), 3->4 (Pass good), 4->5 (Pass easy)
            q = 0
            if rating == 2: q = 3
            elif rating == 3: q = 4
            elif rating == 4: q = 5
            
            new_ease = current_ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
            new_ease = max(1.3, new_ease)

        # Calculate next review date
        if new_interval == 0:
            # If failed, review again in 10 minutes (or same day)
            next_review = datetime.now(timezone.utc) + timedelta(minutes=10)
        else:
            next_review = datetime.now(timezone.utc) + timedelta(days=new_interval)
            
        # 3. Update Firestore
        update_data = {
            "interval": new_interval,
            "ease_factor": new_ease,
            "next_review": next_review,
            "last_reviewed": datetime.now(timezone.utc),
            "status": "learning" if new_interval == 0 else "review"
        }
        
        card_ref.update(update_data)
        
        # 4. Log review history
        review_ref = self.db.collection("flashcard_reviews").document()
        review_ref.set({
            "flashcard_id": flashcard_id,
            "user_id": user_id,
            "rating": rating,
            "reviewed_at": datetime.now(timezone.utc),
            "scheduled_interval": new_interval
        })
        
        return {
            "success": True,
            "next_review": next_review.isoformat(),
            "interval": new_interval,
            "ease_factor": new_ease
        }
