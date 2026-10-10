"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiClientError, frontendApi } from "@/lib/apiClient";

type PaymentAccessState = "checking" | "verified" | "guest" | "unverified";

/**
 * Checkout access guard only.
 * Customer payment is gateway-only; this hook no longer loads transfer instructions.
 */
export function usePaymentAccess(returnPath: string) {
  const router = useRouter();
  const [state, setState] = useState<PaymentAccessState>("checking");

  const refresh = useCallback(async () => {
    setState("checking");
    try {
      const result = await frontendApi.me();
      if (!result.user.emailVerified) {
        setState("unverified");
        return false;
      }
      setState("verified");
      return true;
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        setState("guest");
        return false;
      }
      setState("guest");
      return false;
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const requireVerified = useCallback(async () => {
    let current = state;
    if (current === "checking") {
      try {
        const result = await frontendApi.me();
        current = result.user.emailVerified ? "verified" : "unverified";
        setState(current);
      } catch {
        current = "guest";
        setState("guest");
      }
    }
    if (current === "verified") return true;
    if (current === "unverified") router.push(`/verify-email?next=${encodeURIComponent(returnPath)}`);
    else router.push(`/login?next=${encodeURIComponent(returnPath)}`);
    return false;
  }, [returnPath, router, state]);

  return {
    paymentAccess: state,
    paymentVerified: state === "verified",
    requireVerified,
    refreshPaymentAccess: refresh,
  };
}
