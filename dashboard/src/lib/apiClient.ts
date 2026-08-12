import { demoDashboardRequest, demoMode } from "./demoApi";

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const API_BASE_URL = configuredApiBaseUrl ? configuredApiBaseUrl.replace(/\/$/, "") : "";
const CSRF_COOKIE_NAME = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || "zdraft_admin_csrf";
const CSRF_SESSION_KEY = "zdraft_csrf_session";

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  details?: unknown;
  requestId?: string;
}

export class DashboardApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string, public readonly details?: unknown) {
    super(message);
  }
}

export function dashboardApiUrl(path: string): string {
  if (!API_BASE_URL) throw new DashboardApiError("لم يتم ربط لوحة التحكم بخادم الـAPI. اضبط NEXT_PUBLIC_API_URL ثم أعد النشر.", 503, "API_NOT_CONFIGURED");
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function csrfToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const stored = window.sessionStorage.getItem(CSRF_SESSION_KEY)?.trim();
    if (stored) return stored;
  } catch {
    // Fall back to a readable same-site CSRF cookie when session storage is unavailable.
  }
  const cookie = document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${CSRF_COOKIE_NAME}=`));
  return cookie ? decodeURIComponent(cookie.slice(CSRF_COOKIE_NAME.length + 1)) : undefined;
}

function rememberCsrfToken(data: unknown): void {
  if (typeof window === "undefined" || !data || typeof data !== "object") return;
  const token = (data as { csrfToken?: unknown }).csrfToken;
  if (typeof token !== "string" || !token.trim()) return;
  try { window.sessionStorage.setItem(CSRF_SESSION_KEY, token.trim()); } catch { /* same-site cookie fallback remains available */ }
}

function clearCsrfToken(): void {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(CSRF_SESSION_KEY); } catch { /* nothing else to clear client-side */ }
}

export async function dashboardRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (demoMode) return demoDashboardRequest<T>(path, init);

  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const token = csrfToken();
    if (token) headers.set("X-CSRF-Token", token);
  }
  const response = await fetch(dashboardApiUrl(path), {
    ...init,
    headers,
    credentials: "include",
    cache: init.cache ?? "no-store",
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success) throw new DashboardApiError(payload?.message || `فشل الطلب (${response.status})`, response.status, payload?.code, payload?.details);
  rememberCsrfToken(payload.data);
  if (path === "/api/v1/auth/logout") clearCsrfToken();
  return payload.data as T;
}

export const dashboardApi = {
  login: (email: string, password: string) => dashboardRequest<{ user: DashboardUser; csrfToken: string }>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => dashboardRequest<{ user: DashboardUser; csrfToken: string }>("/api/v1/auth/me"),
  logout: () => dashboardRequest<null>("/api/v1/auth/logout", { method: "POST" }),
  forgotPassword: (email: string) => dashboardRequest<Record<string, unknown>>("/api/v1/auth/password/forgot", { method: "POST", body: JSON.stringify({ email, audience: "dashboard" }) }),
  resetPassword: (token: string, password: string) => dashboardRequest<{ reset: boolean }>("/api/v1/auth/password/reset", { method: "POST", body: JSON.stringify({ token, password }) }),
  changePassword: (currentPassword: string, newPassword: string) => dashboardRequest<{ changed: boolean }>("/api/v1/auth/password/change", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),
  sessions: () => dashboardRequest<Array<Record<string, unknown>>>("/api/v1/auth/sessions"),
  revokeSession: (id: string) => dashboardRequest<{ revoked: boolean }>(`/api/v1/auth/sessions/${id}`, { method: "DELETE" }),
};

export interface DashboardUser {
  id: number;
  publicId: string;
  name: string;
  email: string;
  emailVerified: boolean;
  roles: string[];
  permissions: string[];
  status: string;
  passwordChangeRequired?: boolean;
}
