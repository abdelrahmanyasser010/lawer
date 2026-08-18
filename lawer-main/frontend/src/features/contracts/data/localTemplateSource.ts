import type { ContractSlug } from "@/types/zdraft";
import type { ContractTemplateSource } from "./templateSource";
import { localTemplateRegistry } from "../templates/registry";

export const localTemplateSource: ContractTemplateSource = {
  async getBySlug(slug: ContractSlug) {
    return localTemplateRegistry[slug] ?? null;
  },
};
