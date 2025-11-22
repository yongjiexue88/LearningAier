/**
 * Example: Document Upload Component
 * 
 * This component demonstrates how to use the document processing hook.
 * Integrate this into your document upload page.
 */

import { useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    CircularProgress,
    Alert,
    LinearProgress,
} from "@mui/material";
import { useProcessDocument } from "../../services/hooks/useDocuments";

interface DocumentProcessorProps {
    documentId: string;
    filePath: string;
    onSuccess?: (noteId: string) => void;
}

export function DocumentProcessor({
    documentId,
    filePath,
    onSuccess,
}: DocumentProcessorProps) {
    const processDoc = useProcessDocument();

    const handleProcess = () => {
        processDoc.mutate(
            {
                document_id: documentId,
                file_path: filePath,
                chunk_size: 500,
            },
            {
                onSuccess: (data) => {
                    if (data.note_id && onSuccess) {
                        onSuccess(data.note_id);
                    }
                },
            }
        );
    };

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Process Document
                </Typography>

                <Typography variant="body2" color="text.secondary" paragraph>
                    Extract text from PDF and create a searchable note with AI embeddings.
                </Typography>

                <Button
                    variant="contained"
                    onClick={handleProcess}
                    disabled={processDoc.isPending}
                    fullWidth
                >
                    {processDoc.isPending ? (
                        <>
                            <CircularProgress size={20} sx={{ mr: 1 }} />
                            Processing...
                        </>
                    ) : (
                        "Process Document"
                    )}
                </Button>

                {processDoc.isPending && (
                    <Box sx={{ mt: 2 }}>
                        <LinearProgress />
                        <Typography variant="caption" color="text.secondary">
                            This may take a few moments...
                        </Typography>
                    </Box>
                )}

                {processDoc.isSuccess && processDoc.data && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                        <Typography variant="body2">
                            Document processed successfully!
                        </Typography>
                        <Typography variant="caption" display="block">
                            Created {processDoc.data.chunks_created} searchable chunks
                        </Typography>
                        {processDoc.data.text_preview && (
                            <Box sx={{ mt: 1, p: 1, bgcolor: "background.paper" }}>
                                <Typography variant="caption" color="text.secondary">
                                    Preview:
                                </Typography>
                                <Typography variant="caption" display="block">
                                    {processDoc.data.text_preview.substring(0, 200)}...
                                </Typography>
                            </Box>
                        )}
                    </Alert>
                )}

                {processDoc.isError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {processDoc.error.message}
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
