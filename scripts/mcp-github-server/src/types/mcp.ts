export interface McpRequest {
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface McpResponse {
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

