import { demoDashboardRequest, demoMode } from "./demoApi";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
const CSRF_COOKIE_NAME = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || "zdraft_csrf";

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

function csrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const cookie = document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${CSRF_COOKIE_NAME}=`));
  return cookie ? decodeURIComponent(cookie.slice(CSRF_COOKIE_NAME.length + 1)) : undefined;
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
  const response = await fetch(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    ...init,
    headers,
    credentials: "include",
    cache: init.cache ?? "no-store",
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success) throw new DashboardApiError(payload?.message || `فشل الطلب (${response.status})`, response.status, payload?.code, payload?.details);
  return payload.data as T;
}

export const dashboardApi = {
  login: (email: string, password: string) => dashboardRequest<{ user: DashboardUser }>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => dashboardRequest<{ user: DashboardUser }>("/api/v1/auth/me"),
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
