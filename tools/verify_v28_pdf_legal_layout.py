from pathlib import Path
import json, re, subprocess
ROOT=Path(__file__).resolve().parents[1]
blade=(ROOT/'backend/resources/views/pdf/contract.blade.php').read_text(encoding='utf-8')
cmd=(ROOT/'backend/app/Console/Commands/ProcessDocumentJobs.php').read_text(encoding='utf-8')
engine=(ROOT/'backend/app/Services/TemplateEngineService.php').read_text(encoding='utf-8')
checks={
 'running_header': 'string(docTitle)' in blade and 'string(docSerial)' in blade,
 'page_x_of_y': 'counter(page)' in blade and 'counter(pages)' in blade,
 'short_hash_footer': 'string(docHash)' in blade and 'hashShort' in cmd,
 'first_page_professional_header': 'محرر تعاقدي' in blade and 'منصة Z draft للعقود والاستشارات الذكية' not in blade,
 'no_grey_article_bars': 'background:#f1f1f1' not in blade,
 'compact_party_data': 'party-line' in blade and "presentation'] ?? 'grid'" in blade,
 'compact_two_column_data': 'array_chunk($section[\'items\'], 2)' in blade,
 'repeater_tables_supported': 'class="repeater"' in blade and "'repeaters'=>" in cmd,
 'role_specific_signatures': 'partyMeta' in cmd and 'الطرف الأول – المؤجر' in cmd and 'الطرف الأول – البائع' in cmd,
 'fingerprint_optional': 'البصمة (إن وجدت)' in blade,
 'annex_reference': 'annexRef' in cmd and 'جزء لا يتجزأ من العقد رقم' in blade,
 'source_title_cleanup': 'Z\\s*DRAFT' in engine,
 'source_signature_form_cleanup': 'trimTrailingSignatureForm' in engine,
 'source_placeholder_cleanup': 'البيان المعتمد في صدر العقد' in engine,
 'normalization_before_snapshot_hash': 'normalizeLegalSourceText' in engine and 'renderLegalClauses' in engine,
 'pdf_layout_test_present': (ROOT/'backend/tests/Feature/PdfLayoutContractTest.php').exists(),
}
# Frozen legal-content inventory.
counts={}
total=0
for name in ['rental','apartment_sale','freelancer']:
    data=json.loads((ROOT/f'backend/database/template-definitions/{name}.json').read_text(encoding='utf-8'))
    counts[name]=len(data.get('legalClauses',[])); total+=counts[name]
checks['legal_clause_inventory_311']=(total==311)
# PHP syntax for changed PHP files.
php_files=[ROOT/'backend/app/Services/TemplateEngineService.php',ROOT/'backend/app/Console/Commands/ProcessDocumentJobs.php',ROOT/'backend/tests/Feature/PdfLayoutContractTest.php']
syntax=[]
for p in php_files:
    r=subprocess.run(['php','-l',str(p)],capture_output=True,text=True)
    syntax.append({'file':str(p.relative_to(ROOT)),'ok':r.returncode==0,'output':(r.stdout+r.stderr).strip()})
checks['changed_php_syntax']=all(x['ok'] for x in syntax)
result={'version':'V28','status':'passed' if all(checks.values()) else 'failed','passed':sum(checks.values()),'total':len(checks),'checks':checks,'legalClauseCounts':counts,'phpSyntax':syntax}
print(json.dumps(result,ensure_ascii=False,indent=2))
raise SystemExit(0 if result['status']=='passed' else 1)
