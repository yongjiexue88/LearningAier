import { firebaseAuth } from "./firebaseClient";

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
   * Initialize the API client
   * Called automatically on first request
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Set baseUrl from environment
    this.baseUrl = this.getEnvironmentUrl();



    this.initialized = true;
  }

  /**
   * Get backend URL - always uses the configured VITE_API_BASE_URL
   */
  private getEnvironmentUrl(): string {
    const url = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";
    return url.replace(/\/$/, "");
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

    const data = await response.json();



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


