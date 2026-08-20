export type ApiIssue = { field: string; message: string };

/**
 * Admin API client.
 *
 * The session travels as the `HttpOnly` cookie the browser attaches to
 * same-origin requests. Nothing here reads or writes a token, because nothing
 * in the browser is allowed to see one.
 */
export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues: ApiIssue[];

  constructor(status: number, code: string, message: string, issues: ApiIssue[] = []) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
    this.issues = issues;
  }

  issueFor(field: string): string | undefined {
    return this.issues.find((issue) => issue.field === field)?.message;
  }
}

type AdminRequest = {
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  body?: unknown;
  /** Sent as multipart; mutually exclusive with `body`. */
  file?: File;
  signal?: AbortSignal;
};

async function parseResponse<T>(response: Response): Promise<T> {
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
    throw new AdminApiError(
      response.status,
      body.code ?? "error",
      body.error ?? "خطای ناشناخته رخ داد.",
      Array.isArray(body.issues) ? body.issues : [],
    );
  }

  return payload as T;
}

export async function adminFetch<T>(path: string, request: AdminRequest = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;

  if (request.file) {
    const form = new FormData();
    form.append("file", request.file);
    body = form;
    // `Content-Type` is left to the browser so it can add the multipart boundary.
  } else if (request.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(request.body);
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method: request.method ?? "GET",
      headers,
      body,
      signal: request.signal,
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new AdminApiError(0, "network_error", "ارتباط با سرور برقرار نشد.");
  }

  return parseResponse<T>(response);
}
