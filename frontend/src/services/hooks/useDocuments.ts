import { useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "../api/documents";
import type { UploadProcessRequest } from "../api/types";

/**
 * Hook for processing uploaded documents
 * Handles PDF extraction, note creation, and embedding indexing
 */
export function useProcessDocument() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (request: UploadProcessRequest) =>
            documentsApi.processUpload(request),
        onSuccess: (data) => {
            // Invalidate documents and notes queries
            queryClient.invalidateQueries({ queryKey: ["documents"] });
            if (data.note_id) {
                queryClient.invalidateQueries({ queryKey: ["notes", data.note_id] });
            }
        },
        onError: (error: Error) => {
            console.error("Document processing failed:", error.message);
        },
    });
}
