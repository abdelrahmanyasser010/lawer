#!/usr/bin/env python3
from __future__ import annotations
import json
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = Path('/mnt/data')
OUT = ROOT / 'packages/template-engine/src/legal-content/sourceClauses.ts'

BIDI = re.compile(r'[\u202a-\u202e\u2066-\u2069\u200e\u200f]')
SPACE = re.compile(r'[ \t]+')
EMPTY_PARENS = re.compile(r'\(\s*\)')
EMPTY_BRACKETS = re.compile(r'\[\s*\]')
BLANK_RUN = re.compile(r'(?:(?:\.{4,})|(?:_{4,})|(?:ـ{4,}))')
PAGE_ONLY = re.compile(r'^\s*[0-9٠-٩]+\s*$')

@dataclass(frozen=True)
class SourceSpec:
    export_name: str
    variant_key: str
    slug: str
    file_name: str

SPECS = [
    SourceSpec('salePreliminarySourceClauses', 'preliminary_sale', 'apartment_sale', 'عقد بيع ابتدائي Z DRAFT.pdf'),
    SourceSpec('saleRegistrySourceClauses', 'registrable_sale', 'apartment_sale', 'عقد بيع قابل للتسجيل في الشهر العقاري Z DRAFT.pdf'),
    SourceSpec('saleInheritedSourceClauses', 'inherited_sale', 'apartment_sale', 'عقد بيع وحدة عن طريق الورث (Z DRAFT (.pdf'),
    SourceSpec('rentalResidentialSourceClauses', 'residential_lease', 'rental', 'عقد ايجار سكني (Z DRAFT ).pdf'),
    SourceSpec('rentalCommercialSourceClauses', 'commercial_lease', 'rental', 'عقد ايجار تجاري ( Z DRAFT ).pdf'),
    SourceSpec('rentalAdministrativeSourceClauses', 'administrative_lease', 'rental', 'إداري عقد ايجار\u00a0Z DRAFT().pdf'),
    SourceSpec('saleInstallmentAnnexSourceClauses', 'sale_installment_schedule', 'apartment_sale', 'ملحق ( جدول الاقساط ) Z DRAFT.pdf'),
    SourceSpec('rentalHandoverAnnexSourceClauses', 'rental_handover_inventory_report', 'rental', 'محضر استلام وجرد العين المؤجرة Z DRAFT.pdf'),
]


def clean_line(line: str) -> str:
    line = BIDI.sub('', line).replace('\ufeff', '')
    line = SPACE.sub(' ', line).strip()
    return line


def is_heading(line: str) -> bool:
    normalized = line.strip(' :-–—')
    return normalized.startswith('المادة ') and ':' in normalized and len(normalized) <= 150


def is_footer(line: str) -> bool:
    if not line:
        return False
    if 'توقيع الطرف األول' in line or 'توقيع الطرف االول' in line or 'توقيع الطرف الثاني' in line:
        return True
    if PAGE_ONLY.match(line):
        return True
    return False


def safe_body(text: str) -> str:
    # Source PDFs use colored empty markers. In the generated document the actual
    # values are printed in binding data tables before the legal articles.
    reference = 'البيان المثبت بجدول بيانات العقد'
    text = EMPTY_PARENS.sub(f'({reference})', text)
    text = EMPTY_BRACKETS.sub(f'[{reference}]', text)
    text = BLANK_RUN.sub(reference, text)
    text = re.sub(r'\n{3,}', '\n\n', text).strip()
    return text


def extract_sections(path: Path, prefix: str):
    raw = subprocess.check_output(['pdftotext', '-layout', str(path), '-']).decode('utf-8', 'replace')
    pages = raw.split('\f')
    sections = []
    current = None
    counter = 0
    for pno, page in enumerate(pages, 1):
        for raw_line in page.splitlines():
            line = clean_line(raw_line)
            if is_footer(line):
                continue
            if is_heading(line):
                if current:
                    current['bodyAr'] = safe_body('\n'.join(current['lines']))
                    current.pop('lines', None)
                    sections.append(current)
                counter += 1
                current = {
                    'key': f'{prefix}_source_article_{counter:02d}',
                    'titleAr': line,
                    'bodyAr': '',
                    'sourceDocumentName': path.name,
                    'sourcePageStart': pno,
                    'sourcePageEnd': pno,
                    'enabled': True,
                    'lines': [],
                }
                continue
            if current:
                current['sourcePageEnd'] = pno
                # Exclude isolated title remnants and empty layout lines, preserve
                # paragraph breaks for the renderer.
                if not line:
                    if current['lines'] and current['lines'][-1] != '':
                        current['lines'].append('')
                else:
                    current['lines'].append(line)
    if current:
        current['bodyAr'] = safe_body('\n'.join(current['lines']))
        current.pop('lines', None)
        sections.append(current)

    # Annexes do not use "المادة" headings consistently. Preserve their full
    # source content as one clause if no article headings were detected.
    if not sections:
        cleaned_pages = []
        for pno, page in enumerate(pages, 1):
            lines = [clean_line(x) for x in page.splitlines()]
            lines = [x for x in lines if x and not is_footer(x)]
            if lines:
                cleaned_pages.append('\n'.join(lines))
        sections = [{
            'key': f'{prefix}_source_document',
            'titleAr': path.stem,
            'bodyAr': safe_body('\n\n'.join(cleaned_pages)),
            'sourceDocumentName': path.name,
            'sourcePageStart': 1,
            'sourcePageEnd': len(pages),
            'enabled': True,
        }]
    return sections


def ts(value) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def main():
    exports = []
    all_sale = []
    all_rental = []
    key_maps = {'sale': {}, 'rental': {}}
    for spec in SPECS:
        path = SOURCE_DIR / spec.file_name
        if not path.exists():
            raise SystemExit(f'Missing source PDF: {path}')
        prefix = spec.variant_key.replace('-', '_')
        clauses = extract_sections(path, prefix)
        exports.append((spec.export_name, clauses))
        keys = [c['key'] for c in clauses]
        if spec.variant_key == 'sale_installment_schedule':
            key_maps['sale'][spec.variant_key] = keys
            all_sale.extend(clauses)
        elif spec.variant_key == 'rental_handover_inventory_report':
            key_maps['rental'][spec.variant_key] = keys
            all_rental.extend(clauses)
        elif spec.slug == 'apartment_sale':
            key_maps['sale'][spec.variant_key] = keys
            all_sale.extend(clauses)
        else:
            key_maps['rental'][spec.variant_key] = keys
            all_rental.extend(clauses)

    header = '''/* AUTO-GENERATED from the legal PDF files supplied by the law office.\n * Do not hand-edit. Re-run tools/extract_legal_sources.py after replacing a source PDF.\n */\nimport type { LegalClauseDefinition } from "../types";\n\n'''
    parts = [header]
    for name, clauses in exports:
        parts.append(f'export const {name}: LegalClauseDefinition[] = {ts(clauses)};\n\n')
    parts.append('export const saleSourceLegalClauses: LegalClauseDefinition[] = [\n')
    for name, _ in exports:
        if name.startswith('sale'):
            parts.append(f'  ...{name},\n')
    parts.append('];\n\n')
    parts.append('export const rentalSourceLegalClauses: LegalClauseDefinition[] = [\n')
    for name, _ in exports:
        if name.startswith('rental'):
            parts.append(f'  ...{name},\n')
    parts.append('];\n\n')
    parts.append(f'export const saleSourceClauseKeysByVariant = {ts(key_maps["sale"])} as const;\n\n')
    parts.append(f'export const rentalSourceClauseKeysByVariant = {ts(key_maps["rental"])} as const;\n')
    OUT.write_text(''.join(parts), encoding='utf-8')
    print(f'Wrote {OUT}')
    for name, clauses in exports:
        print(name, len(clauses))

if __name__ == '__main__':
    main()
