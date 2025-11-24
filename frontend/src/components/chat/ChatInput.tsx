import { Box, TextField, IconButton, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/SendRounded';
import { useState, KeyboardEvent } from 'react';

interface ChatInputProps {
    onSend: (message: string) => void;
    loading?: boolean;
    disabled?: boolean;
}

export function ChatInput({ onSend, loading, disabled }: ChatInputProps) {
    const [message, setMessage] = useState('');

    const handleSend = () => {
        if (message.trim() && !loading && !disabled) {
            onSend(message.trim());
            setMessage('');
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <Box
            sx={{
                p: 2,
                borderTop: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                gap: 1,
                alignItems: 'flex-end',
            }}
        >
            <TextField
                fullWidth
                multiline
                maxRows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your materials..."
                disabled={disabled || loading}
                variant="outlined"
                size="small"
            />
            <IconButton
                color="primary"
                onClick={handleSend}
                disabled={!message.trim() || loading || disabled}
                sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                        bgcolor: 'primary.dark',
                    },
                    '&.Mui-disabled': {
                        bgcolor: 'action.disabledBackground',
                    },
                }}
            >
                {loading ? <CircularProgress size={24} /> : <SendIcon />}
            </IconButton>
        </Box>
    );
}
