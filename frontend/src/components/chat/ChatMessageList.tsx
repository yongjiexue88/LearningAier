import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageItem } from '../../services/api/types';
import { useEffect, useRef } from 'react';

interface ChatMessageListProps {
    messages: MessageItem[];
    loading?: boolean;
}

export function ChatMessageList({ messages, loading }: ChatMessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <Box
            sx={{
                flex: 1,
                overflowY: 'auto',
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
            }}
        >
            {messages.length === 0 && !loading && (
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                    }}
                >
                    <Typography variant="body1" color="text.secondary">
                        Start a conversation by sending a message below
                    </Typography>
                </Box>
            )}

            {messages.map((message) => (
                <Box
                    key={message.id}
                    sx={{
                        display: 'flex',
                        justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                >
                    <Paper
                        elevation={1}
                        sx={{
                            maxWidth: '75%',
                            p: 2,
                            bgcolor:
                                message.role === 'user'
                                    ? 'primary.main'
                                    : 'background.paper',
                            color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
                            borderRadius: 2,
                        }}
                    >
                        {message.role === 'assistant' ? (
                            <>
                                <Box
                                    sx={{
                                        '& p': { m: 0, mb: 1 },
                                        '& p:last-child': { mb: 0 },
                                        '& ul, & ol': { pl: 3, my: 1 },
                                        '& code': {
                                            bgcolor: 'action.hover',
                                            px: 0.75,
                                            py: 0.25,
                                            borderRadius: 0.5,
                                            fontFamily: 'monospace',
                                            fontSize: '0.9em',
                                        },
                                        '& pre': {
                                            bgcolor: 'action.hover',
                                            p: 1.5,
                                            borderRadius: 1,
                                            overflow: 'auto',
                                            my: 1,
                                        },
                                        '& pre code': {
                                            bgcolor: 'transparent',
                                            p: 0,
                                        },
                                    }}
                                >
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {message.content}
                                    </ReactMarkdown>
                                </Box>

                                {message.sources && message.sources.length > 0 && (
                                    <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                            Sources ({message.sources.length}):
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            {message.sources.slice(0, 3).map((source, idx) => (
                                                <Typography
                                                    key={source.chunk_id}
                                                    variant="caption"
                                                    sx={{
                                                        color: 'text.secondary',
                                                        fontSize: '0.7rem',
                                                        fontStyle: 'italic',
                                                    }}
                                                >
                                                    [{idx + 1}] {source.preview.substring(0, 80)}...
                                                </Typography>
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                            </>
                        ) : (
                            <Typography variant="body1">{message.content}</Typography>
                        )}

                        <Typography
                            variant="caption"
                            sx={{
                                display: 'block',
                                mt: 1,
                                opacity: 0.7,
                                fontSize: '0.7rem',
                            }}
                        >
                            {new Date(message.created_at).toLocaleTimeString()}
                        </Typography>
                    </Paper>
                </Box>
            ))}

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <Paper
                        elevation={1}
                        sx={{
                            p: 2,
                            bgcolor: 'background.paper',
                            borderRadius: 2,
                        }}
                    >
                        <CircularProgress size={20} />
                    </Paper>
                </Box>
            )}

            <div ref={messagesEndRef} />
        </Box>
    );
}
