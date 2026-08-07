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
  if (typeof document === "undefined") return undefined;
  const item = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${CSRF_COOKIE_NAME}=`));
  return item ? decodeURIComponent(item.slice(CSRF_COOKIE_NAME.length + 1)) : undefined;
}

export function apiUrl(path: string): string {
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
    ...init,
    headers,
    credentials: "include",
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success) {
    throw new ApiClientError(payload?.message || `فشل الطلب (${response.status})`, response.status, payload?.code, payload?.details);
  }
  return payload.data as T;
}

export const frontendApi = {
  catalog: () => apiRequest<PublicCatalog>("/api/v1/catalog"),
  register: (body: Record<string, unknown>) => apiRequest<{ user: AuthUser; verificationRequired: boolean; otpExpiresMinutes: number; debugVerificationCode?: string }>("/api/v1/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (email: string, password: string) => apiRequest<{ user: AuthUser }>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => apiRequest<null>("/api/v1/auth/logout", { method: "POST" }),
  me: () => apiRequest<{ user: AuthUser }>("/api/v1/auth/me"),
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
