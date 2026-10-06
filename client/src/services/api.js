export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors || {};
  }
}

let onSessionExpired = () => {};
export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler;
}

// The session lives in an HTTP-only cookie set by the server. Requests that
// change something must also carry a CSRF token, fetched once and reused.
let csrfToken = null;

async function loadCsrfToken() {
  const res = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
  csrfToken = (await res.json()).csrfToken;
}

async function send(method, path, body) {
  const changes = method !== 'GET';
  if (changes && !csrfToken) await loadCsrfToken();
  return fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(changes ? { 'X-CSRFToken': csrfToken } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function request(method, path, body) {
  let res;
  let data;
  try {
    res = await send(method, path, body);
    data = await res.json().catch(() => null);
    // A token from an expired session is replaced and the request sent again.
    if (res.status === 400 && data?.code === 'csrf') {
      csrfToken = null;
      res = await send(method, path, body);
      data = await res.json().catch(() => null);
    }
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.');
  }

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/login')) onSessionExpired();
    throw new ApiError(res.status, data?.message || 'Something went wrong. Please try again.', data?.errors);
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body = {}) => request('POST', path, body),
  patch: (path, body = {}) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};
