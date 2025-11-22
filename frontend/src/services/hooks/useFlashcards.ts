import { useMutation, useQueryClient } from "@tanstack/react-query";
import { flashcardsApi } from "../api/flashcards";
import type {
    GenerateFlashcardsRequest,
    ReviewFlashcardRequest,
} from "../api/types";

/**
 * Hook for generating flashcards from note content
 */
export function useGenerateFlashcards() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (request: GenerateFlashcardsRequest) =>
            flashcardsApi.generate(request),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["flashcards"] });
        },
        onError: (error: Error) => {
            console.error("Flashcard generation failed:", error.message);
        },
    });
}

/**
 * Hook for reviewing flashcards with SM-2 spaced repetition
 */
export function useReviewFlashcard() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (request: ReviewFlashcardRequest) =>
            flashcardsApi.review(request),
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: ["flashcards", data.flashcard_id],
            });
        },
        onError: (error: Error) => {
            console.error("Flashcard review failed:", error.message);
        },
    });
}
