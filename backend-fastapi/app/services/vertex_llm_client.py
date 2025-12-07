"""Low-level Vertex AI client wrapper for generative models and embeddings"""
from typing import List, Optional, Dict, Any, AsyncGenerator
from app.config import get_settings


class VertexLLMClient:
    """Low-level wrapper around Vertex AI SDK for LLM operations"""
    
    def __init__(self):
        self.settings = get_settings()
        # Import here to avoid dependency if not using Vertex AI
        from vertexai.generative_models import GenerativeModel
        from vertexai.language_models import TextEmbeddingModel
        
        self.GenerativeModel = GenerativeModel
        self.TextEmbeddingModel = TextEmbeddingModel
    
    async def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
        max_output_tokens: int = 2000,
        response_mime_type: Optional[str] = None,
        response_schema: Optional[Dict[str, Any]] = None,
        model_name: Optional[str] = None
    ) -> str:
        """
        Generate text using Vertex AI generative model.
        
        Args:
            prompt: User prompt
            system_instruction: Optional system instruction
            temperature: Sampling temperature (0.0 to 1.0)
            max_output_tokens: Maximum tokens to generate
            response_mime_type: Optional response format (e.g., "application/json")
            response_schema: Optional JSON schema for structured output
            model_name: Optional model name override
            
        Returns:
            Generated text
        """
        model_id = model_name or self.settings.vertex_gemini_model
        
        # Build generation config
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_output_tokens,
        }
        
        if response_mime_type:
            generation_config["response_mime_type"] = response_mime_type
        if response_schema:
            generation_config["response_schema"] = response_schema
        
        # Create model instance
        model = self.GenerativeModel(
            model_id,
            system_instruction=system_instruction if system_instruction else None
        )
        
        # Generate content (Vertex AI SDK handles async internally)
        response = await model.generate_content_async(
            prompt,
            generation_config=generation_config
        )
        
        # Validate response
        if not response.candidates:
            raise ValueError("No response candidates returned from Vertex AI model")
        
        candidate = response.candidates[0]
        finish_reason = candidate.finish_reason
        
        # Handle finish reasons (same as Google AI implementation)
        # finish_reason enum: 0=UNSPECIFIED, 1=STOP, 2=MAX_TOKENS, 3=SAFETY, 4=RECITATION, 5=OTHER
        if finish_reason == 2:  # MAX_TOKENS
            raise ValueError("Response exceeded maximum token limit. Try with shorter input.")
        elif finish_reason == 3:  # SAFETY
            raise ValueError("Response blocked by safety filters. Content may violate content policy.")
        elif finish_reason == 4:  # RECITATION
            raise ValueError("Response blocked due to potential copyrighted content detection.")
        elif finish_reason not in [0, 1]:  # Not UNSPECIFIED or STOP
            raise ValueError(f"Response generation failed with finish_reason: {finish_reason}")
        
        return response.text
    
    async def generate_text_stream(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
        max_output_tokens: int = 2000,
        model_name: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Generate text stream using Vertex AI generative model.
        
        Args:
            prompt: User prompt
            system_instruction: Optional system instruction
            temperature: Sampling temperature
            max_output_tokens: Maximum tokens to generate
            model_name: Optional model name override
            
        Yields:
            Text chunks as they are generated
        """
        model_id = model_name or self.settings.vertex_gemini_model
        
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_output_tokens,
        }
        
        model = self.GenerativeModel(
            model_id,
            system_instruction=system_instruction if system_instruction else None
        )
        
        response = await model.generate_content_async(
            prompt,
            generation_config=generation_config,
            stream=True
        )
        
        async for chunk in response:
            try:
                if chunk.text:
                    yield chunk.text
            except ValueError:
                # Handle safety blocks or other errors accessing .text
                continue
    
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts using Vertex AI.
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            List of embedding vectors
        """
        model = self.TextEmbeddingModel.from_pretrained(
            self.settings.vertex_embedding_model
        )
        
        embeddings = []
        
        # Vertex AI embedding API supports up to 250 texts per request
        # Process in a single batch
        if not texts:
            return []
            
        embedding_results = await model.get_embeddings_async(texts)
        # embedding_results is a list of TextEmbedding objects
        embeddings = [result.values for result in embedding_results]
        
        return embeddings
    
    async def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for a search query using Vertex AI.
        
        Args:
            query: Search query text
            
        Returns:
            Query embedding vector
        """
        model = self.TextEmbeddingModel.from_pretrained(
            self.settings.vertex_embedding_model
        )
        
        # For queries, we use task_type="RETRIEVAL_QUERY"
        # Note: Vertex AI's Text Embedding API uses different task types than Google AI
        embedding_result = await model.get_embeddings_async([query])
        return embedding_result[0].values
