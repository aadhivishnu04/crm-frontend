// ─── CENTRAL API CLIENT ──────────────────────────────────────────────────────
// Single place that knows the backend URL, attaches the JWT (issued at login
// and stored under 'itour_token'), and normalizes error handling across every
// dashboard. Replaces the old pattern of calling `fetch(`${API_BASE_URL}/x`)`
// directly from each component (which never sent an Authorization header).

export const API_BASE_URL = "https://crm-backend-2-qlza.onrender.com/api";

const TOKEN_KEY = 'itour_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

/**
 * apiFetch('/leads')
 * apiFetch('/leads', { method: 'POST', body: JSON.stringify(formData) })
 *
 * - Prepends API_BASE_URL.
 * - Attaches `Authorization: Bearer <token>` automatically when a token exists.
 * - Sets 'Content-Type: application/json' whenever a body is present.
 * - Defaults every request to `cache: 'no-store'` (matches the polling
 *   behavior the dashboards already relied on) — pass `cache: 'default'` to opt out.
 * - Resolves with the parsed JSON body directly (no manual `res.json()`).
 * - Throws ApiError on any non-2xx response, and on a 401 also clears the
 *   stored token and redirects to /login so the caller's try/catch is the
 *   only error-handling path needed.
 */
export const apiFetch = async (path, options = {}) => {
    const token = getToken();
    const { headers: customHeaders, ...restOptions } = options;

    const headers = {
        ...(restOptions.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(customHeaders || {}),
    };

    let res;
    try {
        res = await fetch(`${API_BASE_URL}${path}`, {
            cache: 'no-store',
            ...restOptions,
            headers,
        });
    } catch (networkErr) {
        throw new ApiError(networkErr.message || 'Network error', 0, null);
    }

    if (res.status === 401) {
        clearToken();
        if (typeof window !== 'undefined') window.location.href = '/login';
        throw new ApiError('Session expired. Please log in again.', 401, null);
    }

    // DELETE (and some PUTs) can return an empty body — guard before parsing.
    const contentType = res.headers.get('content-type') || '';
    let data = null;
    if (contentType.includes('application/json')) {
        data = await res.json().catch(() => null);
    }

    if (!res.ok) {
        const message = (data && (data.error || data.message)) || `Request failed (${res.status})`;
        throw new ApiError(message, res.status, data);
    }

    return data;
};