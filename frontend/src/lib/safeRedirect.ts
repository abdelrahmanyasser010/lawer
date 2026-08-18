export function safeInternalRedirect(raw: string | null | undefined, fallback: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://local.invalid";
    const resolved = new URL(raw, origin);
    if (resolved.origin !== origin) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
