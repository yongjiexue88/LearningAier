import { firebaseAuth } from "./firebaseClient";

/**
 * Base API client with automatic auth token injection for FastAPI backend
 */
class APIClient {
  private baseUrl: string;

  constructor() {
    // Use /api instead of /functions/v1
    const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /**
   * Get current Firebase ID token
   */
  private async getAuthToken(): Promise<string | null> {
    const user = firebaseAuth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  }

  /**
   * Generic request method with type safety
   */
  async request<TResponse, TBody = unknown>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      body?: TBody;
      requireAuth?: boolean;
    } = {}
  ): Promise<TResponse> {
    const { method = "POST", body, requireAuth = true } = options;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add auth token if required
    if (requireAuth) {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error("Authentication required");
      }
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorJson.message || errorText;
      } catch {
        errorMessage = errorText || `Request failed: ${response.status}`;
      }

      throw new Error(errorMessage);
    }

    return response.json() as Promise<TResponse>;
  }
}

export const apiClient = new APIClient();



