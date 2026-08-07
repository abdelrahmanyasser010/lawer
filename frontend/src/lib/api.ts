import { ContractSlug, ContractTemplate } from "@/types/zdraft";
import { apiRequest } from "@/lib/apiClient";

type ApiContractTemplate = Omit<ContractTemplate, "icon" | "sections"> & {
  icon?: string;
  sections?: ContractTemplate["sections"];
};

const templateIconBySlug: Record<ContractSlug, string> = {
  rental: "home",
  apartment_sale: "building",
  freelancer: "briefcase",
};

function normalizeTemplate(template: ApiContractTemplate): ContractTemplate {
  return {
    ...template,
    icon: template.icon || templateIconBySlug[template.slug],
    sections: template.sections || [],
  };
}

export async function fetchContractTemplates(): Promise<ContractTemplate[]> {
  const templates = await apiRequest<ApiContractTemplate[]>("/api/v1/templates");
  return templates.map(normalizeTemplate);
}
