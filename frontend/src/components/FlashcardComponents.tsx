/**
 * Example: Flashcard Generator Component
 * 
 * This component demonstrates how to use flashcard hooks.
 * Integrate this into your flashcard pages.
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
    TextField,
    Stack,
    Rating,
    Paper,
} from "@mui/material";
import {
    useGenerateFlashcards,
    useReviewFlashcard,
} from "../services/hooks/useFlashcards";

interface FlashcardGeneratorProps {
    noteId: string;
}

export function FlashcardGenerator({ noteId }: FlashcardGeneratorProps) {
    const [count, setCount] = useState(10);
    const generateFlashcards = useGenerateFlashcards();

    const handleGenerate = () => {
        generateFlashcards.mutate({
            note_id: noteId,
            count,
            auto_save: true,
        });
    };

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Generate Flashcards
                </Typography>

                <TextField
                    type="number"
                    label="Number of cards"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value) || 10)}
                    disabled={generateFlashcards.isPending}
                    inputProps={{ min: 1, max: 50 }}
                    sx={{ mb: 2 }}
                />

                <Button
                    variant="contained"
                    onClick={handleGenerate}
                    disabled={generateFlashcards.isPending}
                    fullWidth
                >
                    {generateFlashcards.isPending ? (
                        <>
                            <CircularProgress size={20} sx={{ mr: 1 }} />
                            Generating...
                        </>
                    ) : (
                        "Generate Flashcards"
                    )}
                </Button>

                {generateFlashcards.isSuccess && generateFlashcards.data && (
                    <Box sx={{ mt: 2 }}>
                        <Alert severity="success" sx={{ mb: 2 }}>
                            Generated {generateFlashcards.data.flashcards.length} flashcards!
                        </Alert>

                        <Stack spacing={1}>
                            {generateFlashcards.data.flashcards.slice(0, 3).map((card: any, idx: number) => (
                                <Paper key={idx} sx={{ p: 2 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Front:
                                    </Typography>
                                    <Typography variant="body1" gutterBottom>
                                        {card.front}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Back:
                                    </Typography>
                                    <Typography variant="body1">{card.back}</Typography>
                                </Paper>
                            ))}
                            {generateFlashcards.data.flashcards.length > 3 && (
                                <Typography variant="caption" color="text.secondary">
                                    ... and {generateFlashcards.data.flashcards.length - 3} more
                                </Typography>
                            )}
                        </Stack>
                    </Box>
                )}

                {generateFlashcards.isError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {generateFlashcards.error.message}
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}

interface FlashcardReviewProps {
    flashcardId: string;
    front: string;
    back: string;
    onReviewed?: () => void;
}

export function FlashcardReview({
    flashcardId,
    front,
    back,
    onReviewed,
}: FlashcardReviewProps) {
    const [showAnswer, setShowAnswer] = useState(false);
    const [quality, setQuality] = useState<number | null>(null);
    const reviewFlashcard = useReviewFlashcard();

    const handleReview = () => {
        if (quality === null) return;

        reviewFlashcard.mutate(
            {
                flashcard_id: flashcardId,
                quality,
            },
            {
                onSuccess: () => {
                    onReviewed?.();
                },
            }
        );
    };

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Flashcard Review
                </Typography>

                <Paper sx={{ p: 3, mb: 2, minHeight: 100 }}>
                    <Typography variant="body1">{front}</Typography>

                    {showAnswer && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
                            <Typography variant="body2" color="primary">
                                {back}
                            </Typography>
                        </Box>
                    )}
                </Paper>

                {!showAnswer ? (
                    <Button
                        variant="contained"
                        onClick={() => setShowAnswer(true)}
                        fullWidth
                    >
                        Show Answer
                    </Button>
                ) : (
                    <Box>
                        <Typography variant="body2" gutterBottom>
                            How well did you know this?
                        </Typography>
                        <Rating
                            value={quality}
                            onChange={(_, value) => setQuality(value)}
                            max={5}
                            size="large"
                            disabled={reviewFlashcard.isPending}
                        />

                        <Button
                            variant="contained"
                            onClick={handleReview}
                            disabled={reviewFlashcard.isPending || quality === null}
                            fullWidth
                            sx={{ mt: 2 }}
                        >
                            {reviewFlashcard.isPending ? (
                                <CircularProgress size={20} />
                            ) : (
                                "Submit Review"
                            )}
                        </Button>
                    </Box>
                )}

                {reviewFlashcard.isSuccess && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                        Review saved! Next review in {reviewFlashcard.data.interval} days.
                    </Alert>
                )}

                {reviewFlashcard.isError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {reviewFlashcard.error.message}
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
