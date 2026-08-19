import { readInitData } from "./telegram";

export type ApiIssue = { field: string; message: string };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues: ApiIssue[];

  constructor(status: number, code: string, message: string, issues: ApiIssue[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.issues = issues;
  }

  /** Message for a specific form field, if the server flagged one. */
  issueFor(field: string): string | undefined {
    return this.issues.find((issue) => issue.field === field)?.message;
  }
}

type ApiRequest = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

/** Call a Mini App API route with the Telegram init data attached. */
export async function apiFetch<T>(path: string, request: ApiRequest = {}): Promise<T> {
  const initData = readInitData();
  if (!initData) {
    throw new ApiError(
      401,
      "unauthorized",
      "این صفحه باید از داخل تلگرام باز شود.",
    );
  }

  const headers: Record<string, string> = {
    Authorization: `tma ${initData}`,
    Accept: "application/json",
  };
  if (request.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method: request.method ?? "GET",
      headers,
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      signal: request.signal,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "network_error", "ارتباط با سرور برقرار نشد.");
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const body = (payload ?? {}) as { error?: string; code?: string; issues?: ApiIssue[] };
    throw new ApiError(
      response.status,
      body.code ?? "error",
      body.error ?? "خطای ناشناخته رخ داد.",
      Array.isArray(body.issues) ? body.issues : [],
    );
  }

  return payload as T;
}
