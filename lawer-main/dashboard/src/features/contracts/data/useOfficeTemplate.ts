"use client";

import { useEffect, useState } from "react";
import type { ContractSlug, ContractTemplateDefinition } from "@zdraft/template-engine";
import { loadTemplateDefinition, type TemplateOrigin } from "./templateRepository";

export function useOfficeTemplate(slug: ContractSlug) {
  const [definition, setDefinition] = useState<ContractTemplateDefinition | null>(null);
  const [origin, setOrigin] = useState<TemplateOrigin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadTemplateDefinition(slug)
      .then((result) => {
        if (!active) return;
        setDefinition(result.definition);
        setOrigin(result.origin);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "تعذر تحميل القالب");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  return { definition, origin, loading, error };
}
