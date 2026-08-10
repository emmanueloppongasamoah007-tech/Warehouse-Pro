// Read as a static `process.env.X` member expression. Expo's Babel plugin inlines
// EXPO_PUBLIC_* vars at build time by matching this exact shape; computed access
// such as process.env[name] is not inlined and resolves to undefined in the bundle.
const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error(
    'Missing EXPO_PUBLIC_API_BASE_URL. Set it in frontend/.env to the LAN address ' +
      'of the Spring Boot backend (e.g. http://172.20.10.2:8080), then restart Metro ' +
      'with `npx expo start -c` so the value is inlined into the bundle.',
  );
}

// Trailing slash here plus a leading slash in `path` would produce a double slash,
// which Spring treats as a different route and answers with 404.
const baseUrl = apiBaseUrl.replace(/\/+$/, '');

/**
 * Error thrown when the backend answers with a non-2xx status.
 *
 * `status` and `body` are kept as fields so callers can branch on them
 * (e.g. show a validation message on 400) without parsing the message string.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: string;
  readonly url: string;

  constructor(status: number, body: string, url: string) {
    super(`API ${status} for ${url}: ${body || '<empty response body>'}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

/**
 * Shared response handling for every request in this module.
 *
 * Kept separate so apiGet and apiPost cannot drift in how they report failures.
 */
async function handleResponse<T>(response: Response, url: string): Promise<T> {
  if (!response.ok) {
    // Read as text, not JSON: Spring's error body is JSON for handled errors but
    // can be an HTML page or empty, and a parse failure here would mask the real status.
    const text = await response.text().catch(() => '');
    throw new ApiError(response.status, text, url);
  }

  // 204 has no body; calling .json() on it throws.
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/**
 * Wraps fetch so transport failures carry the URL.
 *
 * fetch only rejects on transport failure, and React Native surfaces that as a
 * bare "Network request failed" with no address. On a physical device this is
 * nearly always a LAN/firewall issue rather than a bug in the request itself.
 */
async function request(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (cause) {
    throw new Error(
      `Could not reach the backend at ${url}. Confirm the device is on the same ` +
        `network and EXPO_PUBLIC_API_BASE_URL points at the machine's LAN address, ` +
        `not localhost.`,
      { cause },
    );
  }
}

/**
 * GET JSON from the backend.
 *
 * @param path Route beginning with a slash, e.g. '/api/aisles'
 * @throws ApiError on any non-2xx response, carrying the status and response text
 *
 * @example
 * const aisles = await apiGet<Aisle[]>('/api/aisles');
 */
export async function apiGet<T>(path: string): Promise<T> {
  const url = `${baseUrl}${path}`;
  const response = await request(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return handleResponse<T>(response, url);
}

/**
 * POST JSON to the backend and parse the JSON response.
 *
 * @param path Route beginning with a slash, e.g. '/api/routes/optimize'
 * @param body Serialized to JSON as the request body
 * @throws ApiError on any non-2xx response, carrying the status and response text
 *
 * @example
 * const route = await apiPost<RouteResponse>('/api/routes/optimize', {
 *   startCode: 'PACK-01',
 *   pickListCodes: ['A1-B03', 'A2-B10'],
 * });
 */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const url = `${baseUrl}${path}`;
  const response = await request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response, url);
}

/**
 * PUT JSON to the backend and parse the JSON response.
 *
 * Used for full replacement of a resource, as opposed to apiPatch's partial
 * update: /api/warehouse takes the complete object on every save.
 *
 * @param path Route beginning with a slash, e.g. '/api/warehouse'
 * @param body Serialized to JSON as the request body
 * @throws ApiError on any non-2xx response, carrying the status and response text
 */
export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const url = `${baseUrl}${path}`;
  const response = await request(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response, url);
}

/**
 * DELETE a resource.
 *
 * Typed as unknown-returning because the delete endpoints answer 204 with no
 * body; handleResponse already maps that to undefined.
 *
 * @param path Route beginning with a slash, e.g. '/api/aisles/3'
 * @throws ApiError on any non-2xx response, carrying the status and response text
 */
export async function apiDelete<T = void>(path: string): Promise<T> {
  const url = `${baseUrl}${path}`;
  const response = await request(url, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  return handleResponse<T>(response, url);
}

/**
 * PATCH to the backend and parse the JSON response.
 *
 * `body` is optional: the order endpoints encode their whole intent in the URL
 * (.../pick, .../complete) and take no payload, so the request is sent without
 * a body - and without a Content-Type - when none is given.
 *
 * @param path Route beginning with a slash, e.g. '/api/orders/1/complete'
 * @throws ApiError on any non-2xx response, carrying the status and response text
 *
 * @example
 * const order = await apiPatch<Order>(`/api/orders/${orderId}/complete`);
 */
export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const url = `${baseUrl}${path}`;
  const hasBody = body !== undefined;
  const response = await request(url, {
    method: 'PATCH',
    headers: hasBody
      ? { 'Content-Type': 'application/json', Accept: 'application/json' }
      : { Accept: 'application/json' },
    body: hasBody ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response, url);
}
