#!/usr/bin/env python3
from __future__ import annotations
import json
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT_SOURCE_DIR = ROOT / 'docs/legal-sources/freelance'
SOURCE_DIR = PROJECT_SOURCE_DIR if PROJECT_SOURCE_DIR.exists() else Path('/mnt/data')
OUT = ROOT / 'packages/template-engine/src/legal-content/freelanceSourceClauses.ts'

BIDI = re.compile(r'[\u202a-\u202e\u2066-\u2069\u200e\u200f]')
SPACE = re.compile(r'[ \t]+')
PAGE_ONLY = re.compile(r'^\s*[0-9٠-٩]+\s*$')
EMPTY_PARENS = re.compile(r'\(\s*\)')
BLANK_RUN = re.compile(r'(?:(?:\.{4,})|(?:_{4,})|(?:ـ{4,}))')

@dataclass(frozen=True)
class SourceSpec:
    export_name: str
    key: str
    file_name: str
    kind: str  # variant | annex

SPECS = [
    SourceSpec('visualIdentityMainSourceClauses', 'visual_identity_design', 'عقد الهوية البصرية.pdf', 'variant'),
    SourceSpec('visualIdentityScopeAnnexSourceClauses', 'visual_identity_scope_annex', 'ملحق رقم (1).pdf', 'annex'),
    SourceSpec('visualIdentityFinancialAnnexSourceClauses', 'visual_identity_financial_annex', 'ملحق المقابل المالي وآلية السداد وخطة التنفيذ.pdf', 'annex'),
    SourceSpec('visualIdentityApprovalsAnnexSourceClauses', 'visual_identity_approvals_annex', 'الملحق رقم (3).pdf', 'annex'),
    SourceSpec('websiteDevelopmentMainSourceClauses', 'website_development', 'عقد برمجة ويب سيت.pdf', 'variant'),
    SourceSpec('websiteScopeAnnexSourceClauses', 'website_scope_annex', 'الملحق (أ)  نطاق العمل (Scope of Work).pdf', 'annex'),
    SourceSpec('websiteTechnicalAnnexSourceClauses', 'website_technical_annex', 'الملحق (ب).pdf', 'annex'),
    SourceSpec('websiteProjectDataAnnexSourceClauses', 'website_project_data_annex', 'Document 8.pdf', 'annex'),
    SourceSpec('websiteDeliveryAnnexSourceClauses', 'website_delivery_annex', 'الملحق رقم (د).pdf', 'annex'),
    SourceSpec('websiteSlaAnnexSourceClauses', 'website_sla_annex', 'الملحق الاختياري رقم (1).pdf', 'annex'),
    SourceSpec('websiteFutureDevelopmentAnnexSourceClauses', 'website_future_development_annex', 'اتفاقية التطويرات المستقبلية والأعمال الإضافية.pdf', 'annex'),
    SourceSpec('socialMediaMainSourceClauses', 'social_media_management', 'عقد تقديم خدمات إدارة حسابات ومنصات التواصل الاجتماعي.pdf', 'variant'),
    SourceSpec('socialMediaScopeAnnexSourceClauses', 'social_media_scope_annex', 'الملحق رقم (1).pdf', 'annex'),
    SourceSpec('socialMediaFinancialAnnexSourceClauses', 'social_media_financial_annex', 'الملحق رقم (2).pdf', 'annex'),
]


def clean_line(line: str) -> str:
    line = BIDI.sub('', line).replace('\ufeff', '')
    return SPACE.sub(' ', line).strip()


def is_footer(line: str) -> bool:
    normalized = line.replace('أ', 'ا')
    return ('توقيع الطرف الاول' in normalized or 'توقيع الطرف الثاني' in normalized or PAGE_ONLY.match(line) is not None)


def is_heading(line: str) -> bool:
    stripped = line.strip(' :-–—')
    # Main legal articles and structured annex sections.
    patterns = [
        r'^[_\s]*(?:\d+[_-]?)?المادة\s+',
        r'^لمادة\s+الأولى',
        r'^البند\s+',
        r'^(?:أولاً|أوًلا|اولا|ثانيًا|ثالثًا|رابعًا|خامسًا|سادسًا|سابعًا|ثامنًا|تاسعًا|عاشرًا|الحادي عشر|الثاني عشر)\s*:',
    ]
    return len(stripped) <= 180 and any(re.match(p, stripped) for p in patterns)


def safe_body(text: str) -> str:
    reference = 'البيان المثبت بجدول بيانات العقد أو الملحق'
    text = EMPTY_PARENS.sub(f'({reference})', text)
    text = BLANK_RUN.sub(reference, text)
    text = re.sub(r'\n{3,}', '\n\n', text).strip()
    return text


def extract_sections(path: Path, prefix: str):
    raw = subprocess.check_output(['pdftotext', '-layout', str(path), '-']).decode('utf-8', 'replace')
    pages = raw.split('\f')
    sections = []
    current = None
    counter = 0
    preface_lines: list[str] = []
    for pno, page in enumerate(pages, 1):
        for raw_line in page.splitlines():
            line = clean_line(raw_line)
            if is_footer(line):
                continue
            if is_heading(line):
                if current:
                    current['bodyAr'] = safe_body('\n'.join(current.pop('lines')))
                    sections.append(current)
                elif preface_lines:
                    counter += 1
                    sections.append({
                        'key': f'{prefix}_source_preface',
                        'titleAr': 'بيانات وتمهيد المستند',
                        'bodyAr': safe_body('\n'.join(preface_lines)),
                        'sourceDocumentName': path.name,
                        'sourcePageStart': 1,
                        'sourcePageEnd': pno,
                        'enabled': True,
                    })
                    preface_lines = []
                counter += 1
                current = {
                    'key': f'{prefix}_source_section_{counter:02d}',
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
                if line:
                    current['lines'].append(line)
                elif current['lines'] and current['lines'][-1] != '':
                    current['lines'].append('')
            elif line:
                preface_lines.append(line)
    if current:
        current['bodyAr'] = safe_body('\n'.join(current.pop('lines')))
        sections.append(current)
    elif preface_lines:
        sections.append({
            'key': f'{prefix}_source_document',
            'titleAr': path.stem,
            'bodyAr': safe_body('\n'.join(preface_lines)),
            'sourceDocumentName': path.name,
            'sourcePageStart': 1,
            'sourcePageEnd': len(pages),
            'enabled': True,
        })
    # Avoid empty clauses caused by decorative headings.
    return [item for item in sections if item['bodyAr'].strip()]


def ts(value) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def main():
    exports = []
    keys_by_variant = {}
    keys_by_annex = {}
    all_clauses = []
    for spec in SPECS:
        path = SOURCE_DIR / spec.file_name
        if not path.exists():
            raise SystemExit(f'Missing source PDF: {path}')
        clauses = extract_sections(path, spec.key)
        exports.append((spec.export_name, clauses))
        all_clauses.extend(clauses)
        target = keys_by_variant if spec.kind == 'variant' else keys_by_annex
        target[spec.key] = [c['key'] for c in clauses]
        print(spec.key, len(clauses), path.name)

    parts = ['''/* AUTO-GENERATED from the freelance/service legal PDF files supplied by the law office.\n * Do not hand-edit. Re-run tools/extract_freelance_sources.py after replacing a source PDF.\n */\nimport type { LegalClauseDefinition } from "../types";\n\n''']
    for name, clauses in exports:
        parts.append(f'export const {name}: LegalClauseDefinition[] = {ts(clauses)};\n\n')
    parts.append('export const freelanceSourceLegalClauses: LegalClauseDefinition[] = [\n')
    for name, _ in exports:
        parts.append(f'  ...{name},\n')
    parts.append('];\n\n')
    parts.append(f'export const freelanceSourceClauseKeysByVariant = {ts(keys_by_variant)} as const;\n\n')
    parts.append(f'export const freelanceSourceClauseKeysByAnnex = {ts(keys_by_annex)} as const;\n')
    OUT.write_text(''.join(parts), encoding='utf-8')
    print('Wrote', OUT, 'clauses', len(all_clauses))

if __name__ == '__main__':
    main()
