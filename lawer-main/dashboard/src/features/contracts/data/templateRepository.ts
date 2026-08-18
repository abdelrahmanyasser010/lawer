import {
  localTemplateRegistry,
  type ContractSlug,
  type ContractTemplateDefinition,
} from "@zdraft/template-engine";
import { dashboardRequest } from "@/lib/apiClient";

const sourceMode = process.env.NEXT_PUBLIC_TEMPLATE_SOURCE || "api";

export type TemplateOrigin = "api" | "shared-fallback";

export async function loadTemplateDefinition(
  slug: ContractSlug,
): Promise<{ definition: ContractTemplateDefinition; origin: TemplateOrigin }> {
  try {
    const definition = await dashboardRequest<ContractTemplateDefinition>(`/api/v1/templates/${slug}/definition`);
    return { definition, origin: "api" };
  } catch (error) {
    if (sourceMode !== "api-with-shared-fallback") throw error;
    const definition = localTemplateRegistry[slug];
    if (!definition) throw error;
    return { definition, origin: "shared-fallback" };
  }
}
