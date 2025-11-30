"""RAG (Retrieval-Augmented Generation) service"""
from typing import List, Dict, Any, Optional
import logging
from app.services.llm_service import LLMService
from app.services.vector_service import VectorService
from app.services.cache_service import get_cache_service

logger = logging.getLogger(__name__)


class RAGResult:
    """RAG query result with answer and sources"""
    
    def __init__(self, answer: str, sources: List[Dict[str, Any]]):
        self.answer = answer
        self.sources = sources


class RAGService:
    """Service for RAG-based question answering"""
    
    def __init__(self):
        self.llm_service = LLMService()
        self.vector_service = VectorService()
        self.cache_service = get_cache_service()
    
    async def answer_question(
        self,
        user_id: str,
        note_id: Optional[str],
        question: str,
        top_k: int = 5,
        model_name: Optional[str] = None
    ) -> RAGResult:
        """
        RAG-based question answering with Redis caching.
        
        Steps:
        0. Check cache for existing answer
        1. Generate query embedding
        2. Retrieve top-k relevant chunks from vector DB
        3. Construct prompt with context
        4. Call LLM
        5. Cache and return result
        
        Args:
            user_id: User ID for filtering
            note_id: Optional note ID for filtering
            question: User's question
            top_k: Number of context chunks to retrieve
            
        Returns:
            RAGResult with answer and sources
        """
        
        # Step 0: Check cache
        note_key = note_id if note_id else "all"
        question_hash = self.cache_service.generate_hash(question)
        cache_key = f"rag:{user_id}:{note_key}:{question_hash}"
        
        cached_result = await self.cache_service.get(cache_key)
        if cached_result:
            logger.info(f"✅ RAG cache hit for key: {cache_key}")
            return RAGResult(
                answer=cached_result["answer"],
                sources=cached_result["sources"]
            )
        
        logger.info(f"❌ RAG cache miss for key: {cache_key}")
        
        # Step 1: Generate query embedding
        query_embedding = await self.llm_service.generate_query_embedding(question)
        
        # Step 2: Query vector DB with filters
        filter_dict = {"user_id": user_id}
        if note_id:
            filter_dict["note_id"] = note_id
        
        matches = await self.vector_service.query_vectors(
            query_vector=query_embedding,
            top_k=top_k,
            filter=filter_dict
        )
        
        if not matches:
            return RAGResult(
                answer="I don't have enough context to answer this question.",
                sources=[]
            )
        
        # Step 3: Construct prompt with context
        context_chunks = []
        sources = []
        
        for i, match in enumerate(matches):
            content = match.metadata.get("content", "")
            context_chunks.append(f"[{i+1}] {content}")
            sources.append({
                "chunk_id": match.id,
                "note_id": match.metadata.get("note_id"),
                "position": match.metadata.get("position"),
                "score": match.score,
                "preview": content[:200]
            })
        
        context = "\n\n".join(context_chunks)
        
        prompt = f"""You are an AI assistant helping answer questions based solely on the provided context.

Context:
{context}

Question: {question}

Instructions:
- Answer based ONLY on the context above
- If the context doesn't contain enough information, say so
- Be concise and accurate
- Reference the context chunk numbers [1], [2], etc. when relevant

Answer:"""
        
        # Step 4: Call LLM
        messages = [{"role": "user", "content": prompt}]
        answer = await self.llm_service.generate_chat_completion(
            messages=messages,
            temperature=0.3,
            max_tokens=1000,
            model_name=model_name
        )
        
        # Step 5: Cache result (30 minutes TTL)
        result_data = {
            "answer": answer.strip(),
            "sources": sources
        }
        await self.cache_service.set(cache_key, result_data, ttl_seconds=1800)
        logger.info(f"💾 Cached RAG result for key: {cache_key}")
        
        # Return result
        return RAGResult(answer=answer.strip(), sources=sources)
