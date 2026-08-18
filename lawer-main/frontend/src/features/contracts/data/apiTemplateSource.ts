import type { ContractSlug } from "@/types/zdraft";
import { apiRequest, ApiClientError } from "@/lib/apiClient";
import type { ContractTemplateDefinition } from "../domain/contractTemplate.types";
import type { ContractTemplateSource } from "./templateSource";

export const apiTemplateSource: ContractTemplateSource = {
  async getBySlug(slug: ContractSlug) {
    try {
      return await apiRequest<ContractTemplateDefinition>(`/api/v1/templates/${slug}/definition`);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) return null;
      throw error;
    }
  },
};
