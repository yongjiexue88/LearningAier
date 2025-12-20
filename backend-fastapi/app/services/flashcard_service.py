"""Flashcard service for generation and review scheduling"""
from datetime import datetime, timedelta, timezone
from app.core.firebase import get_firestore_client
from app.services.llm_service import LLMService
from app.core.exceptions import NotFoundError, UnauthorizedError
from app.services.prompt_templates import get_prompt
from app.services.llm_monitoring import LLMMonitor
from app.services.ab_experiment import (
    is_experiment_active,
    assign_variant,
    get_experiment_prompt,
    log_experiment_event,
    ExperimentEvent
)
import time


class FlashcardService:
    """Service for flashcard operations"""
    
    def __init__(self):
        self.db = get_firestore_client()
        self.llm_service = LLMService()
        # Import here to avoid circular dependency
        from app.services.analytics_service import AnalyticsService
        self.analytics_service = AnalyticsService()
    
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
        content = (note_data.get("content_md_zh", "") or "") + "\n" + (note_data.get("content_md_en", "") or "")
        
        if not content.strip():
            print(f"[WARN] Note {note_id} has empty content. Skipping flashcard generation.")
            return {
                "flashcards": [],
                "note_id": note_id
            }
        
        # 3. A/B Test: Check if flashcard prompt experiment is active
        template_name = "flashcard_generator_v2"  # Default
        variant = None
        
        if is_experiment_active("flashcard_prompt_test"):
            variant = assign_variant(user_id, "flashcard_prompt_test")
            experiment_template = get_experiment_prompt("flashcard_prompt_test", variant)
            if experiment_template:
                template_name = experiment_template
                log_experiment_event(
                    user_id,
                    "flashcard_prompt_test",
                    variant,
                    ExperimentEvent.ASSIGNMENT
                )
                print(f"[A/B] User {user_id} assigned variant {variant}, using {template_name}")
        
        # 4. Start monitoring
        monitor = LLMMonitor(user_id=user_id)
        start_time = time.time()
        
        # Get prompt with version
        prompt_text, prompt_version = get_prompt(template_name, count=count, text=content)
        
        # Log request
        monitor.log_prompt_request(
            feature="flashcards",
            prompt_template_name=template_name,
            prompt_version=prompt_version,
            model_name="gemini-2.5-flash",
            additional_data={
                "note_id": note_id,
                "flashcard_count": count,
                "content_length": len(content),
                "experiment_variant": variant
            }
        )
        
        # 5. Generate with LLM
        try:
            cards_data = await self.llm_service.generate_flashcards(content, count)
            
            # Log successful response
            latency_ms = int((time.time() - start_time) * 1000)
            monitor.start_time = start_time
            monitor.log_prompt_response(
                token_count=len(prompt_text.split()) + sum(len(str(card)) for card in cards_data),
                success=True,
                additional_data={
                    "flashcards_generated": len(cards_data)
                }
            )
            
            # Log A/B experiment generation event
            if variant:
                log_experiment_event(
                    user_id,
                    "flashcard_prompt_test",
                    variant,
                    ExperimentEvent.GENERATION,
                    {"flashcards_count": len(cards_data), "latency_ms": latency_ms}
                )
                
        except Exception as e:
            print(f"[ERROR] LLM generation failed: {e}")
            # Log failed response
            monitor.log_prompt_response(
                success=False,
                error=str(e)
            )
            raise e
        
        # 4. Save to Firestore
        batch = self.db.batch()
        flashcards_collection = self.db.collection("flashcards")
        
        print(f"[DEBUG] LLM Output: {cards_data}")  # Debug logging

        created_cards = []
        for card in cards_data:
            try:
                new_card_ref = flashcards_collection.document()
                card_doc = {
                    "user_id": user_id,
                    "note_id": note_id,
                    "term": card["term"],
                    "definition": card["definition"],
                    "context": card.get("context"),
                    "status": "new",
                    "interval": 0,
                    "ease_factor": 2.5,
                    "next_review": datetime.now(timezone.utc),
                    "created_at": datetime.now(timezone.utc),
                    "category": "vocabulary"
                }
                batch.set(new_card_ref, card_doc)
                created_cards.append(card)
            except KeyError as e:
                print(f"[ERROR] Missing key in flashcard data: {e}, Data: {card}")
                continue
            except Exception as e:
                print(f"[ERROR] Failed to process flashcard: {e}, Data: {card}")
                continue
            
        batch.commit()
        
        return {
            "flashcards": created_cards,
            "note_id": note_id
        }

    async def review_flashcard(self, user_id: str, flashcard_id: str, rating: int) -> dict:
        """
        Process flashcard review using ML prediction with SM-2 fallback.
        Rating: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # 1. Fetch flashcard
        card_ref = self.db.collection("flashcards").document(flashcard_id)
        card_doc = card_ref.get()
        
        if not card_doc.exists:
            raise NotFoundError(f"Flashcard {flashcard_id} not found")
            
        card_data = card_doc.to_dict()
        if card_data.get("user_id") != user_id:
            raise UnauthorizedError("Unauthorized access to flashcard")
            
        # 2. Calculate SM-2 interval as fallback
        current_interval = card_data.get("interval", 0)
        current_ease = card_data.get("ease_factor", 2.5)
        
        if rating == 1:  # Again
            sm2_interval = 0
            new_ease = max(1.3, current_ease - 0.2)
        else:
            if current_interval == 0:
                sm2_interval = 1
            elif current_interval == 1:
                sm2_interval = 6
            else:
                sm2_interval = int(current_interval * current_ease)
            
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

        # 3. Try ML prediction
        new_interval = sm2_interval  # Default to SM-2
        ml_used = False
        
        try:
            # Get review count for this flashcard
            reviews_ref = self.db.collection("flashcard_reviews").where("flashcard_id", "==", flashcard_id)
            review_count = len(list(reviews_ref.stream()))
            
            # Get user's average rating
            user_reviews_ref = self.db.collection("flashcard_reviews").where("user_id", "==", user_id)
            user_ratings = [r.to_dict().get("rating", 3) for r in user_reviews_ref.stream()]
            user_avg_rating = sum(user_ratings) / len(user_ratings) if user_ratings else 3.0
            
            # Calculate word count from term + definition
            term = card_data.get("term", "")
            definition = card_data.get("definition", "")
            word_count = len(term.split()) + len(definition.split())
            
            # Prepare ML features
            from app.services.ml_prediction_service import MLPredictionService
            ml_service = MLPredictionService()
            
            ml_features = {
                'category': card_data.get('category', 'vocabulary'),
                'word_count': word_count,
                'rating': rating,
                'review_sequence_number': review_count + 1,
                'current_interval': current_interval,
                'user_avg_rating': user_avg_rating
            }
            
            ml_interval = await ml_service.predict_next_interval(ml_features)
            
            if ml_interval is not None:
                new_interval = ml_interval
                ml_used = True
                logger.info(f"Using ML prediction: {ml_interval} days (SM-2 would be: {sm2_interval})")
            else:
                logger.warning(f"ML returned None, falling back to SM-2: {sm2_interval} days")
                
        except Exception as e:
            logger.error(f"ML prediction failed: {e}, falling back to SM-2: {sm2_interval} days")

        # Calculate next review date
        if new_interval == 0:
            # If failed, review again in 10 minutes (or same day)
            next_review = datetime.now(timezone.utc) + timedelta(minutes=10)
        else:
            next_review = datetime.now(timezone.utc) + timedelta(days=new_interval)
            
        # 4. Update Firestore
        update_data = {
            "interval": new_interval,
            "ease_factor": new_ease,
            "next_review": next_review,
            "last_reviewed": datetime.now(timezone.utc),
            "status": "learning" if new_interval == 0 else "review",
            "ml_scheduled": ml_used  # Track if ML was used
        }
        
        card_ref.update(update_data)
        
        # 5. Store review
        review_ref = self.db.collection("flashcard_reviews").document()
        review_ref.set({
            "flashcard_id": flashcard_id,
            "user_id": user_id,
            "rating": rating,
            "reviewed_at": datetime.now(timezone.utc),
            "scheduled_interval": new_interval,
            "ml_used": ml_used,
            "sm2_interval": sm2_interval  # Log SM-2 for comparison
        })
        
        # Invalidate analytics cache for this user
        await self.analytics_service.invalidate_user_cache(user_id)
        
        # 6. Return result
        return {
            "success": True,
            "flashcard_id": flashcard_id,
            "next_review": next_review.isoformat(),
            "interval": new_interval,
            "ease_factor": new_ease
        }

    async def get_all_flashcards(self, user_id: str) -> list[dict]:
        """
        Get all flashcards for a user.
        """
        cards_ref = self.db.collection("flashcards").where("user_id", "==", user_id)
        cards = []
        for doc in cards_ref.stream():
            card_data = doc.to_dict()
            card_data["id"] = doc.id
            cards.append(card_data)
        return cards
