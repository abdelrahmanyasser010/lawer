import json
import re
from pathlib import Path

ROOT = Path(r"d:\android tog\laywer")
rental_path = ROOT / "backend/database/template-definitions/rental.json"
rental_data = json.loads(rental_path.read_text(encoding='utf-8'))

for c in rental_data['legalClauses']:
    if c['key'] == 'residential_lease_source_article_03':
        body = c['bodyAr']
        matches = list(re.finditer(r'\u0643\s*[\u064B-\u065F\u0670]?\s+\u0644', body))
        for m in matches:
            start = max(0, m.start() - 10)
            end = min(len(body), m.end() + 10)
            chars = [(ch, hex(ord(ch))) for ch in body[start:end]]
            print(f"Match in {c['key']}: {chars}")
