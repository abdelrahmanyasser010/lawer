import type { ContractSlug } from "../types.ts";
import type { ContractTemplateDefinition } from "../types.ts";
import { rentalTemplateDefinition } from "./rental/definition.ts";
import { apartmentSaleTemplateDefinition } from "./apartment-sale/definition.ts";
import { freelancerTemplateDefinition } from "./freelancer/definition.ts";

export const localTemplateRegistry: Record<string, ContractTemplateDefinition> = {
  rental: rentalTemplateDefinition,
  apartment_sale: apartmentSaleTemplateDefinition,
  freelancer: freelancerTemplateDefinition,
};
