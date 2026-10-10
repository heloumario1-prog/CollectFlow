const basePath = "/api/v1/";

// class ApiError is used to represent errors returned from the API
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fields: Record<string, string> = {},
    public readonly requestId?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}
// checks if a cookie with the given name exists and returns its value, or undefined if it does not exist
function cookieValue(name: string): string | undefined {
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

// returns the first string message found in the given value, or undefined if none is found
function firstMessage(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(firstMessage).find(Boolean);
  return undefined;
}
// recursively collects field errors from the given value and adds them to the fields object, using the given prefix for nested fields
function collectFields(
  value: unknown,
  prefix: string,
  fields: Record<string, string>
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const [key, detail] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (detail && typeof detail === "object" && !Array.isArray(detail))
      collectFields(detail, path, fields);
    else if (
      key !== "non_field_errors" &&
      key !== "detail" &&
      key !== "message"
    ) {
      const message = firstMessage(detail);
      if (message) fields[path] = message;
    }
  }
}
// handles the error response from the API and returns an ApiError instance
async function responseError(response: Response): Promise<ApiError> {
  const requestId = response.headers.get("X-Request-ID") ?? undefined;
  let body: unknown;
  //   if the response has a JSON content type, try to parse the body as JSON
  if (response.headers.get("content-type")?.includes("application/json")) {
    try {
      body = await response.json();
    } catch {
      /* Fall back to a safe message. */
    }
  }
  //   fields is a key value object of strings dict
  const fields: Record<string, string> = {};

  if (response.status === 400 && body && typeof body === "object") {
    // if error is a 400 Bad Request, collect field errors and return an ApiError
    const payload = body as Record<string, unknown>;
    // collects the field errors
    collectFields(payload.fields ?? payload.errors ?? payload, "", fields);
    // use the above apierror class
    return new ApiError(
      400,
      firstMessage(payload.non_field_errors) ??
        firstMessage(payload.detail) ??
        firstMessage(payload.message) ??
        "Please check the highlighted fields.",
      fields,
      requestId
    );
  }
  //  messages is a key value object of strings dict
  const messages: Record<number, string> = {
    401: "Please sign in to continue.",
    403: "You do not have permission to do this.",
    404: "This service could not be found.",
    409: "This request conflicts with a recent change. Please review and try again.",
    429: "Too many attempts. Please wait a moment before trying again.",
  };

  // use the above apierror class
  //   normal apierror throw if not error 400
  return new ApiError(
    response.status,
    messages[response.status] ??
      "We couldn't complete your request. Please try again.",
    fields,
    requestId
  );
}
//api client function that makes a request to the API
export async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    body?: unknown;
    signal?: AbortSignal;
  } = {}
): Promise<T> {
  // if not specified, default to GET method
  const method = options.method ?? "GET";
  const headers = new Headers({ Accept: "application/json" });
  if (method !== "GET") {
    // Login rotates Django's CSRF secret; obtain the current cookie for every unsafe request.
    const csrfResponse = await fetch(`${basePath}auth/csrf/`, {
      credentials: "include",
      cache: "no-store",
      signal: options.signal,
    });
    // if the csrf request fails, throw an error
    if (!csrfResponse.ok) throw await responseError(csrfResponse);
    const token = cookieValue("csrftoken");
    // if no value in the cookie, throw an error
    if (!token)
      throw new ApiError(
        0,
        "Could not establish a secure session. Refresh the page and try again."
      );
    //   set the headers for the request to include the csrf token and content type
    headers.set("X-CSRFToken", decodeURIComponent(token));
    headers.set("Content-Type", "application/json");
  }
  let response: Response;
  try {
    // throws the request and awaits for the response
    response = await fetch(`${basePath}${path.replace(/^\/+/, "")}`, {
      method,
      credentials: "include",
      cache: "no-store",
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(
      0,
      "The service is unavailable. Check your connection and try again."
    );
  }
  // if the response is not ok, throw an error
  if (!response.ok) throw await responseError(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
