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
    const startTime = performance.now();

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

    // Log request
    console.log(
      "%c🔵 API REQUEST",
      "background: #2196F3; color: white; font-weight: bold; padding: 2px 8px; border-radius: 3px;"
    );
    console.group("Request Details");
    console.log(`📍 ${method} ${url}`);
    if (body) {
      console.log("📦 Request Body:", body);
    }
    console.groupEnd();

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const duration = performance.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorJson.message || errorText;
      } catch {
        errorMessage = errorText || `Request failed: ${response.status}`;
      }

      // Log error
      console.log(
        "%c🔴 API ERROR",
        "background: #F44336; color: white; font-weight: bold; padding: 2px 8px; border-radius: 3px;"
      );
      console.group("Error Details");
      console.log(`📊 Status: ${response.status}`);
      console.log(`⏱️ Duration: ${duration.toFixed(0)}ms`);
      console.log(`❌ Error: ${errorMessage}`);
      console.groupEnd();

      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Log success response
    console.log(
      "%c🟢 API RESPONSE",
      "background: #4CAF50; color: white; font-weight: bold; padding: 2px 8px; border-radius: 3px;"
    );
    console.group("Response Details");
    console.log(`📊 Status: ${response.status}`);
    console.log(`⏱️ Duration: ${duration.toFixed(0)}ms`);
    console.log("📥 Response Data:", data);
    console.groupEnd();
    console.log(""); // Empty line for spacing

    return data as Promise<TResponse>;
  }
}

export const apiClient = new APIClient();



