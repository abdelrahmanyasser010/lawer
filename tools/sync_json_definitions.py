import json
import subprocess
from pathlib import Path

ROOT = Path(r"d:\android tog\laywer")

# Run node script to output json definitions from dist
node_script = """
import { rentalTemplateDefinition, apartmentSaleTemplateDefinition, freelancerTemplateDefinition } from '../packages/template-engine/dist/index.js';
import fs from 'fs';
import path from 'path';

fs.writeFileSync('backend/database/template-definitions/rental.json', JSON.stringify(rentalTemplateDefinition, null, 2), 'utf8');
fs.writeFileSync('backend/database/template-definitions/apartment_sale.json', JSON.stringify(apartmentSaleTemplateDefinition, null, 2), 'utf8');
fs.writeFileSync('backend/database/template-definitions/freelancer.json', JSON.stringify(freelancerTemplateDefinition, null, 2), 'utf8');
console.log('Template definitions JSON updated successfully.');
"""

script_path = ROOT / "tools/dump_definitions.mjs"
script_path.write_text(node_script, encoding='utf-8')

res = subprocess.run(["node", "tools/dump_definitions.mjs"], cwd=str(ROOT), capture_output=True, text=True)
print("Node dump output:", res.stdout, res.stderr)
if res.returncode != 0:
    raise RuntimeError("Failed to dump definitions")

print("JSON files successfully updated from TypeScript template-engine.")
