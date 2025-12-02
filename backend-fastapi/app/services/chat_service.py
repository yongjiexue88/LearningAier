"""Chat service for RAG-based conversational AI"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.core.firebase import get_firestore_client
from app.services.llm_service import LLMService
from app.services.vector_service import VectorService
from app.services.rag_service import RAGService
from app.models.chat import ChatScope, SourceChunk


class ChatService:
    """Service for managing conversations and RAG chat"""
    
    def __init__(self):
        self.db = get_firestore_client()
        self.llm_service = LLMService()
        self.vector_service = VectorService()
        self.rag_service = RAGService()
    
    async def start_conversation(
        self,
        user_id: str,
        scope: ChatScope,
        title: Optional[str] = None
    ) -> str:
        """
        Create a new conversation.
        
        Args:
            user_id: User ID
            scope: Conversation scope (doc/folder/all)
            title: Optional conversation title
            
        Returns:
            Conversation ID
        """
        # Generate title if not provided
        if not title:
            scope_desc = f"{scope.type}"
            if scope.type != "all" and scope.ids:
                scope_desc += f" ({len(scope.ids)} items)"
            title = f"Chat - {scope_desc}"
        
        # Create conversation document
        conv_ref = self.db.collection("users").document(user_id).collection("conversations").document()
        
        now = datetime.utcnow().isoformat() + "Z"
        conv_data = {
            "title": title,
            "scope": scope.model_dump(),
            "created_at": now,
            "updated_at": now,
        }
        
        conv_ref.set(conv_data)
        
        return conv_ref.id
    
    async def stream_message(
        self,
        user_id: str,
        conversation_id: str,
        user_message: str,
        model_name: Optional[str] = None
    ):
        """
        Stream chat response using RAG.
        Yields chunks of text.
        """
        # 1. Load conversation metadata
        conv_ref = self.db.collection("users").document(user_id).collection("conversations").document(conversation_id)
        conv_doc = conv_ref.get()
        
        if not conv_doc.exists:
            raise ValueError(f"Conversation {conversation_id} not found")
        
        conv_data = conv_doc.to_dict()
        scope = ChatScope(**conv_data["scope"])
        
        # 2. Retrieve recent message history
        messages_ref = conv_ref.collection("messages")
        recent_messages = (
            messages_ref
            .order_by("created_at", direction="DESCENDING")
            .limit(6)
            .stream()
        )
        
        history = []
        for msg_doc in recent_messages:
            msg_data = msg_doc.to_dict()
            history.append({
                "role": msg_data["role"],
                "content": msg_data["content"]
            })
        
        history.reverse()
        
        # 3. Resolve scope and filter
        filter_dict = {"user_id": user_id}
        
        if scope.type == "doc" and scope.ids:
            if len(scope.ids) == 1:
                filter_dict["note_id"] = scope.ids[0]
        elif scope.type == "folder" and scope.ids:
            note_ids = await self._resolve_folder_to_notes(user_id, scope.ids)
            filter_dict["_folder_notes"] = note_ids
        
        # 4. Vector search
        query_embedding = await self.llm_service.generate_query_embedding(user_message)
        
        pinecone_filter = {k: v for k, v in filter_dict.items() if not k.startswith("_")}
        
        matches = await self.vector_service.query_vectors(
            query_vector=query_embedding,
            top_k=8,
            filter=pinecone_filter
        )
        
        if scope.type == "folder" and "_folder_notes" in filter_dict:
            folder_note_ids = set(filter_dict["_folder_notes"])
            matches = [m for m in matches if m.metadata.get("note_id") in folder_note_ids]
        
        # 5. Build context
        context_chunks = []
        sources = []
        
        for i, match in enumerate(matches[:8]):
            content = match.metadata.get("content", "")
            context_chunks.append(f"[Source {i+1}] {content}")
            sources.append(SourceChunk(
                chunk_id=match.id,
                note_id=match.metadata.get("note_id"),
                doc_id=match.metadata.get("document_id"),
                score=match.score,
                preview=content[:250]
            ))
        
        context = "\n\n".join(context_chunks)
        
        # 6. Build prompt
        system_prompt = """You are a knowledgeable study tutor helping the student learn from their own materials.

IMPORTANT GUIDELINES:
- Answer questions based ONLY on the provided context from the student's notes and documents
- If the context doesn't contain enough information to answer the question, say so honestly
- Reference specific sources using [Source N] notation when making claims
- Be clear, concise, and educational in your explanations
"""
        
        llm_messages = [{"role": "system", "content": system_prompt}]
        for hist_msg in history:
            llm_messages.append(hist_msg)
            
        user_prompt = f"""Context from student's materials:
{context}

Student's question: {user_message}"""
        
        llm_messages.append({"role": "user", "content": user_prompt})
        
        # Prepare messages for LLM
        simple_messages = [{"role": m["role"], "content": m["content"]} for m in llm_messages if m["role"] != "system"]
        if simple_messages:
            simple_messages[0]["content"] = system_prompt + "\n\n" + simple_messages[0]["content"]
            
        # 7. Stream response
        full_answer = ""
        async for chunk in self.llm_service.generate_chat_stream(
            messages=simple_messages,
            temperature=0.7,
            max_tokens=2000,
            model_name=model_name
        ):
            full_answer += chunk
            yield chunk
            
        # 8. Save to Firestore (after stream completes)
        now = datetime.utcnow().isoformat() + "Z"
        
        user_msg_ref = messages_ref.document()
        user_msg_ref.set({
            "role": "user",
            "content": user_message,
            "created_at": now,
        })
        
        assistant_msg_ref = messages_ref.document()
        assistant_msg_ref.set({
            "role": "assistant",
            "content": full_answer,
            "created_at": now,
            "sources": [s.model_dump() for s in sources] if sources else []
        })
        
        conv_ref.update({"updated_at": now})

    async def send_message(
        self,
        user_id: str,
        conversation_id: str,
        user_message: str,
        model_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send a message and get AI response using RAG with caching.
        
        Args:
            user_id: User ID
            conversation_id: Conversation ID
            user_message: User's message
            model_name: Optional LLM model name
            
        Returns:
            Dict with 'answer' and 'sources'
        """
        # 1. Load conversation metadata
        conv_ref = self.db.collection("users").document(user_id).collection("conversations").document(conversation_id)
        conv_doc = conv_ref.get()
        
        if not conv_doc.exists:
            raise ValueError(f"Conversation {conversation_id} not found")
        
        conv_data = conv_doc.to_dict()
        scope = ChatScope(**conv_data["scope"])
        
        # 2. Resolve scope to note_id for RAGService
        note_id = None
        if scope.type == "doc" and scope.ids and len(scope.ids) == 1:
            # Single document scope - pass note_id for caching
            note_id = scope.ids[0]
        elif scope.type == "folder" and scope.ids:
            # Folder scope - resolve to first note for now
            # TODO: RAGService could support multiple note IDs
            note_ids = await self._resolve_folder_to_notes(user_id, scope.ids)
            if note_ids:
                note_id = note_ids[0]  # Use first note for cache key
        # For "all" scope or multiple docs, note_id remains None
        
        # 3. Call RAGService (with caching!)
        rag_result = await self.rag_service.answer_question(
            user_id=user_id,
            note_id=note_id,
            question=user_message,
            top_k=8,
            model_name=model_name
        )
        
        # 4. Convert RAGResult sources to SourceChunk format
        sources = [
            SourceChunk(
                chunk_id=src.get("chunk_id"),
                note_id=src.get("note_id"),
                doc_id=src.get("document_id"),
                score=src.get("score", 0.0),
                preview=src.get("preview", "")
            )
            for src in rag_result.sources
        ]
        
        # 5. Save messages to Firestore
        now = datetime.utcnow().isoformat() + "Z"
        messages_ref = conv_ref.collection("messages")
        
        # Save user message
        user_msg_ref = messages_ref.document()
        user_msg_ref.set({
            "role": "user",
            "content": user_message,
            "created_at": now,
        })
        
        # Save assistant message with sources
        assistant_msg_ref = messages_ref.document()
        assistant_msg_ref.set({
            "role": "assistant",
            "content": rag_result.answer,
            "created_at": now,
            "sources": [s.model_dump() for s in sources] if sources else []
        })
        
        # Update conversation timestamp
        conv_ref.update({"updated_at": now})
        
        return {
            "answer": rag_result.answer.strip(),
            "sources": sources
        }
    
    async def _resolve_folder_to_notes(self, user_id: str, folder_ids: List[str]) -> List[str]:
        """
        Resolve folder IDs to note IDs (including nested folders).
        
        Args:
            user_id: User ID
            folder_ids: List of folder IDs
            
        Returns:
            List of note IDs in those folders
        """
        # Get all folders for user to build tree
        folders_ref = self.db.collection("folders").where("user_id", "==", user_id)
        all_folders = {doc.id: doc.to_dict() for doc in folders_ref.stream()}
        
        # Find all descendant folders (recursive)
        def get_descendants(folder_id: str) -> List[str]:
            result = [folder_id]
            for fid, fdata in all_folders.items():
                if fdata.get("parent_id") == folder_id:
                    result.extend(get_descendants(fid))
            return result
        
        # Collect all folder IDs including descendants
        all_folder_ids = set()
        for fid in folder_ids:
            all_folder_ids.update(get_descendants(fid))
        
        # Get all notes in these folders
        notes_ref = self.db.collection("notes").where("user_id", "==", user_id)
        note_ids = []
        for note_doc in notes_ref.stream():
            note_data = note_doc.to_dict()
            if note_data.get("folder_id") in all_folder_ids:
                note_ids.append(note_doc.id)
        
        return note_ids
    
    async def list_conversations(
        self,
        user_id: str,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        List user's conversations.
        
        Args:
            user_id: User ID
            limit: Maximum number of conversations to return
            
        Returns:
            List of conversation metadata
        """
        convs_ref = (
            self.db.collection("users")
            .document(user_id)
            .collection("conversations")
            .order_by("updated_at", direction="DESCENDING")
            .limit(limit)
        )
        
        conversations = []
        for conv_doc in convs_ref.stream():
            conv_data = conv_doc.to_dict()
            
            # Count messages
            messages_count = len(list(
                self.db.collection("users")
                .document(user_id)
                .collection("conversations")
                .document(conv_doc.id)
                .collection("messages")
                .stream()
            ))
            
            conversations.append({
                "id": conv_doc.id,
                "title": conv_data.get("title", "Untitled"),
                "scope": conv_data.get("scope"),
                "created_at": conv_data.get("created_at"),
                "updated_at": conv_data.get("updated_at"),
                "message_count": messages_count
            })
        
        return conversations
    
    async def get_conversation(
        self,
        user_id: str,
        conversation_id: str
    ) -> Dict[str, Any]:
        """
        Get conversation details with messages.
        
        Args:
            user_id: User ID
            conversation_id: Conversation ID
            
        Returns:
            Conversation details with messages
        """
        conv_ref = (
            self.db.collection("users")
            .document(user_id)
            .collection("conversations")
            .document(conversation_id)
        )
        
        conv_doc = conv_ref.get()
        if not conv_doc.exists:
            raise ValueError(f"Conversation {conversation_id} not found")
        
        conv_data = conv_doc.to_dict()
        
        # Get messages
        messages_ref = conv_ref.collection("messages").order_by("created_at")
        messages = []
        for msg_doc in messages_ref.stream():
            msg_data = msg_doc.to_dict()
            messages.append({
                "id": msg_doc.id,
                "role": msg_data["role"],
                "content": msg_data["content"],
                "created_at": msg_data["created_at"],
                "sources": msg_data.get("sources", [])
            })
        
        return {
            "id": conv_doc.id,
            "title": conv_data["title"],
            "scope": conv_data["scope"],
            "created_at": conv_data["created_at"],
            "updated_at": conv_data["updated_at"],
            "messages": messages
        }
    
    async def delete_conversation(
        self,
        user_id: str,
        conversation_id: str
    ):
        """
        Delete a conversation and all its messages.
        
        Args:
            user_id: User ID
            conversation_id: Conversation ID
        """
        conv_ref = (
            self.db.collection("users")
            .document(user_id)
            .collection("conversations")
            .document(conversation_id)
        )
        
        # Delete all messages first
        messages_ref = conv_ref.collection("messages")
        for msg_doc in messages_ref.stream():
            msg_doc.reference.delete()
        
        # Delete conversation
        conv_ref.delete()
