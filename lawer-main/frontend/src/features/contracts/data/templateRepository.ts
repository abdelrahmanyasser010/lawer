import type { ContractSlug, ContractTemplateDefinition } from "@zdraft/template-engine";
import { apiTemplateSource } from "./apiTemplateSource";
import { localTemplateSource } from "./localTemplateSource";

export type TemplateDefinitionOrigin = "api" | "shared-engine" | "local-fallback";

const sourceMode = process.env.NEXT_PUBLIC_TEMPLATE_SOURCE || "api";

export async function loadTemplateDefinition(
  slug: ContractSlug,
): Promise<{ definition: ContractTemplateDefinition; origin: TemplateDefinitionOrigin }> {
  if (sourceMode === "api" || sourceMode === "api-with-shared-fallback") {
    try {
      const remote = await apiTemplateSource.getBySlug(slug);
      if (remote) return { definition: remote, origin: "api" };
      throw new Error(`No published API template definition for ${slug}`);
    } catch (error) {
      if (sourceMode !== "api-with-shared-fallback") throw error;
      console.warn("Template API unavailable; using the explicit development fallback", error);
    }
  }

  const local = await localTemplateSource.getBySlug(slug);
  if (!local) throw new Error(`No template definition available for ${slug}`);
  return { definition: local, origin: sourceMode === "shared" ? "shared-engine" : "local-fallback" };
}
