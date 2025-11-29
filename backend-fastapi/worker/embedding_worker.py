"""Embedding generation worker"""
import logging
from typing import List
import os
import sys

# Add parent directory to path to import from app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logger = logging.getLogger(__name__)


class EmbeddingWorker:
    """Handles bulk embedding generation using the same LLM service as backend"""
    
    def __init__(self):
        """Initialize with LLM service"""
        try:
            from app.services.llm_service import LLMService
            self.llm_service = LLMService()
            logger.info("LLM service initialized for embedding worker")
        except Exception as e:
            logger.error(f"Failed to initialize LLM service: {e}")
            self.llm_service = None
    
    async def generate_bulk_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts.
        
        Args:
            texts: List of text strings to embed
            
        Returns:
            List of embedding vectors
        """
        if not self.llm_service:
            raise RuntimeError("LLM service not initialized")
        
        try:
            logger.info(f"Generating embeddings for {len(texts)} texts")
            
            # Use the same embedding service as the main backend
            embeddings = await self.llm_service.generate_embeddings(texts)
            
            logger.info(f"Successfully generated {len(embeddings)} embeddings")
            return embeddings
            
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}", exc_info=True)
            raise
