"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { ApiClientError, frontendApi } from "@/lib/apiClient";
import type { AuthUser } from "@/types/customer";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  refreshPromise: Promise<void> | null;
  refresh: () => Promise<void>;
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,
  refreshPromise: null,
  refresh: () => {
    const state = get();
    // If a request is already in progress, return the same promise to prevent duplicates
    if (state.refreshPromise) return state.refreshPromise;

    const promise = (async () => {
      set({ loading: true });
      try {
        const result = await frontendApi.me();
        set({ user: result.user, initialized: true, refreshPromise: null });
      } catch (error) {
        if (!(error instanceof ApiClientError) || error.status !== 401) console.error(error);
        set({ user: null, initialized: true, refreshPromise: null });
      } finally {
        set({ loading: false });
      }
    })();

    set({ refreshPromise: promise });
    return promise;
  },
}));

export function useCurrentUser() {
  const { user, loading, initialized, refresh } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      void refresh();
    }
    
    // Listen for cross-component auth changes (e.g. login, logout)
    const listener = () => void refresh();
    window.addEventListener("zdraft-auth-changed", listener);
    return () => window.removeEventListener("zdraft-auth-changed", listener);
  }, [initialized, refresh]);

  return { user, loading, refresh };
}
