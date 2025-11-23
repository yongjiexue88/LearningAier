/**
 * Example: Note AI Actions Component
 * 
 * This component demonstrates how to use the new API hooks in a note page.
 * Drop this component into your existing note viewer/editor pages.
 */

import { useState } from "react";
import {
    Box,
    TextField,
    Button,
    Card,
    CardContent,
    Typography,
    CircularProgress,
    Alert,
    Stack,
    Chip,
} from "@mui/material";
import {
    useAIQA,
    useReindexNote,
    useTranslateNote,
    useExtractTerminology,
} from "../services/hooks/useNoteAI";

interface NoteAIActionsProps {
    noteId: string;
    onUpdate?: () => void;
}

export function NoteAIActions({ noteId }: NoteAIActionsProps) {
    const [question, setQuestion] = useState("");
    const [terminologyText, setTerminologyText] = useState("");

    // React Query hooks
    const aiQA = useAIQA();
    const reindex = useReindexNote();
    const translate = useTranslateNote();
    const extractTerms = useExtractTerminology();

    const handleAskQuestion = () => {
        if (!question.trim()) return;

        aiQA.mutate({
            note_id: noteId,
            question,
            top_k: 5,
        });
    };

    const handleReindex = () => {
        reindex.mutate({ note_id: noteId });
    };

    const handleTranslate = (targetLanguage: "zh" | "en") => {
        translate.mutate({
            note_id: noteId,
            target_lang: targetLanguage,
        });
    };

    const handleExtractTerms = () => {
        if (!terminologyText.trim()) return;

        extractTerms.mutate({
            text: terminologyText,
            note_id: noteId,
        });
    };

    return (
        <Stack spacing={2}>
            {/* AI Q&A Section */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Ask AI about this note
                    </Typography>

                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="Ask a question..."
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        disabled={aiQA.isPending}
                        sx={{ mb: 2 }}
                    />

                    <Button
                        variant="contained"
                        onClick={handleAskQuestion}
                        disabled={aiQA.isPending || !question.trim()}
                    >
                        {aiQA.isPending ? <CircularProgress size={20} /> : "Ask"}
                    </Button>

                    {/* Display answer */}
                    {aiQA.isSuccess && aiQA.data && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="body1" gutterBottom>
                                <strong>Answer:</strong>
                            </Typography>
                            <Typography>{aiQA.data.answer}</Typography>

                            {aiQA.data.sources.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Sources ({aiQA.data.sources.length}):
                                    </Typography>
                                    {aiQA.data.sources.map((source: any, idx: number) => (
                                        <Typography
                                            key={source.chunk_id}
                                            variant="caption"
                                            display="block"
                                            sx={{ mt: 0.5 }}
                                        >
                                            [{idx + 1}] {source.preview}...{" "}
                                            <Chip
                                                label={`${(source.score * 100).toFixed(0)}%`}
                                                size="small"
                                                sx={{ ml: 1 }}
                                            />
                                        </Typography>
                                    ))}
                                </Box>
                            )}
                        </Box>
                    )}

                    {aiQA.isError && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {aiQA.error.message}
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Terminology Extraction */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Extract Terminology
                    </Typography>

                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Paste text to extract bilingual terms..."
                        value={terminologyText}
                        onChange={(e) => setTerminologyText(e.target.value)}
                        disabled={extractTerms.isPending}
                        sx={{ mb: 2 }}
                    />

                    <Button
                        variant="outlined"
                        onClick={handleExtractTerms}
                        disabled={extractTerms.isPending || !terminologyText.trim()}
                    >
                        {extractTerms.isPending ? (
                            <CircularProgress size={20} />
                        ) : (
                            "Extract Terms"
                        )}
                    </Button>

                    {extractTerms.isSuccess && extractTerms.data && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="body2" gutterBottom>
                                Found {extractTerms.data.terms.length} terms:
                            </Typography>
                            {extractTerms.data.terms.map((term: any, idx: number) => (
                                <Box
                                    key={idx}
                                    sx={{
                                        p: 1,
                                        mb: 1,
                                        bgcolor: "background.default",
                                        borderRadius: 1,
                                    }}
                                >
                                    <Typography variant="body2">
                                        <strong>{term.term}</strong> | {term.definition}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {term.definition}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    )}

                    {extractTerms.isError && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {extractTerms.error.message}
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Note Actions */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Note Actions
                    </Typography>

                    <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button
                            variant="outlined"
                            onClick={handleReindex}
                            disabled={reindex.isPending}
                        >
                            {reindex.isPending ? <CircularProgress size={20} /> : "Reindex"}
                        </Button>

                        <Button
                            variant="outlined"
                            onClick={() => handleTranslate("en")}
                            disabled={translate.isPending}
                        >
                            Translate to EN
                        </Button>

                        <Button
                            variant="outlined"
                            onClick={() => handleTranslate("zh")}
                            disabled={translate.isPending}
                        >
                            Translate to ZH
                        </Button>
                    </Stack>

                    {reindex.isSuccess && (
                        <Alert severity="success" sx={{ mt: 2 }}>
                            Reindexed successfully! {reindex.data.chunks_created} chunks
                            created.
                        </Alert>
                    )}

                    {translate.isSuccess && (
                        <Alert severity="success" sx={{ mt: 2 }}>
                            Translation complete!
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </Stack>
    );
}
