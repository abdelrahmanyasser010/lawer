import type {
  AuthUser,
  ContractDetails,
  ContractSummary,
  CustomerNotification,
  CustomerProfile,
  PublicCatalog,
  ServiceRequestDetails,
  ServiceRequestSummary,
} from "@/types/customer";
import { demoApiRequest, demoMode } from "./demoApi";

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const API_BASE_URL = configuredApiBaseUrl ? configuredApiBaseUrl.replace(/\/$/, "") : "";
const CSRF_COOKIE_NAME = process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || "zdraft_user_csrf";
const CSRF_SESSION_KEY = "zdraft_csrf_session";

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
  details?: unknown;
  requestId?: string;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
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

export function apiUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new ApiClientError(
      "تعذر الاتصال بالخدمة حاليًا. حاول مرة أخرى بعد قليل.",
      503,
      "API_NOT_CONFIGURED",
    );
  }
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (demoMode) return demoApiRequest<T>(path, init);

  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const token = csrfToken();
    if (token) headers.set("X-CSRF-Token", token);
  }
  const response = await fetch(apiUrl(path), {
    cache: "no-store",
    ...init,
    headers,
    credentials: "include",
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success) {
    throw new ApiClientError(payload?.message || `فشل الطلب (${response.status})`, response.status, payload?.code, payload?.details);
  }
  rememberCsrfToken(payload.data);
  if (path === "/api/v1/auth/logout") clearCsrfToken();
  return payload.data as T;
}

export const frontendApi = {
  catalog: () => apiRequest<PublicCatalog>("/api/v1/catalog"),
  register: (body: Record<string, unknown>) => apiRequest<{ user: AuthUser; verificationRequired: boolean; otpExpiresMinutes: number; csrfToken: string; debugVerificationCode?: string }>("/api/v1/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (email: string, password: string) => apiRequest<{ user: AuthUser; csrfToken: string }>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => apiRequest<null>("/api/v1/auth/logout", { method: "POST" }),
  me: () => apiRequest<{ user: AuthUser; csrfToken: string }>("/api/v1/auth/me"),
  verifyEmail: (code: string) => apiRequest<{ verified: boolean; alreadyVerified?: boolean }>("/api/v1/auth/email-verification/verify", { method: "POST", body: JSON.stringify({ code }) }),
  requestVerification: () => apiRequest<{ alreadyVerified?: boolean; expiresMinutes?: number; resendAfterSeconds?: number; debugVerificationCode?: string }>("/api/v1/auth/email-verification/request", { method: "POST" }),
  forgotPassword: (email: string) => apiRequest<Record<string, unknown>>("/api/v1/auth/password/forgot", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) => apiRequest<{ reset: boolean }>("/api/v1/auth/password/reset", { method: "POST", body: JSON.stringify({ token, password }) }),
  profile: () => apiRequest<CustomerProfile>("/api/v1/users/profile"),
  updateProfile: (body: Partial<CustomerProfile>) => apiRequest<CustomerProfile>("/api/v1/users/profile", { method: "PATCH", body: JSON.stringify(body) }),
  contracts: () => apiRequest<ContractSummary[]>("/api/v1/contracts/my"),
  contract: (id: number | string) => apiRequest<ContractDetails>(`/api/v1/contracts/${id}`),
  requests: () => apiRequest<ServiceRequestSummary[]>("/api/v1/service-requests/my"),
  request: (id: number | string) => apiRequest<ServiceRequestDetails>(`/api/v1/service-requests/${id}`),
  notifications: () => apiRequest<{ items: CustomerNotification[]; unreadCount: number }>("/api/v1/notifications"),
};
