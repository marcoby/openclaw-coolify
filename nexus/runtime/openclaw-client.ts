/**
 * OpenClaw HTTP Client
 *
 * Calls OpenClaw's OpenAI-compatible chat completions endpoint.
 * Endpoint: POST /v1/chat/completions
 * Auth: Bearer token
 */

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  model?: string;
  messages: ChatMessage[];
  response_format?: { type: "json_object" | "text" };
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenClawClientOptions {
  baseUrl: string;
  token: string;
  model?: string;
  agentId?: string;
  timeout?: number;
}

// ============================================================================
// Client
// ============================================================================

export class OpenClawClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly model: string;
  private readonly agentId?: string;
  private readonly timeout: number;

  constructor(options: OpenClawClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, ""); // remove trailing slash
    this.token = options.token;
    this.model = options.model || "openclaw";
    this.agentId = options.agentId;
    this.timeout = options.timeout || 60000; // 60s default
  }

  /**
   * Send a chat completion request
   */
  async chat(request: Omit<ChatRequest, "model" | "stream">): Promise<string> {
    const url = `${this.baseUrl}/v1/chat/completions`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.token}`,
    };

    // Add agent ID header if specified
    if (this.agentId) {
      headers["x-openclaw-agent-id"] = this.agentId;
    }

    const body: ChatRequest = {
      model: this.model,
      messages: request.messages,
      stream: false,
    };

    if (request.response_format) {
      body.response_format = request.response_format;
    }
    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }
    if (request.max_tokens !== undefined) {
      body.max_tokens = request.max_tokens;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");

        // Detect token/quota errors
        if (response.status === 429 || errorText.toLowerCase().includes("quota")) {
           throw new OpenClawError(`🛑 TOKEN QUOTA EXCEEDED: ${errorText}`, response.status);
        }
        if (errorText.includes("context_length_exceeded")) {
           throw new OpenClawError(`🛑 CONTEXT WINDOW EXCEEDED: The history is too long for the model. ${errorText}`, response.status);
        }

        throw new OpenClawError(
          `OpenClaw request failed (${response.status}): ${errorText}`,
          response.status
        );
      }

      const data = (await response.json()) as ChatResponse;

      // Log Usage
      if (data.usage) {
        const { prompt_tokens, completion_tokens, total_tokens } = data.usage;
        // Print to stderr to capture user attention without breaking stdout pipes
        console.error(`[Token Usage] P: ${prompt_tokens} + C: ${completion_tokens} = ${total_tokens}`);
      }

      // Extract content from OpenAI-style response
      const content = data.choices?.[0]?.message?.content;

      if (typeof content !== "string") {
        throw new OpenClawError(
          `OpenClaw returned unexpected response format: ${JSON.stringify(data).slice(0, 500)}`,
          500
        );
      }

      return content;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof OpenClawError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new OpenClawError(`OpenClaw request timed out after ${this.timeout}ms`, 408);
      }

      throw new OpenClawError(
        `OpenClaw request failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        500
      );
    }
  }

  /**
   * Simple helper for JSON responses
   */
  async chatJson<T = unknown>(prompt: string, systemPrompt?: string): Promise<T> {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const content = await this.chat({
      messages,
      response_format: { type: "json_object" },
    });

    try {
      return JSON.parse(content) as T;
    } catch {
      // Try to extract JSON from markdown fences
      const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        return JSON.parse(match[1]) as T;
      }
      throw new OpenClawError(`Failed to parse JSON response: ${content.slice(0, 200)}`, 500);
    }
  }
}

// ============================================================================
// Error
// ============================================================================

export class OpenClawError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "OpenClawError";
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let clientInstance: OpenClawClient | null = null;

export function getOpenClawClient(): OpenClawClient {
  if (!clientInstance) {
    const baseUrl = process.env.OPENCLAW_URL;
    const token = process.env.OPENCLAW_TOKEN || process.env.OPENCLAW_GATEWAY_TOKEN;

    if (!baseUrl) {
      throw new Error("OPENCLAW_URL environment variable is required");
    }
    if (!token) {
      throw new Error("OPENCLAW_TOKEN or OPENCLAW_GATEWAY_TOKEN environment variable is required");
    }

    clientInstance = new OpenClawClient({
      baseUrl,
      token,
      model: process.env.OPENCLAW_MODEL || "openclaw",
      agentId: process.env.OPENCLAW_AGENT_ID,
      timeout: parseInt(process.env.OPENCLAW_TIMEOUT || "60000", 10),
    });
  }

  return clientInstance;
}

/**
 * Reset client instance (useful for testing)
 */
export function resetOpenClawClient(): void {
  clientInstance = null;
}
