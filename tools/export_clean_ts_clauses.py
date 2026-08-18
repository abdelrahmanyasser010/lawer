import json
from pathlib import Path

ROOT = Path(r"d:\android tog\laywer")

rental_path = ROOT / "backend/database/template-definitions/rental.json"
sale_path = ROOT / "backend/database/template-definitions/apartment_sale.json"
freelance_path = ROOT / "backend/database/template-definitions/freelancer.json"

rental_data = json.loads(rental_path.read_text(encoding='utf-8'))
sale_data = json.loads(sale_path.read_text(encoding='utf-8'))
freelance_data = json.loads(freelance_path.read_text(encoding='utf-8'))

# Collect source clauses for rental & sale
source_clauses = []
for c in rental_data.get('legalClauses', []):
    if c['key'].startswith('residential_lease_source_') or c['key'].startswith('commercial_lease_source_') or c['key'].startswith('administrative_lease_source_'):
        source_clauses.append(c)

for c in sale_data.get('legalClauses', []):
    if c['key'].startswith('preliminary_sale_source_') or c['key'].startswith('registrable_sale_source_') or c['key'].startswith('inherited_sale_source_'):
        source_clauses.append(c)

source_clauses_ts = """import type { LegalClauseDefinition } from "../types";

export const canonicalSourceClauses: LegalClauseDefinition[] = """ + json.dumps(source_clauses, ensure_ascii=False, indent=2) + """;

export const sourceClauseKeysByVariant = {
  residential_lease: canonicalSourceClauses.filter((c) => c.key.startsWith("residential_lease_source_")).map((c) => c.key),
  commercial_lease: canonicalSourceClauses.filter((c) => c.key.startsWith("commercial_lease_source_")).map((c) => c.key),
  administrative_lease: canonicalSourceClauses.filter((c) => c.key.startsWith("administrative_lease_source_")).map((c) => c.key),
  preliminary_sale: canonicalSourceClauses.filter((c) => c.key.startsWith("preliminary_sale_source_")).map((c) => c.key),
  registrable_sale: canonicalSourceClauses.filter((c) => c.key.startsWith("registrable_sale_source_")).map((c) => c.key),
  inherited_sale: canonicalSourceClauses.filter((c) => c.key.startsWith("inherited_sale_source_")).map((c) => c.key),
};
"""

(ROOT / "packages/template-engine/src/legal-content/sourceClauses.ts").write_text(source_clauses_ts, encoding='utf-8')

# Freelance source clauses
freelance_source_clauses = []
for c in freelance_data.get('legalClauses', []):
    if c['key'].startswith('visual_identity_design_source_') or c['key'].startswith('website_development_source_') or c['key'].startswith('social_media_management_source_'):
        freelance_source_clauses.append(c)

freelance_source_clauses_ts = """import type { LegalClauseDefinition } from "../types";

export const freelanceCanonicalSourceClauses: LegalClauseDefinition[] = """ + json.dumps(freelance_source_clauses, ensure_ascii=False, indent=2) + """;

export const freelanceSourceClauseKeysByVariant = {
  visual_identity_design: freelanceCanonicalSourceClauses.filter((c) => c.key.startsWith("visual_identity_design_source_")).map((c) => c.key),
  website_development: freelanceCanonicalSourceClauses.filter((c) => c.key.startsWith("website_development_source_")).map((c) => c.key),
  social_media_management: freelanceCanonicalSourceClauses.filter((c) => c.key.startsWith("social_media_management_source_")).map((c) => c.key),
};
"""

(ROOT / "packages/template-engine/src/legal-content/freelanceSourceClauses.ts").write_text(freelance_source_clauses_ts, encoding='utf-8')

print("TypeScript source clauses updated successfully.")
