import type { ContractSlug } from "@/types/zdraft";
import type { ContractTemplateDefinition } from "../domain/contractTemplate.types";

export interface ContractTemplateSource {
  getBySlug(slug: ContractSlug): Promise<ContractTemplateDefinition | null>;
}
