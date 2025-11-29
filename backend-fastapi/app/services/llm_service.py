"""LLM service router - routes to Google AI or Vertex AI based on configuration"""
from typing import List, Dict, Any, Optional
from app.config import get_settings


class LLMService:
    """
    Router service that delegates to either Google AI or Vertex AI provider.
    Maintains backward compatibility by exposing the same interface as before.
    """
    
    def __init__(self):
        self.settings = get_settings()
        
        # Import and instantiate the correct provider
        if self.settings.llm_provider == "vertex_ai":
            from app.services.vertex_llm_service import VertexLLMService
            self._service = VertexLLMService()
        else:  # default to google_ai
            from app.services.google_ai_llm_service import GoogleAILLMService
            self._service = GoogleAILLMService()
    
    async def generate_chat_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        model_name: Optional[str] = None
    ):
        """Generate chat completion stream. Yields chunks of text."""
        async for chunk in self._service.generate_chat_stream(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            model_name=model_name
        ):
            yield chunk

    async def generate_chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        response_format: Optional[Dict[str, Any]] = None,
        model_name: Optional[str] = None
    ) -> str:
        """Generate chat completion."""
        return await self._service.generate_chat_completion(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            response_format=response_format,
            model_name=model_name
        )
    
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a list of texts."""
        return await self._service.generate_embeddings(texts)
    
    async def generate_query_embedding(self, query: str) -> List[float]:
        """Generate embedding for a search query."""
        return await self._service.generate_query_embedding(query)

    async def translate_text(self, text: str, target_lang: str = "en", model_name: Optional[str] = None) -> str:
        """Translate text to target language."""
        return await self._service.translate_text(
            text=text,
            target_lang=target_lang,
            model_name=model_name
        )

    async def extract_terminology(self, text: str, model_name: Optional[str] = None) -> List[Dict[str, str]]:
        """Extract bilingual terminology from text."""
        return await self._service.extract_terminology(
            text=text,
            model_name=model_name
        )

    async def generate_flashcards(self, text: str, count: int = 5, model_name: Optional[str] = None) -> List[Dict[str, str]]:
        """Generate flashcards from text."""
        return await self._service.generate_flashcards(
            text=text,
            count=count,
            model_name=model_name
        )
