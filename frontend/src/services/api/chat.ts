import { apiClient } from '../../lib/apiClient';
import {
    ChatScope,
    StartConversationRequest,
    StartConversationResponse,
    SendMessageRequest,
    SendMessageResponse,
    ConversationListItem,
    ConversationDetail,
} from './types';

/**
 * Start a new conversation with specified scope
 */
export async function startConversation(
    scope: ChatScope,
    title?: string
): Promise<StartConversationResponse> {
    const response = await apiClient.post<StartConversationResponse>('/api/chat/start', {
        scope,
        title,
    } as StartConversationRequest);
    return response.data;
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
    conversationId: string,
    message: string
): Promise<SendMessageResponse> {
    const response = await apiClient.post<SendMessageResponse>(
        `/api/chat/${conversationId}/message`,
        { message } as SendMessageRequest
    );
    return response.data;
}

/**
 * List user's conversations
 */
export async function listConversations(): Promise<ConversationListItem[]> {
    const response = await apiClient.get<ConversationListItem[]>('/api/chat/conversations');
    return response.data;
}

/**
 * Get conversation details with messages
 */
export async function getConversation(conversationId: string): Promise<ConversationDetail> {
    const response = await apiClient.get<ConversationDetail>(`/api/chat/${conversationId}`);
    return response.data;
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<void> {
    await apiClient.delete(`/api/chat/${conversationId}`);
}
