import type { ContractSlug } from "../types";
import type { ContractTemplateDefinition } from "../types";
import { rentalTemplateDefinition } from "./rental/definition";
import { apartmentSaleTemplateDefinition } from "./apartment-sale/definition";
import { freelancerTemplateDefinition } from "./freelancer/definition";

export const localTemplateRegistry: Record<string, ContractTemplateDefinition> = {
  rental: rentalTemplateDefinition,
  apartment_sale: apartmentSaleTemplateDefinition,
  freelancer: freelancerTemplateDefinition,
};
