"""Vector database service for embeddings storage and retrieval"""
from typing import List, Dict, Any, Optional
from pinecone import Pinecone, ServerlessSpec
from app.config import get_settings


class VectorMatch:
    """Represents a vector similarity match"""
    
    def __init__(self, id: str, score: float, metadata: Dict[str, Any]):
        self.id = id
        self.score = score
        self.metadata = metadata


class VectorService:
    """Service for vector database operations (Pinecone)"""
    
    def __init__(self):
        self.settings = get_settings()
        
        if self.settings.vector_db_provider == "pinecone":
            self.pc = Pinecone(api_key=self.settings.pinecone_api_key)
            
            # Ensure index exists (only create if needed)
            if self.settings.pinecone_index_name not in self.pc.list_indexes().names():
                # Only need environment when creating a new serverless index
                if not self.settings.pinecone_environment:
                    raise ValueError(
                        "PINECONE_ENVIRONMENT is required when creating a new index. "
                        "Either provide it or create the index manually in Pinecone console."
                    )
                self.pc.create_index(
                    name=self.settings.pinecone_index_name,
                    dimension=self.settings.embeddings_dimensions,
                    metric="cosine",
                    spec=ServerlessSpec(
                        cloud="aws",
                        region=self.settings.pinecone_environment
                    )
                )
            
            # Connect to index (modern Pinecone client uses host automatically)
            if self.settings.pinecone_index_host:
                self.index = self.pc.Index(
                    self.settings.pinecone_index_name,
                    host=self.settings.pinecone_index_host
                )
            else:
                # Client will fetch host automatically from Pinecone
                self.index = self.pc.Index(self.settings.pinecone_index_name)
    
    async def upsert_vectors(
        self,
        vectors: List[Dict[str, Any]],
        namespace: str = ""
    ):
        """
        Upsert vectors to the index.
        
        Args:
            vectors: List of vector dicts with 'id', 'values', and 'metadata'
                Example: [{"id": "chunk_1", "values": [...], "metadata": {"user_id": "..."}}]
            namespace: Optional namespace for vector isolation (default: "" for main namespace)
        """
        if self.settings.vector_db_provider == "pinecone":
            self.index.upsert(vectors=vectors, namespace=namespace)
    
    async def query_vectors(
        self,
        query_vector: List[float],
        top_k: int = 5,
        filter: Optional[Dict[str, Any]] = None,
        namespace: str = ""
    ) -> List[VectorMatch]:
        """
        Query similar vectors.
        
        Args:
            query_vector: Query embedding vector
            top_k: Number of results to return
            filter: Metadata filter dict, e.g. {"user_id": "abc", "note_id": "123"}
            namespace: Optional namespace for vector isolation (default: "" for main namespace)
            
        Returns:
            List of VectorMatch objects
        """
        if self.settings.vector_db_provider == "pinecone":
            results = self.index.query(
                vector=query_vector,
                top_k=top_k,
                filter=filter,
                include_metadata=True,
                namespace=namespace
            )
            
            return [
                VectorMatch(
                    id=match["id"],
                    score=match["score"],
                    metadata=match.get("metadata", {})
                )
                for match in results["matches"]
            ]
        
        return []
    
    async def delete_vectors(
        self,
        filter: Dict[str, Any]
    ):
        """
        Delete vectors matching filter.
        
        Args:
            filter: Metadata filter dict
        """
        if self.settings.vector_db_provider == "pinecone":
            try:
                self.index.delete(filter=filter, namespace="")
            except Exception as e:
                # Ignore "namespace not found" errors (happens when namespace is empty)
                if "namespace not found" in str(e).lower():
                    pass  # Nothing to delete if namespace doesn't exist yet
                else:
                    raise  # Re-raise other errors
