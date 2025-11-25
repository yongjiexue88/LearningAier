import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    startConversation,
    sendMessage,
    streamMessage,
    listConversations,
    getConversation,
    deleteConversation,
} from '../services/api/chat';
import { ChatScope } from '../services/api/types';
import { useState } from 'react';
/**
 * Hook to start a new conversation
 */
export function useStartConversation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ scope, title }: { scope: ChatScope; title?: string }) =>
            startConversation(scope, title),
        onSuccess: () => {
            // Invalidate conversations list to refresh
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
    });
}

/**
 * Hook to send a message in a conversation
 */
export function useSendMessage(conversationId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (message: string) => sendMessage(conversationId, message),
        onSuccess: () => {
            // Invalidate conversation details to refresh messages
            queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
    });
}

/**
 * Hook to list conversations
 */
export function useConversations() {
    return useQuery({
        queryKey: ['conversations'],
        queryFn: listConversations,
    });
}

/**
 * Hook to get conversation details
 */
export function useConversation(conversationId: string | null) {
    return useQuery({
        queryKey: ['conversation', conversationId],
        queryFn: () => {
            if (!conversationId) throw new Error('No conversation ID');
            return getConversation(conversationId);
        },
        enabled: !!conversationId,
    });
}

/**
 * Hook to stream a message in a conversation
 */
export function useStreamMessage(conversationId: string) {
    const queryClient = useQueryClient();
    const [streamingMessage, setStreamingMessage] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const sendMessageStream = async (message: string, overrideConversationId?: string) => {
        const targetId = overrideConversationId || conversationId;
        if (!targetId) {
            setError(new Error("No conversation ID"));
            return;
        }

        setIsStreaming(true);
        setStreamingMessage('');
        setError(null);

        try {
            await streamMessage(targetId, message, (chunk: string) => {
                setStreamingMessage((prev: string) => prev + chunk);
            });

            // Invalidate to fetch final saved message
            queryClient.invalidateQueries({ queryKey: ['conversation', targetId] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Streaming failed'));
        } finally {
            setIsStreaming(false);
        }
    };

    return {
        sendMessageStream,
        streamingMessage,
        isStreaming,
        error
    };
}

/**
 * Hook to delete a conversation
 */
export function useDeleteConversation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (conversationId: string) => deleteConversation(conversationId),
        onSuccess: () => {
            // Invalidate conversations list
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
    });
}
