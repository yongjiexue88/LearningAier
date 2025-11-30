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
    Switch,
} from "@mui/material";
import {
    useGenerateFlashcards,
    useReviewFlashcard,
    useRecommendNextInterval,
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
    const [rating, setRating] = useState<1 | 2 | 3 | 4 | null>(null);
    const [useML, setUseML] = useState(false);
    const [recommendation, setRecommendation] = useState<{
        ml: number | null;
        sm2: number;
        diff: number | null;
    } | null>(null);

    const reviewFlashcard = useReviewFlashcard();
    const recommendNext = useRecommendNextInterval();

    const handleRatingChange = (newRating: 1 | 2 | 3 | 4 | null) => {
        setRating(newRating);

        if (newRating && useML) {
            // Fetch recommendation when rating is selected and ML mode is on
            recommendNext.mutate(
                {
                    flashcard_id: flashcardId,
                    rating: newRating,
                    current_interval: 0, // Ideally passed from props, defaulting to 0 for now
                },
                {
                    onSuccess: (data) => {
                        setRecommendation({
                            ml: data.ml_interval,
                            sm2: data.sm2_interval,
                            diff: data.difference,
                        });
                    },
                }
            );
        } else {
            setRecommendation(null);
        }
    };

    const handleReview = () => {
        if (rating === null) return;

        reviewFlashcard.mutate(
            {
                flashcard_id: flashcardId,
                rating,
            },
            {
                onSuccess: () => {
                    onReviewed?.();
                    setRating(null);
                    setShowAnswer(false);
                    setRecommendation(null);
                },
            }
        );
    };

    return (
        <Card>
            <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography variant="h6">
                        Flashcard Review
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Typography variant="caption" sx={{ mr: 1 }}>
                            Use ML Schedule
                        </Typography>
                        <Switch
                            checked={useML}
                            onChange={(e) => setUseML(e.target.checked)}
                            size="small"
                        />
                    </Box>
                </Box>

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
                            value={rating}
                            onChange={(_, value) => handleRatingChange(value as 1 | 2 | 3 | 4 | null)}
                            max={4}
                            size="large"
                            disabled={reviewFlashcard.isPending}
                        />

                        {useML && recommendation && (
                            <Alert severity="info" sx={{ mt: 2, mb: 1 }}>
                                <Typography variant="subtitle2">Schedule Comparison:</Typography>
                                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
                                    <Box>
                                        <Typography variant="caption" display="block">Standard (SM-2)</Typography>
                                        <Typography variant="body2" fontWeight="bold">{recommendation.sm2} days</Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" display="block">ML Model</Typography>
                                        <Typography variant="body2" fontWeight="bold" color="primary">
                                            {recommendation.ml ?? "N/A"} days
                                        </Typography>
                                    </Box>
                                    {recommendation.diff !== null && (
                                        <Box>
                                            <Typography variant="caption" display="block">Difference</Typography>
                                            <Typography
                                                variant="body2"
                                                fontWeight="bold"
                                                color={recommendation.diff > 0 ? "success.main" : "error.main"}
                                            >
                                                {recommendation.diff > 0 ? "+" : ""}{recommendation.diff} days
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            </Alert>
                        )}

                        <Button
                            variant="contained"
                            onClick={handleReview}
                            disabled={reviewFlashcard.isPending || rating === null}
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
