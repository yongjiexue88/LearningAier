import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notesApi } from "../api/notes";
import { graphApi } from "../api/graph";
import type {
    AIQARequest,
    ReindexNoteRequest,
    TranslateNoteRequest,
    ExtractTerminologyRequest,
    ExtractGraphRequest,
} from "../api/types";

/**
 * Hook for AI Q&A using RAG
 */
export function useAIQA() {
    return useMutation({
        mutationFn: (request: AIQARequest) => notesApi.aiQA(request),
        onError: (error: Error) => {
            console.error("AI Q&A failed:", error.message);
        },
    });
}

/**
 * Hook for note reindexing (rebuild embeddings)
 */
export function useReindexNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (request: ReindexNoteRequest) => notesApi.reindex(request),
        onSuccess: (data) => {
            // Invalidate note queries to refresh data
            queryClient.invalidateQueries({ queryKey: ["notes", data.note_id] });
        },
        onError: (error: Error) => {
            console.error("Reindex failed:", error.message);
        },
    });
}

/**
 * Hook for note translation (zh <-> en)
 */
export function useTranslateNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (request: TranslateNoteRequest) => notesApi.translate(request),
        onSuccess: (data) => {
            // Invalidate note queries
            queryClient.invalidateQueries({ queryKey: ["notes", data.note_id] });
        },
        onError: (error: Error) => {
            console.error("Translation failed:", error.message);
        },
    });
}

/**
 * Hook for terminology extraction
 */
export function useExtractTerminology() {
    return useMutation({
        mutationFn: (request: ExtractTerminologyRequest) =>
            notesApi.extractTerminology(request),
        onError: (error: Error) => {
            console.error("Terminology extraction failed:", error.message);
        },
    });
}

/**
 * Hook for graph extraction
 */
export function useExtractGraph() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (request: ExtractGraphRequest) => graphApi.extract(request),
        onSuccess: () => {
            // Invalidate graph query
            queryClient.invalidateQueries({ queryKey: ["knowledge-graph"] });
        },
        onError: (error: Error) => {
            console.error("Graph extraction failed:", error.message);
        },
    });
}
