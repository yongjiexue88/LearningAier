"""LLM service for chat completions and embeddings"""
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from app.config import get_settings


class LLMService:
    """Service for LLM operations (chat, embeddings)"""
    
    def __init__(self):
        self.settings = get_settings()
        
        if self.settings.llm_provider == "gemini":
            genai.configure(api_key=self.settings.llm_api_key)
            self.chat_model = genai.GenerativeModel(self.settings.llm_model)
            self.embedding_model = f"models/{self.settings.embeddings_model}"
    
    async def generate_chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        response_format: Optional[Dict[str, Any]] = None,
        model_name: Optional[str] = None
    ) -> str:
        """
        Generate chat completion.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            max_tokens: Maximum tokens to generate
            response_format: Optional JSON schema for structured output
            model_name: Optional model name to override default
            
        Returns:
            Generated text response
        """
        if self.settings.llm_provider == "gemini":
            # Convert messages to Gemini format
            prompt = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
            
            generation_config = {
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            }
            
            if response_format:
                generation_config["response_mime_type"] = "application/json"
                generation_config["response_schema"] = response_format
            
            # Use specific model if provided, otherwise default
            model = self.chat_model
            if model_name:
                model = genai.GenerativeModel(model_name)

            response = await model.generate_content_async(
                prompt,
                generation_config=generation_config
            )
            
            # Check if response was blocked
            if not response.candidates:
                raise ValueError("No response candidates returned from the model")
            
            candidate = response.candidates[0]
            finish_reason = candidate.finish_reason
            
            # Handle different finish reasons
            if finish_reason == 2:  # MAX_TOKENS
                raise ValueError("Response exceeded maximum token limit. Try with shorter input.")
            elif finish_reason == 3:  # SAFETY
                raise ValueError("Response blocked by safety filters. Content may violate content policy.")
            elif finish_reason == 4:  # RECITATION
                raise ValueError("Response blocked due to potential copyrighted content detection.")
            elif finish_reason not in [0, 1]:  # Not UNSPECIFIED or STOP
                raise ValueError(f"Response generation failed with finish_reason: {finish_reason}")
            
            return response.text
        
        raise NotImplementedError(f"Provider {self.settings.llm_provider} not implemented")
    
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts.
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            List of embedding vectors
        """
        if self.settings.embeddings_provider == "gemini":
            embeddings = []
            for text in texts:
                result = genai.embed_content(
                    model=self.embedding_model,
                    content=text,
                    task_type="retrieval_document"
                )
                embeddings.append(result["embedding"])
            return embeddings
        
        raise NotImplementedError(f"Provider {self.settings.embeddings_provider} not implemented")
    
    async def generate_query_embedding(self, query: str) -> List[float]:
        """
        Generate embedding for a search query.
        
        Args:
            query: Search query text
            
        Returns:
            Query embedding vector
        """
        if self.settings.embeddings_provider == "gemini":
            result = genai.embed_content(
                model=self.embedding_model,
                content=query,
                task_type="retrieval_query"
            )
            return result["embedding"]
        
        raise NotImplementedError(f"Provider {self.settings.embeddings_provider} not implemented")

    async def translate_text(self, text: str, target_lang: str = "en", model_name: Optional[str] = None) -> str:
        """
        Translate text to target language.
        """
        prompt = f"""Translate the following text to {target_lang}. 
        Maintain the original formatting (Markdown).
        Only output the translated text.

        Text:
        {text}
        """
        
        messages = [{"role": "user", "content": prompt}]
        return await self.generate_chat_completion(messages, model_name=model_name)

    async def extract_terminology(self, text: str, model_name: Optional[str] = None) -> List[Dict[str, str]]:
        """
        Extract bilingual terminology from text.
        Returns list of dicts with 'term', 'definition', 'translation'.
        """
        prompt = """Extract key technical terms from the text.
        For each term, provide:
        - The term itself
        - A brief definition (in the same language as the text)
        
        Output JSON format:
        [
            {"term": "...", "definition": "..."}
        ]
        """
        
        messages = [{"role": "user", "content": prompt + "\\n\\nText:\\n" + text}]
        
        # Define schema for structured output
        schema = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "term": {"type": "string"},
                    "definition": {"type": "string"}
                },
                "required": ["term", "definition"]
            }
        }
        
        response = await self.generate_chat_completion(
            messages, 
            response_format=schema,
            model_name=model_name
        )
        
        import json
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return []

    async def generate_flashcards(self, text: str, count: int = 5, model_name: Optional[str] = None) -> List[Dict[str, str]]:
        """
        Generate flashcards from text.
        Returns list of dicts with 'front' and 'back'.
        """
        prompt = f"""Generate {count} flashcards based on the text.
        Focus on key concepts, definitions, and important details.
        
        Output JSON format:
        [
            {{"term": "Concept or term", "definition": "Clear definition", "context": "Optional context or usage example"}}
        ]
        """
        
        messages = [{"role": "user", "content": prompt + "\\n\\nText:\\n" + text}]
        
        schema = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "term": {"type": "string"},
                    "definition": {"type": "string"},
                    "context": {"type": "string"}
                },
                "required": ["term", "definition"]
            }
        }
        
        response = await self.generate_chat_completion(
            messages, 
            response_format=schema,
            model_name=model_name
        )
        
        import json
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            return []
