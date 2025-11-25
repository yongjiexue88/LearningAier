import {
    Box,
    Typography,
    List,
    ListItemButton,
    ListItemText,
    Paper,
    IconButton,
    Button,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import AddIcon from '@mui/icons-material/AddRounded';
import DeleteIcon from '@mui/icons-material/DeleteOutlineRounded';
import ChatIcon from '@mui/icons-material/ChatRounded';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChatMessageList } from '../../components/chat/ChatMessageList';
import { ChatInput } from '../../components/chat/ChatInput';
import { ScopeSelector } from '../../components/chat/ScopeSelector';
import {
    useConversations,
    useConversation,
    useSendMessage,
    useDeleteConversation,
} from '../../hooks/useChat';

export function ChatPage() {
    const navigate = useNavigate();
    const { conversationId } = useParams<{ conversationId?: string }>();
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    // Queries
    const conversationsQuery = useConversations();
    const conversationQuery = useConversation(conversationId || null);
    const sendMessageMutation = useSendMessage(conversationId || '');
    const deleteConversationMutation = useDeleteConversation();

    const conversations = conversationsQuery.data || [];
    const currentConversation = conversationQuery.data;

    const handleSendMessage = (message: string) => {
        if (!conversationId) return;
        sendMessageMutation.mutate(message);
    };

    const handleDeleteConversation = async () => {
        if (!conversationId) return;

        try {
            await deleteConversationMutation.mutateAsync(conversationId);
            setDeleteDialogOpen(false);

            // Navigate to first conversation or empty state
            if (conversations.length > 1) {
                const nextConv = conversations.find(c => c.id !== conversationId);
                if (nextConv) {
                    navigate(`/chat/${nextConv.id}`);
                } else {
                    navigate('/chat');
                }
            } else {
                navigate('/chat');
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    };

    const handleNewConversation = () => {
        // Navigate to notes page to start a new conversation
        navigate('/notes');
    };

    return (
        <Box sx={{ display: 'flex', height: '100vh', width: '100%', maxWidth: '100vw', overflow: 'hidden' }}>
            {/* Left Sidebar - Conversation List */}
            <Paper
                elevation={0}
                sx={{
                    width: { xs: '100%', md: 280 },
                    display: { xs: 'none', md: 'flex' },
                    borderRight: 1,
                    borderColor: 'divider',
                    flexDirection: 'column',
                    flexShrink: 0,
                }}
            >
                {/* Header */}
                <Box sx={{ p: 2.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <ChatIcon color="primary" fontSize="medium" />
                            <Typography variant="h6" fontWeight={600}>
                                AI Tutor
                            </Typography>
                        </Box>
                        <IconButton
                            size="small"
                            onClick={handleNewConversation}
                            title="New conversation"
                            sx={{
                                borderRadius: 1.5,
                                '&:hover': {
                                    bgcolor: 'action.hover',
                                },
                            }}
                        >
                            <AddIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </Box>

                {/* Conversation List */}
                <List sx={{ flex: 1, overflowY: 'auto', p: 0 }}>
                    {conversationsQuery.isLoading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress size={24} />
                        </Box>
                    )}

                    {conversationsQuery.isError && (
                        <Box sx={{ p: 2 }}>
                            <Alert severity="error">Failed to load conversations</Alert>
                        </Box>
                    )}

                    {conversations.length === 0 && !conversationsQuery.isLoading && (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                                No conversations yet
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Start by asking AI about a note
                            </Typography>
                        </Box>
                    )}

                    {conversations.map((conv) => (
                        <ListItemButton
                            key={conv.id}
                            selected={conv.id === conversationId}
                            onClick={() => navigate(`/chat/${conv.id}`)}
                            sx={{
                                mx: 1,
                                my: 0.5,
                                borderRadius: 2,
                                '&.Mui-selected': {
                                    bgcolor: 'primary.main',
                                    color: 'primary.contrastText',
                                    '&:hover': {
                                        bgcolor: 'primary.main',
                                    },
                                },
                                '&:hover:not(.Mui-selected)': {
                                    bgcolor: 'action.hover',
                                },
                            }}
                        >
                            <ListItemText
                                primary={conv.title}
                                secondary={`${conv.message_count || 0} messages`}
                                primaryTypographyProps={{
                                    noWrap: true,
                                    fontWeight: conv.id === conversationId ? 600 : 500,
                                    fontSize: '0.9375rem',
                                    color: conv.id === conversationId ? 'inherit' : 'text.primary',
                                }}
                                secondaryTypographyProps={{
                                    variant: 'caption',
                                    fontSize: '0.75rem',
                                    color: conv.id === conversationId ? 'inherit' : 'text.secondary',
                                }}
                            />
                        </ListItemButton>
                    ))}
                </List>
            </Paper>

            {/* Main Chat Area */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {!conversationId || !currentConversation ? (
                    <Box
                        sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                            p: 3,
                        }}
                    >
                        <ChatIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
                        <Typography variant="h6" color="text.secondary">
                            Select a conversation or start a new one
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleNewConversation}
                        >
                            Start New Conversation
                        </Button>
                    </Box>
                ) : (
                    <>
                        {/* Chat Header */}
                        <Box
                            sx={{
                                p: 2.5,
                                borderBottom: 1,
                                borderColor: 'divider',
                                bgcolor: 'background.paper',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Box>
                                <Typography variant="h6" fontWeight={600}>
                                    {currentConversation.title}
                                </Typography>
                                <ScopeSelector scope={currentConversation.scope} />
                            </Box>
                            <IconButton
                                onClick={() => setDeleteDialogOpen(true)}
                                size="small"
                                sx={{
                                    color: 'text.secondary',
                                    '&:hover': {
                                        color: 'error.main',
                                        bgcolor: 'rgba(239, 68, 68, 0.04)',
                                    },
                                }}
                            >
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Box>

                        {/* Messages */}
                        {conversationQuery.isLoading ? (
                            <Box
                                sx={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <CircularProgress />
                            </Box>
                        ) : conversationQuery.isError ? (
                            <Box sx={{ flex: 1, p: 3 }}>
                                <Alert severity="error">Failed to load conversation</Alert>
                            </Box>
                        ) : (
                            <ChatMessageList
                                messages={currentConversation.messages}
                                loading={sendMessageMutation.isPending}
                            />
                        )}

                        {/* Input */}
                        <ChatInput
                            onSend={handleSendMessage}
                            loading={sendMessageMutation.isPending}
                            disabled={conversationQuery.isLoading || conversationQuery.isError}
                        />
                    </>
                )}
            </Box>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        p: 1,
                    },
                }}
            >
                <DialogTitle sx={{ fontWeight: 600 }}>Delete Conversation</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary">
                        Are you sure you want to delete this conversation? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined">Cancel</Button>
                    <Button
                        onClick={handleDeleteConversation}
                        color="error"
                        variant="contained"
                        disabled={deleteConversationMutation.isPending}
                    >
                        {deleteConversationMutation.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
