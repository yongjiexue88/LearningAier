"""Vertex AI LLM service for domain-specific operations"""
from typing import List, Dict, Any, Optional
from app.services.vertex_llm_client import VertexLLMClient


class VertexLLMService:
    """Service for LLM operations using Vertex AI (chat, embeddings)"""
    
    def __init__(self):
        self.client = VertexLLMClient()
    
    async def generate_chat_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2000,
        model_name: Optional[str] = None
    ):
        """
        Generate chat completion stream.
        Yields chunks of text.
        """
        # Convert messages to simple prompt
        # Separate system message if present
        system_instruction = None
        user_messages = []
        
        for msg in messages:
            if msg.get("role") == "system":
                system_instruction = msg.get("content", "")
            else:
                user_messages.append(f"{msg['role']}: {msg['content']}")
        
        prompt = "\n".join(user_messages)
        
        async for chunk in self.client.generate_text_stream(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=temperature,
            max_output_tokens=max_tokens,
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
        """
        Generate chat completion.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            response_format: Optional JSON schema for structured output
            model_name: Optional model name to override default
            
        Returns:
            Generated text response
        """
        # Convert messages to prompt format
        # Separate system message if present
        system_instruction = None
        user_messages = []
        
        for msg in messages:
            if msg.get("role") == "system":
                system_instruction = msg.get("content", "")
            else:
                user_messages.append(f"{msg['role']}: {msg['content']}")
        
        prompt = "\n".join(user_messages)
        
        # Prepare response format for structured output
        response_mime_type = None
        response_schema = None
        if response_format:
            response_mime_type = "application/json"
            response_schema = response_format
        
        return await self.client.generate_text(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=temperature,
            max_output_tokens=max_tokens,
            response_mime_type=response_mime_type,
            response_schema=response_schema,
            model_name=model_name
        )
    
    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts.
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            List of embedding vectors
        """
        return await self.client.embed_texts(texts)
    
    async def generate_query_embedding(self, query: str) -> List[float]:
        """
        Generate embedding for a search query.
        
        Args:
            query: Search query text
            
        Returns:
            Query embedding vector
        """
        return await self.client.embed_query(query)

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
        Returns list of dicts with 'term', 'definition'.
        """
        prompt = """Extract key technical terms from the text.
        For each term, provide:
        - The term itself
        - A brief definition (in the same language as the text)
        
        Output JSON format:
        {
            "terms": [
                {"term": "...", "definition": "..."}
            ]
        }
        """
        
        messages = [{"role": "user", "content": prompt + "\n\nText:\n" + text}]
        
        # Define schema for structured output - root must be object
        schema = {
            "type": "OBJECT",
            "properties": {
                "terms": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "term": {"type": "STRING"},
                            "definition": {"type": "STRING"}
                        },
                        "required": ["term", "definition"]
                    }
                }
            },
            "required": ["terms"]
        }
        
        response = await self.generate_chat_completion(
            messages, 
            response_format=schema,
            model_name=model_name
        )
        
        import json
        try:
            result = json.loads(response)
            return result.get("terms", [])
        except json.JSONDecodeError:
            return []

    async def generate_flashcards(self, text: str, count: int = 5, model_name: Optional[str] = None) -> List[Dict[str, str]]:
        """
        Generate flashcards from text.
        Returns list of dicts with 'term', 'definition', 'context'.
        """
        prompt = f"""Generate exactly {count} flashcards based on the text.
        Focus on key concepts, definitions, and important details.
        
        You must output valid JSON in this exact format:
        {{
            "flashcards": [
                {{"term": "Concept or term", "definition": "Clear definition", "context": "Optional context or usage example"}}
            ]
        }}
        
        Text:
        {text}
        """
        
        messages = [{"role": "user", "content": prompt}]
        
        # Use JSON mode without strict schema (more flexible)
        response = await self.generate_chat_completion(
            messages, 
            temperature=0.7,
            model_name=model_name
        )
        
        import json
        try:
            # Try to parse the response as JSON
            result = json.loads(response)
            return result.get("flashcards", [])
        except json.JSONDecodeError:
            # Fallback: try to extract JSON from markdown code blocks
            import re
            json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group(1))
                return result.get("flashcards", [])
            return []
