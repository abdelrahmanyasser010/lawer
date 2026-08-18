"use client";

import { useEffect, useState } from "react";
import type { ContractSlug } from "@/types/zdraft";
import type { ContractTemplateDefinition } from "../domain/contractTemplate.types";
import { loadTemplateDefinition, type TemplateDefinitionOrigin } from "../data/templateRepository";

interface TemplateDefinitionState {
  definition: ContractTemplateDefinition | null;
  origin: TemplateDefinitionOrigin | null;
  loading: boolean;
  error: string | null;
}

export function useTemplateDefinition(slug: ContractSlug): TemplateDefinitionState {
  const [state, setState] = useState<TemplateDefinitionState>({
    definition: null,
    origin: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    setState((previous) => ({ ...previous, loading: true, error: null }));

    loadTemplateDefinition(slug)
      .then(({ definition, origin }) => {
        if (active) setState({ definition, origin, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            definition: null,
            origin: null,
            loading: false,
            error: error instanceof Error ? error.message : "تعذر تحميل تعريف القالب",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [slug]);

  return state;
}
