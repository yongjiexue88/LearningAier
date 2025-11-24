"""Pydantic models for chat-related requests and responses"""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class ChatScope(BaseModel):
    """Scope configuration for a conversation"""
    type: Literal["doc", "folder", "all"] = Field(..., description="Type of scope")
    ids: List[str] = Field(default_factory=list, description="IDs of documents/folders in scope")


class StartConversationRequest(BaseModel):
    """Request to create a new conversation"""
    scope: ChatScope
    title: Optional[str] = Field(None, max_length=200, description="Optional conversation title")


class StartConversationResponse(BaseModel):
    """Response with new conversation ID"""
    conversation_id: str


class SendMessageRequest(BaseModel):
    """User message to send in conversation"""
    message: str = Field(..., min_length=1, max_length=5000)


class SourceChunk(BaseModel):
    """Source chunk citation in assistant response"""
    chunk_id: str
    note_id: Optional[str]
    doc_id: Optional[str]
    score: float
    preview: str


class SendMessageResponse(BaseModel):
    """AI assistant response with sources"""
    answer: str
    sources: List[SourceChunk]


class MessageItem(BaseModel):
    """Message in conversation history"""
    id: str
    role: Literal["user", "assistant"]
    content: str
    created_at: str
    sources: Optional[List[SourceChunk]] = None


class ConversationListItem(BaseModel):
    """Conversation metadata for listing"""
    id: str
    title: str
    scope: ChatScope
    created_at: str
    updated_at: str
    message_count: Optional[int] = 0


class ConversationDetail(BaseModel):
    """Detailed conversation with messages"""
    id: str
    title: str
    scope: ChatScope
    created_at: str
    updated_at: str
    messages: List[MessageItem]
