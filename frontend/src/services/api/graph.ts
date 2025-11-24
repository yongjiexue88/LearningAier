import { apiClient } from "../../lib/apiClient";
import type {
    ExtractGraphRequest,
    GraphData,
} from "./types";

/**
 * Graph API service
 */
export const graphApi = {
    /**
     * Extract graph from text
     */
    extract: (request: ExtractGraphRequest) =>
        apiClient.request<GraphData, ExtractGraphRequest>("/api/graph/extract", {
            method: "POST",
            body: request,
        }),

    /**
     * Get user's knowledge graph
     */
    get: () =>
        apiClient.request<GraphData>("/api/graph/", {
            method: "GET",
        }),
};
