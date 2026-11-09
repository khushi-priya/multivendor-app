const BASE = '/api/v1';

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details || {};
  }
}

async function request(method, path, body) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = {
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'include',
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError(
      0,
      'Unable to connect to the server. Check your connection and try again.',
    );
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    const fallback =
      res.status >= 500
        ? 'The server could not complete this request. Please try again.'
        : `The request failed (HTTP ${res.status}).`;
    throw new ApiError(
      res.status,
      (data && data.error) || fallback,
      data && data.details,
    );
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b ?? {}),
  patch: (p, b) => request('PATCH', p, b),
  put: (p, b) => request('PUT', p, b),
  delete: (p) => request('DELETE', p),
  upload: (p, formData) => request('POST', p, formData),
};
