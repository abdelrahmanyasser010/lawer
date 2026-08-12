"use client";

import { useEffect, useState } from "react";
import { frontendApi } from "@/lib/apiClient";
import type { PublicCatalog } from "@/types/customer";

const fallback: PublicCatalog = {
  templates: [],
  services: {
    contractReviewDepositEgp: 0,
    consultationDepositEgp: 0,
    consultationFeeEgp: 0,
    contractDraftingDepositEgp: 0,
  },
  office: {
    displayName: "Z draft",
    address: "",
    whatsappNumber: "",
    consultationWhatsappNumber: "",
    supportWhatsappNumber: "",
    supportPhone: "",
    supportEmail: "",
  },
  payment: {
    // Payment destination must come from the backend catalog so the dashboard
    // remains the single source of truth. Never hard-code a wallet in the client.
    vodafoneCashNumber: "",
  },
  policies: {
    selfServiceEditHours: 24,
    communicationChannels: ["zoom", "whatsapp"],
    chatEnabled: false,
  },
};

export function usePublicCatalog() {
  const [catalog, setCatalog] = useState<PublicCatalog>(fallback);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    frontendApi.catalog()
      .then((value) => {
        if (!active) return;
        setCatalog(value);
        setLoadError(false);
      })
      .catch(() => { if (active) setLoadError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { catalog, loading, loadError };
}
