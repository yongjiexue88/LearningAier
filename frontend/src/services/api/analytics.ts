import { apiClient } from "../../lib/apiClient";
import { AnalyticsOverviewResponse } from "./types";

/**
 * Get analytics overview for the current user
 */
export async function getAnalyticsOverview(): Promise<AnalyticsOverviewResponse> {
    console.log(
        "%c📊 BIGQUERY ANALYTICS",
        "background: #3B82F6; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;",
        "\n📍 Fetching analytics from /api/analytics/overview"
    );

    const { data } = await apiClient.get<AnalyticsOverviewResponse>("/api/analytics/overview");

    console.log(
        "%c✅ BIGQUERY DATA RECEIVED",
        "background: #10B981; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;",
        "\n📊 Stats:",
        {
            notes: data.overview.total_notes,
            flashcards: data.overview.total_flashcards,
            reviews: data.overview.total_reviews,
            mastery: `${data.overview.mastery_rate_percent.toFixed(1)}%`,
            activityDays: data.activity.length,
        }
    );

    return data;
}

/**
 * Get flashcard difficulty statistics
 */
export async function getFlashcardDifficulty(limit: number = 20): Promise<any> {
    console.log(
        "%c📊 BIGQUERY ANALYTICS",
        "background: #3B82F6; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;",
        `\n📍 Fetching difficulty stats (limit: ${limit})`
    );

    const { data } = await apiClient.get<any>(`/api/analytics/flashcard-difficulty?limit=${limit}`);

    console.log(
        "%c✅ BIGQUERY DATA RECEIVED",
        "background: #10B981; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;",
        `\n📊 Flashcards: ${data.flashcards?.length || 0}`
    );

    return data;
}
