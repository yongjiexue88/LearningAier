import { apiClient } from "../../lib/apiClient";
import type { UploadProcessRequest, UploadProcessResponse } from "./types";

/**
 * Documents API service - typed functions for document operations
 */
export const documentsApi = {
    /**
     * Process uploaded PDF document
     * Downloads PDF, extracts text, creates note, and indexes embeddings
     */
    processUpload: (request: UploadProcessRequest) =>
        apiClient.request<UploadProcessResponse, UploadProcessRequest>(
            "/api/documents/upload-process",
            {
                method: "POST",
                body: request,
            }
        ),
};
