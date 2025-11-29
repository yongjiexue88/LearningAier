import { apiClient } from "../../lib/apiClient";
import type {
    GenerateFlashcardsRequest,
    GenerateFlashcardsResponse,
    ReviewFlashcardRequest,
    ReviewFlashcardResponse,
    RecommendNextIntervalRequest,
    RecommendNextIntervalResponse,
} from "./types";

/**
 * Flashcards API service - typed functions for flashcard operations
 */
export const flashcardsApi = {
    /**
     * Generate flashcards from note content using AI
     */
    generate: (request: GenerateFlashcardsRequest) =>
        apiClient.request<GenerateFlashcardsResponse, GenerateFlashcardsRequest>(
            "/api/flashcards/generate",
            {
                method: "POST",
                body: request,
            }
        ),

    /**
     * Submit flashcard review with SM-2 quality rating
     */
    review: (request: ReviewFlashcardRequest) =>
        apiClient.request<ReviewFlashcardResponse, ReviewFlashcardRequest>(
            "/api/flashcards/review",
            {
                method: "POST",
                body: request,
            }
        ),

    /**
     * Get recommended next interval from ML model
     */
    recommendNext: (request: RecommendNextIntervalRequest) =>
        apiClient.request<RecommendNextIntervalResponse, RecommendNextIntervalRequest>(
            "/api/flashcards/recommend-next",
            {
                method: "POST",
                body: request,
            }
        ),
};
