import type { DashboardUser } from "./apiClient";

const KEY = "zdraft-dashboard-user";
let memory: DashboardUser | null = null;

export function setDashboardUser(user: DashboardUser | null) {
  memory = user;
  if (typeof window === "undefined") return;
  if (user) window.sessionStorage.setItem(KEY, JSON.stringify(user));
  else window.sessionStorage.removeItem(KEY);
}

export function getDashboardUser(): DashboardUser | null {
  if (memory) return memory;
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return null;
  try { memory = JSON.parse(raw) as DashboardUser; return memory; }
  catch { window.sessionStorage.removeItem(KEY); return null; }
}
