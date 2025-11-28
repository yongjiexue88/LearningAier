"""Note service for note operations and reindexing"""
from typing import Optional
from app.core.firebase import get_firestore_client
from app.services.llm_service import LLMService
from app.services.vector_service import VectorService
from app.core.exceptions import NotFoundError, UnauthorizedError


class NoteService:
    """Service for note-related business logic"""
    
    def __init__(self):
        self.db = get_firestore_client()
        self.llm_service = LLMService()
        self.vector_service = VectorService()
    
    async def reindex_all_notes(self, user_id: str) -> dict:
        """
        Reindex all notes for a user.
        """
        notes_ref = self.db.collection("notes").where("user_id", "==", user_id)
        count = 0
        for note_doc in notes_ref.stream():
            try:
                await self.reindex_note(user_id, note_doc.id, force=True)
                count += 1
            except Exception as e:
                print(f"Failed to reindex note {note_doc.id}: {e}")
        
        return {"success": True, "count": count}

    async def reindex_note(
        self,
        user_id: str,
        note_id: str,
        force: bool = False
    ) -> dict:
        """
        Chunk and embed note content, then upsert to vector DB.
        
        Args:
            user_id: User ID for authorization
            note_id: Note ID to reindex
            force: Force reindexing even if already indexed
            
        Returns:
            Dict with success status and chunks_created count
        """
        # 1. Fetch note from Firestore
        note_ref = self.db.collection("notes").document(note_id)
        note_doc = note_ref.get()
        
        if not note_doc.exists:
            raise NotFoundError(f"Note {note_id} not found")
        
        note_data = note_doc.to_dict()
        
        # Verify ownership
        if note_data.get("user_id") != user_id:
            raise UnauthorizedError("Unauthorized access to note")
        
        # 2. Get content (bilingual)
        content_zh = note_data.get("content_md_zh", "")
        content_en = note_data.get("content_md_en", "")
        combined_content = f"{content_zh}\n\n{content_en}".strip()
        
        if not combined_content:
            return {
                "success": True,
                "chunks_created": 0,
                "note_id": note_id
            }
        
        # 3. Chunk content
        chunks = self._chunk_text(combined_content, chunk_size=500)
        
        # 4. Generate embeddings
        embeddings = await self.llm_service.generate_embeddings(chunks)
        
        # 5. Delete old vectors for this note
        await self.vector_service.delete_vectors({
            "user_id": user_id,
            "note_id": note_id
        })
        
        # 6. Upsert new vectors
        vectors = []
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            vectors.append({
                "id": f"{note_id}_chunk_{i}",
                "values": embedding,
                "metadata": {
                    "user_id": user_id,
                    "note_id": note_id,
                    "content": chunk,
                    "position": i
                }
            })
        
        await self.vector_service.upsert_vectors(vectors)
        
        return {
            "success": True,
            "chunks_created": len(chunks),
            "note_id": note_id
        }
    
    def _chunk_text(self, text: str, chunk_size: int = 500) -> list[str]:
        """
        Simple chunking by characters with overlap.
        TODO: Consider using semantic chunking or langchain text splitter.
        
        Args:
            text: Text to chunk
            chunk_size: Target chunk size in characters
            
        Returns:
            List of text chunks
        """
        chunks = []
        overlap = chunk_size // 4
        
        for i in range(0, len(text), chunk_size - overlap):
            chunk = text[i:i + chunk_size].strip()
            if chunk:
                chunks.append(chunk)
        
        return chunks

    async def translate_note(self, user_id: str, note_id: str, target_lang: str, model_name: Optional[str] = None) -> dict:
        """
        Translate note content.
        """
        # 1. Fetch note
        note_ref = self.db.collection("notes").document(note_id)
        note_doc = note_ref.get()
        
        if not note_doc.exists:
            raise NotFoundError(f"Note {note_id} not found")
        
        note_data = note_doc.to_dict()
        if note_data.get("user_id") != user_id:
            raise UnauthorizedError("Unauthorized access to note")
            
        # 2. Get source content
        # If target is 'en', translate 'zh' content. If 'zh', translate 'en'.
        source_content = ""
        if target_lang == "en":
            source_content = note_data.get("content_md_zh", "")
        elif target_lang == "zh":
            source_content = note_data.get("content_md_en", "")
            
        if not source_content:
            # Fallback: if specific lang content missing, try the other
            source_content = note_data.get("content_md_zh") or note_data.get("content_md_en")
            
        if not source_content:
             return {
                 "note_id": note_id,
                 "translated_content": "",
                 "target_language": target_lang
             }

        # 3. Call LLM
        translated_text = await self.llm_service.translate_text(source_content, target_lang, model_name=model_name)
        
        # 4. Update Firestore
        field_to_update = "content_md_en" if target_lang == "en" else "content_md_zh"
        note_ref.update({field_to_update: translated_text})
        
        return {
            "note_id": note_id,
            "translated_content": translated_text,
            "target_language": target_lang
        }

    async def extract_terminology(self, user_id: str, note_id: str, model_name: Optional[str] = None) -> list:
        """
        Extract terminology from note.
        """
        # 1. Fetch note
        note_ref = self.db.collection("notes").document(note_id)
        note_doc = note_ref.get()
        
        if not note_doc.exists:
            raise NotFoundError(f"Note {note_id} not found")
            
        note_data = note_doc.to_dict()
        if note_data.get("user_id") != user_id:
            raise UnauthorizedError("Unauthorized access to note")
            
        # 2. Get content (prefer combined or longest)
        content = note_data.get("content_md_zh", "") + "\n" + note_data.get("content_md_en", "")
        
        # 3. Call LLM
        terms = await self.llm_service.extract_terminology(content, model_name=model_name)
        
        # 4. Store in Firestore (optional, maybe in a subcollection or field)
        # For now just return them
        return terms

    async def get_all_notes(self, user_id: str) -> list[dict]:
        """
        Get all notes for a user.
        """
        notes_ref = self.db.collection("notes").where("user_id", "==", user_id)
        notes = []
        for doc in notes_ref.stream():
            note_data = doc.to_dict()
            note_data["id"] = doc.id
            notes.append(note_data)
        return notes
