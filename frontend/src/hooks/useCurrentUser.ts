"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiClientError, frontendApi } from "@/lib/apiClient";
import type { AuthUser } from "@/types/customer";

export function useCurrentUser() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await frontendApi.me();
      setUser(result.user);
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.status !== 401) console.error(error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const listener = () => void refresh();
    window.addEventListener("zdraft-auth-changed", listener);
    return () => window.removeEventListener("zdraft-auth-changed", listener);
  }, [refresh]);

  return { user, loading, refresh };
}
