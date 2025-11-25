import { apiClient } from '../../lib/apiClient';
import { firebaseAuth } from '../../lib/firebaseClient';
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
 * Stream a message in a conversation
 */
export async function streamMessage(
    conversationId: string,
    message: string,
    onChunk: (chunk: string) => void
): Promise<void> {
    const token = await firebaseAuth.currentUser?.getIdToken();
    if (!token) {
        throw new Error("Not authenticated");
    }
    // Fallback to localhost:8080 if baseURL is undefined (e.g. if private in apiClient)
    // Ideally we should expose it publicly in APIClient class
    const baseURL = (apiClient as any).baseURL || 'http://localhost:8080';
    const url = `${baseURL}/api/chat/${conversationId}/stream`;
    console.log('[Chat] Streaming from:', url);
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message } as SendMessageRequest),
    });

    if (!response.ok) {
        throw new Error(`Streaming failed: ${response.statusText}`);
    }

    if (!response.body) {
        throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') return;
                if (data.startsWith('[ERROR]')) {
                    throw new Error(data.slice(8));
                }
                onChunk(data);
            }
        }
    }
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
