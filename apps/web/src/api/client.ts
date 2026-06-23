const BASE_URL = '/api';
const SAFE_METHODS = new Set(['GET', 'HEAD']);

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Reads a cookie value from a cookie string (defaults to document.cookie). */
export function readCookie(name: string, cookieString: string = document.cookie): string | null {
  const prefix = `${name}=`;
  for (const part of cookieString.split('; ')) {
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length));
    }
  }
  return null;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
}

/**
 * Thin fetch wrapper for the same-origin API: sends cookies, attaches the
 * double-submit CSRF header on mutating requests, and unwraps JSON / errors.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers['content-type'] = 'application/json';
  }
  if (!SAFE_METHODS.has(method)) {
    const csrf = readCookie('psa_csrf');
    if (csrf) {
      headers['x-csrf-token'] = csrf;
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'message' in data
        ? String((data as { message: unknown }).message)
        : response.statusText;
    throw new ApiError(response.status, message, data);
  }
  return data as T;
}
