import type { ContractSlug } from "../types";
import type { ContractTemplateDefinition } from "../types";
import { rentalTemplateDefinition } from "./rental/definition";
import { apartmentSaleTemplateDefinition } from "./apartment-sale/definition";
import { freelancerTemplateDefinition } from "./freelancer/definition";

export const localTemplateRegistry: Record<string, ContractTemplateDefinition> = {
  rental: rentalTemplateDefinition,
  rental_residential: rentalTemplateDefinition,
  rental_commercial: rentalTemplateDefinition,
  rental_administrative: rentalTemplateDefinition,
  apartment_sale: apartmentSaleTemplateDefinition,
  sale_preliminary: apartmentSaleTemplateDefinition,
  sale_registrable: apartmentSaleTemplateDefinition,
  sale_inherited: apartmentSaleTemplateDefinition,
  freelancer: freelancerTemplateDefinition,
  services_visual_identity: freelancerTemplateDefinition,
  services_website_development: freelancerTemplateDefinition,
  services_social_media: freelancerTemplateDefinition,
};
