import { apiClient } from "../../lib/apiClient";
import type {
    AIQARequest,
    AIQAResponse,
    ReindexNoteRequest,
    ReindexNoteResponse,
    TranslateNoteRequest,
    TranslateNoteResponse,
    ExtractTerminologyRequest,
    ExtractTerminologyResponse,
} from "./types";

/**
 * Notes API service - typed functions for all note-related endpoints
 */
export const notesApi = {
    /**
     * Ask a question using RAG (Retrieval-Augmented Generation)
     */
    aiQA: (request: AIQARequest) =>
        apiClient.request<AIQAResponse, AIQARequest>("/api/notes/ai-qa", {
            method: "POST",
            body: request,
        }),

    /**
     * Reindex note (rebuild embeddings)
     */
    reindex: (request: ReindexNoteRequest) =>
        apiClient.request<ReindexNoteResponse, ReindexNoteRequest>(
            "/api/notes/reindex",
            {
                method: "POST",
                body: request,
            }
        ),

    /**
     * Translate note content between zh/en
     */
    translate: (request: TranslateNoteRequest) =>
        apiClient.request<TranslateNoteResponse, TranslateNoteRequest>(
            "/api/notes/ai-translate",
            {
                method: "POST",
                body: request,
            }
        ),

    /**
     * Extract bilingual terminology from text
     */
    extractTerminology: (request: ExtractTerminologyRequest) =>
        apiClient.request<ExtractTerminologyResponse, ExtractTerminologyRequest>(
            "/api/notes/ai-terminology",
            {
                method: "POST",
                body: request,
            }
        ),
};
