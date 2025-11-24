"""Chat API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.models.chat import (
    StartConversationRequest,
    StartConversationResponse,
    SendMessageRequest,
    SendMessageResponse,
    ConversationListItem,
    ConversationDetail,
)
from app.services.chat_service import ChatService
from app.core.auth import get_current_user_id
from app.core.firebase import get_firestore_client

router = APIRouter(prefix="/api/chat", tags=["chat"])


def get_chat_service():
    """Dependency to get chat service instance"""
    return ChatService()


@router.post("/start", response_model=StartConversationResponse)
async def start_conversation(
    request: StartConversationRequest,
    user_id: str = Depends(get_current_user_id),
    chat_service: ChatService = Depends(get_chat_service)
):
    """
    Create a new conversation with specified scope.
    
    Scope types:
    - doc: Single or multiple documents/notes (requires ids)
    - folder: Single or multiple folders (requires ids, includes nested folders)
    - all: All user's materials (ids can be empty)
    """
    try:
        conversation_id = await chat_service.start_conversation(
            user_id=user_id,
            scope=request.scope,
            title=request.title
        )
        return StartConversationResponse(conversation_id=conversation_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create conversation: {str(e)}"
        )


@router.post("/{conversation_id}/message", response_model=SendMessageResponse)
async def send_message(
    conversation_id: str,
    request: SendMessageRequest,
    user_id: str = Depends(get_current_user_id),
    chat_service: ChatService = Depends(get_chat_service)
):
    """
    Send a message in a conversation and get AI response.
    
    Uses RAG to retrieve relevant context from the conversation's scope
    and generates a response using the LLM.
    """
    # Get user's LLM model preference
    db = get_firestore_client()
    profile_doc = db.collection("profiles").document(user_id).get()
    model_name = None
    if profile_doc.exists:
        profile_data = profile_doc.to_dict()
        model_name = profile_data.get("llm_model")
    
    try:
        result = await chat_service.send_message(
            user_id=user_id,
            conversation_id=conversation_id,
            user_message=request.message,
            model_name=model_name
        )
        
        return SendMessageResponse(
            answer=result["answer"],
            sources=result["sources"]
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
        )


@router.get("/conversations", response_model=List[ConversationListItem])
async def list_conversations(
    user_id: str = Depends(get_current_user_id),
    chat_service: ChatService = Depends(get_chat_service)
):
    """
    List user's conversations ordered by most recently updated.
    """
    try:
        conversations = await chat_service.list_conversations(user_id=user_id)
        return [ConversationListItem(**conv) for conv in conversations]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list conversations: {str(e)}"
        )


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user_id),
    chat_service: ChatService = Depends(get_chat_service)
):
    """
    Get conversation details with full message history.
    """
    try:
        conversation = await chat_service.get_conversation(
            user_id=user_id,
            conversation_id=conversation_id
        )
        return ConversationDetail(**conversation)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversation: {str(e)}"
        )


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    user_id: str = Depends(get_current_user_id),
    chat_service: ChatService = Depends(get_chat_service)
):
    """
    Delete a conversation and all its messages.
    """
    try:
        await chat_service.delete_conversation(
            user_id=user_id,
            conversation_id=conversation_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete conversation: {str(e)}"
        )
