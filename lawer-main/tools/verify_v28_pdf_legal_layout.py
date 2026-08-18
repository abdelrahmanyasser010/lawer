from pathlib import Path
import json, re, shutil, subprocess
ROOT=Path(__file__).resolve().parents[1]
blade=(ROOT/'backend/resources/views/pdf/contract.blade.php').read_text(encoding='utf-8')
cmd=(ROOT/'backend/app/Console/Commands/ProcessDocumentJobs.php').read_text(encoding='utf-8')
engine=(ROOT/'backend/app/Services/TemplateEngineService.php').read_text(encoding='utf-8')
preview=(ROOT/'frontend/src/components/contract/LegalDocumentSheet.tsx').read_text(encoding='utf-8')
frontend_css=(ROOT/'frontend/src/app/globals.css').read_text(encoding='utf-8')
renderer=(ROOT/'frontend/src/features/contracts/wizard/DynamicFieldRenderer.tsx').read_text(encoding='utf-8')
install=(ROOT/'backend/deploy/install-ubuntu.sh').read_text(encoding='utf-8')
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
 'fixed_a4_live_preview': all(marker in preview for marker in ['A4PreviewScaler','min-h-[297mm]','w-[210mm]','px-[15mm]','pt-[13mm]']),
 'whole_page_preview_scaling': 'data-a4-preview-scaler="true"' in preview and 'transformOrigin: "top center"' in preview,
 'live_pdf_typography_parity': all(marker in frontend_css for marker in ['Noto Sans Arabic','font-size: 11.35pt','line-height: 1.44','font-size: 17.5pt','font-size: 11.25pt']) and all(marker in blade for marker in ['Noto Sans Arabic','font-size:11.35pt','line-height:1.44','font-size:17.5pt','font-size:11.25pt']),
 'shared_pdf_font_provisioned': 'fonts-noto-core' in install and 'Noto Naskh Arabic' not in blade,
 'compact_professional_choices': 'min-h-9 rounded-lg' in renderer and 'aria-pressed={selected}' in renderer,
}
# Frozen legal-content inventory.
counts={}
total=0
for name in ['rental','apartment_sale','freelancer']:
    data=json.loads((ROOT/f'backend/database/template-definitions/{name}.json').read_text(encoding='utf-8'))
    counts[name]=len(data.get('legalClauses',[])); total+=counts[name]
checks['legal_clause_inventory_378']=(total==378)
# PHP syntax for changed PHP files.
php_files=[
    ROOT/'backend/app/Services/TemplateEngineService.php',
    ROOT/'backend/app/Console/Commands/ProcessDocumentJobs.php',
    ROOT/'backend/tests/Feature/PdfLayoutContractTest.php',
    ROOT/'backend/database/migrations/2026_08_17_000100_publish_rental_jurisdiction_v8.php',
    ROOT/'backend/database/migrations/2026_08_17_000200_publish_apartment_sale_jurisdiction_v7.php',
    ROOT/'backend/database/migrations/2026_08_18_000100_publish_contract_integrity_versions.php',
    ROOT/'backend/database/migrations/2026_08_18_000200_publish_freelancer_preview_guidance_v8.php',
    ROOT/'backend/database/migrations/2026_08_18_000300_publish_rental_sale_text_integrity_versions.php',
    ROOT/'backend/database/migrations/2026_08_18_000400_publish_blank_annex_template_versions.php',
    ROOT/'backend/database/migrations/2026_08_18_000500_publish_optional_annex_template_versions.php',
]
syntax=[]
php=shutil.which('php')
checks['php_runtime_available']=bool(php)
if php:
    for p in php_files:
        r=subprocess.run([php,'-l',str(p)],capture_output=True,text=True)
        syntax.append({'file':str(p.relative_to(ROOT)),'ok':r.returncode==0,'output':(r.stdout+r.stderr).strip()})
else:
    syntax.append({'file':'php runtime','ok':None,'output':'PHP executable is not available in PATH.'})
checks['changed_php_syntax']=bool(php) and all(x['ok'] for x in syntax)
result={'version':'V28','status':'passed' if all(checks.values()) else 'failed','passed':sum(checks.values()),'total':len(checks),'checks':checks,'legalClauseCounts':counts,'phpSyntax':syntax}
print(json.dumps(result,ensure_ascii=False,indent=2))
raise SystemExit(0 if result['status']=='passed' else 1)
