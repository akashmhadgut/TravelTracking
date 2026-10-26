export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code?: string;
  instance?: string;
  invalidParams?: Array<{ name: string; reason: string }>;
}

export class ProblemError extends Error {
  public problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.detail || problem.title);
    this.name = 'ProblemError';
    this.problem = problem;
  }
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('fleet_token');

  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json, application/problem+json');
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    if (contentType.includes('application/problem+json') || contentType.includes('application/json')) {
      const errorJson = await res.json();
      throw new ProblemError({
        type: errorJson.type || 'urn:fleet:error:generic',
        title: errorJson.title || 'Request Failed',
        status: errorJson.status || res.status,
        detail: errorJson.detail || res.statusText || 'An unexpected error occurred.',
        code: errorJson.code || `http.${res.status}`,
        invalidParams: errorJson.invalidParams,
      });
    }

    throw new ProblemError({
      type: 'urn:fleet:error:http',
      title: res.statusText || 'HTTP Error',
      status: res.status,
      detail: `Server returned HTTP status ${res.status}`,
      code: `http.${res.status}`,
    });
  }

  if (res.status === 204) {
    return {} as T;
  }

  return (await res.json()) as T;
}
