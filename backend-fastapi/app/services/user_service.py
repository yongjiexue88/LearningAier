"""User service for user profile and settings operations"""
from typing import Optional, Dict, Any
from app.core.firebase import get_firestore_client
from app.config import get_settings

class UserService:
    """Service for user-related operations"""
    
    def __init__(self):
        self.db = get_firestore_client()
        self.settings = get_settings()
    
    async def get_user_settings(self, user_id: str) -> Dict[str, Any]:
        """
        Fetch user settings from Firestore profile.
        
        Args:
            user_id: User ID
            
        Returns:
            Dict containing user settings (llm_model, etc.)
        """
        import asyncio
        try:
            doc_ref = self.db.collection("profiles").document(user_id)
            # Run blocking I/O in threadpool
            doc = await asyncio.to_thread(doc_ref.get)
            
            if doc.exists:
                data = doc.to_dict()
                print(f"[UserService] Fetched settings for {user_id}: {data}")
                return data
            print(f"[UserService] No profile found for {user_id}")
            return {}
        except Exception as e:
            print(f"[UserService] Error fetching user settings: {e}")
            return {}

    async def get_preferred_model(self, user_id: str) -> str:
        """
        Get user's preferred LLM model, falling back to default.
        """
        settings = await self.get_user_settings(user_id)
        model = settings.get("llm_model") or self.settings.llm_model
        print(f"[UserService] Preferred model for {user_id}: {model}")
        return model
