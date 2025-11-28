import { firebaseAuth, firebaseDb } from "./firebaseClient";
import { doc, getDoc } from "firebase/firestore";

/**
 * Base API client with automatic auth token injection for FastAPI backend
 * Supports dynamic environment switching between production and lab backends
 */
class APIClient {
  private baseUrl: string;
  private initialized = false;

  constructor() {
    // Initialize with default URL, will be updated after environment check
    const defaultUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";
    this.baseUrl = defaultUrl.replace(/\/$/, "");
  }

  /**
   * Initialize and load user's preferred backend environment
   * Called automatically on first request
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const user = firebaseAuth.currentUser;
      if (!user) {
        // Not logged in, use default
        this.initialized = true;
        return;
      }

      // Load user's environment preference from Firestore
      const profileDoc = await getDoc(doc(firebaseDb, "profiles", user.uid));
      const preferredEnv = profileDoc.exists()
        ? (profileDoc.data().backend_environment as string | undefined)
        : undefined;

      // Set baseUrl based on preference
      this.baseUrl = this.getEnvironmentUrl(preferredEnv);
      this.initialized = true;
    } catch (error) {
      console.error("[apiClient] Failed to load environment preference:", error);
      // Continue with default URL
      this.initialized = true;
    }
  }

  /**
   * Get backend URL for a specific environment
   */
  private getEnvironmentUrl(environment?: string): string {
    const prodUrl = import.meta.env.VITE_API_BASE_URL_PRODUCTION;
    const labUrl = import.meta.env.VITE_API_BASE_URL_LAB;
    const defaultUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";

    if (environment === "lab" && labUrl) {
      return labUrl.replace(/\/$/, "");
    } else if (environment === "production" && prodUrl) {
      return prodUrl.replace(/\/$/, "");
    } else {
      // If no preference or environment URLs not set, use default
      return defaultUrl.replace(/\/$/, "");
    }
  }

  /**
   * Reload API client with latest environment preference
   * Call this after user changes environment in settings
   */
  async reload(): Promise<void> {
    this.initialized = false;
    await this.initialize();
    console.log(`[apiClient] Reloaded with baseUrl: ${this.baseUrl}`);
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
    // Ensure environment is loaded before making request
    await this.initialize();

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

  /**
   * Convenience GET method
   */
  async get<TResponse>(
    endpoint: string,
    options: { requireAuth?: boolean } = {}
  ): Promise<{ data: TResponse }> {
    const data = await this.request<TResponse>(endpoint, {
      method: "GET",
      requireAuth: options.requireAuth,
    });
    return { data };
  }

  /**
   * Convenience POST method
   */
  async post<TResponse, TBody = unknown>(
    endpoint: string,
    body?: TBody,
    options: { requireAuth?: boolean } = {}
  ): Promise<{ data: TResponse }> {
    const data = await this.request<TResponse, TBody>(endpoint, {
      method: "POST",
      body,
      requireAuth: options.requireAuth,
    });
    return { data };
  }

  /**
   * Convenience PUT method
   */
  async put<TResponse, TBody = unknown>(
    endpoint: string,
    body?: TBody,
    options: { requireAuth?: boolean } = {}
  ): Promise<{ data: TResponse }> {
    const data = await this.request<TResponse, TBody>(endpoint, {
      method: "PUT",
      body,
      requireAuth: options.requireAuth,
    });
    return { data };
  }

  /**
   * Convenience DELETE method
   */
  async delete<TResponse = void>(
    endpoint: string,
    options: { requireAuth?: boolean } = {}
  ): Promise<{ data: TResponse }> {
    const data = await this.request<TResponse>(endpoint, {
      method: "DELETE",
      requireAuth: options.requireAuth,
    });
    return { data };
  }
}

export const apiClient = new APIClient();



