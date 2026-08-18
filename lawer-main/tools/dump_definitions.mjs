
import { rentalTemplateDefinition, apartmentSaleTemplateDefinition, freelancerTemplateDefinition } from '../packages/template-engine/dist/index.js';
import fs from 'fs';
import path from 'path';

fs.writeFileSync('backend/database/template-definitions/rental.json', JSON.stringify(rentalTemplateDefinition, null, 2), 'utf8');
fs.writeFileSync('backend/database/template-definitions/apartment_sale.json', JSON.stringify(apartmentSaleTemplateDefinition, null, 2), 'utf8');
fs.writeFileSync('backend/database/template-definitions/freelancer.json', JSON.stringify(freelancerTemplateDefinition, null, 2), 'utf8');
console.log('Template definitions JSON updated successfully.');
