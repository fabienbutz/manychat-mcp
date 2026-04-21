/**
 * ManyChat API client
 * Base URL: https://api.manychat.com
 * Auth: Bearer token
 *
 * Paths must include the namespace prefix (e.g. "/fb/page/getInfo", "/user/template/...").
 */

const BASE_URL = "https://api.manychat.com";

export class ManyChatClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`,
    };
  }

  async get(path: string, params?: Record<string, string>): Promise<ManyChatResponse> {
    const url = new URL(`${BASE_URL}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), { headers: this.headers });
    return this.handleResponse(response);
  }

  async post(path: string, body: Record<string, unknown>): Promise<ManyChatResponse> {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    return this.handleResponse(response);
  }

  private async handleResponse(response: Response): Promise<ManyChatResponse> {
    if (!response.ok) {
      throw new Error(`ManyChat API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as ManyChatResponse;

    if (data.status === "error") {
      const msg = data.message || "Unknown error";
      const details = data.details?.messages?.map((m: { message: string }) => m.message).join("; ") || "";
      throw new Error(`ManyChat API error: ${msg}${details ? ` (${details})` : ""}`);
    }

    return data;
  }
}

export interface ManyChatResponse {
  status: string;
  data?: Record<string, unknown>;
  message?: string;
  code?: number;
  details?: { messages?: Array<{ message: string }> };
}

let client: ManyChatClient | null = null;

export function getClient(): ManyChatClient {
  if (!client) {
    const token = process.env.MANYCHAT_API_KEY;
    if (!token) {
      throw new Error("MANYCHAT_API_KEY environment variable is required");
    }
    client = new ManyChatClient(token);
  }
  return client;
}

export function cleanData(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) cleaned[key] = value;
  }
  return cleaned;
}
