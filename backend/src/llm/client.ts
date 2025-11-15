import { GoogleGenAI } from "@google/genai";

export interface LLMConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl?: string;
}

export interface JSONGenerationParams {
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
  metadata?: Record<string, unknown>;
}

export class LLMClient {
  private googleClient?: GoogleGenAI;

  constructor(private readonly config: LLMConfig) {
    if (!config.apiKey) {
      throw new Error("Missing LLM API key");
    }
    if (!config.model) {
      throw new Error("Missing LLM model");
    }
  }

  async generateJSON<T>(params: JSONGenerationParams): Promise<T> {
    switch (this.config.provider) {
      case "openai":
        return this.generateViaOpenAI<T>(params);
      case "gemini":
      case "google":
        return this.generateViaGemini<T>(params);
      default:
        return this.generateViaOpenAICompatible<T>(params);
    }
  }

  private getGoogleClient(): GoogleGenAI {
    if (!this.googleClient) {
      this.googleClient = new GoogleGenAI({
        apiKey: this.config.apiKey,
      });
    }
    return this.googleClient;
  }

  private async generateViaOpenAI<T>(params: JSONGenerationParams): Promise<T> {
    const response = await fetch(
      this.config.baseUrl ?? "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: params.temperature ?? 0.2,
          max_output_tokens: params.maxOutputTokens ?? 1024,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: params.schemaName,
              schema: params.schema,
              strict: true,
            },
          },
          messages: [
            { role: "system", content: params.systemPrompt.trim() },
            { role: "user", content: params.userPrompt.trim() },
          ],
          metadata: params.metadata,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenAI request failed (${response.status}): ${errorBody}`
      );
    }

    const json = await response.json();
    const content = json?.output?.[0]?.content?.[0]?.text ?? json?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("LLM response missing text content");
    }
    return JSON.parse(content) as T;
  }

  // Works for providers that implement the Chat Completions API w/ JSON mode.
  private async generateViaOpenAICompatible<T>(
    params: JSONGenerationParams
  ): Promise<T> {
    const response = await fetch(
      this.config.baseUrl ?? "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: params.temperature ?? 0.2,
          max_tokens: params.maxOutputTokens ?? 1024,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: params.systemPrompt.trim() },
            { role: "user", content: params.userPrompt.trim() },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `${this.config.provider} request failed (${response.status}): ${errorBody}`
      );
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("LLM response missing text content");
    }
    return JSON.parse(content) as T;
  }

  private async generateViaGemini<T>(params: JSONGenerationParams): Promise<T> {
    const client = this.getGoogleClient();
    const response = await client.models.generateContent({
      model: this.config.model,
      contents: [
        { role: "user", parts: [{ text: params.userPrompt.trim() }] },
      ],
      config: {
        systemInstruction: {
          role: "system",
          parts: [{ text: params.systemPrompt.trim() }],
        },
        responseMimeType: "application/json",
        responseJsonSchema: params.schema,
        temperature: params.temperature ?? 0.2,
        maxOutputTokens: params.maxOutputTokens ?? 1024,
      },
    });

    const text = response.text;
    if (typeof text !== "string" || !text.trim()) {
      throw new Error("Gemini response missing text content");
    }

    try {
      return JSON.parse(text) as T;
    } catch (error) {
      throw new Error(`Gemini response was not valid JSON: ${text}`);
    }
  }
}
