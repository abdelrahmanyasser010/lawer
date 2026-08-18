import json
import re
import sys
from pathlib import Path
from typing import Any

from template_source_runtime import load_template_definitions


ROOT = Path(__file__).resolve().parents[1]
COURT_STEP_TITLE = "المحكمة المختصة"

TEMPLATE_FILES = [
    (
        "عقود الإيجار بأنواعها (سكني، تجاري، إداري)",
        ROOT / "backend/database/template-definitions/rental.json",
        {"residential_lease", "commercial_lease", "administrative_lease"},
    ),
    (
        "عقد بيع الشقق بأنواعه (ابتدائي، قابل للتسجيل، ميراث)",
        ROOT / "backend/database/template-definitions/apartment_sale.json",
        {"preliminary_sale", "registrable_sale", "inherited_sale"},
    ),
    (
        "عقود الخدمات والعمل الحر (هوية، مواقع، سوشيال)",
        ROOT / "backend/database/template-definitions/freelancer.json",
        {
            "visual_identity_design",
            "website_development",
            "social_media_management",
        },
    ),
]

SOURCE_ARRAYS = [
    (
        ROOT / "packages/template-engine/src/legal-content/sourceClauses.ts",
        ROOT / "backend/database/template-definitions/apartment_sale.json",
        "salePreliminarySourceClauses",
        ("preliminary_sale_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/sourceClauses.ts",
        ROOT / "backend/database/template-definitions/apartment_sale.json",
        "saleRegistrySourceClauses",
        ("registrable_sale_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/sourceClauses.ts",
        ROOT / "backend/database/template-definitions/apartment_sale.json",
        "saleInheritedSourceClauses",
        ("inherited_sale_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/sourceClauses.ts",
        ROOT / "backend/database/template-definitions/apartment_sale.json",
        "saleInstallmentAnnexSourceClauses",
        ("sale_installment_schedule_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/sourceClauses.ts",
        ROOT / "backend/database/template-definitions/rental.json",
        "rentalResidentialSourceClauses",
        ("residential_lease_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/sourceClauses.ts",
        ROOT / "backend/database/template-definitions/rental.json",
        "rentalCommercialSourceClauses",
        ("commercial_lease_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/sourceClauses.ts",
        ROOT / "backend/database/template-definitions/rental.json",
        "rentalAdministrativeSourceClauses",
        ("administrative_lease_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/sourceClauses.ts",
        ROOT / "backend/database/template-definitions/rental.json",
        "rentalHandoverAnnexSourceClauses",
        ("rental_handover_inventory_report_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/freelanceSourceClauses.ts",
        ROOT / "backend/database/template-definitions/freelancer.json",
        "visualIdentityMainSourceClauses",
        ("visual_identity_design_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/freelanceSourceClauses.ts",
        ROOT / "backend/database/template-definitions/freelancer.json",
        "visualIdentityScopeAnnexSourceClauses",
        ("visual_identity_scope_annex_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/freelanceSourceClauses.ts",
        ROOT / "backend/database/template-definitions/freelancer.json",
        "visualIdentityFinancialAnnexSourceClauses",
        ("visual_identity_financial_annex_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/freelanceSourceClauses.ts",
        ROOT / "backend/database/template-definitions/freelancer.json",
        "visualIdentityApprovalsAnnexSourceClauses",
        ("visual_identity_approvals_annex_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/freelanceSourceClauses.ts",
        ROOT / "backend/database/template-definitions/freelancer.json",
        "websiteDevelopmentMainSourceClauses",
        ("website_development_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/freelanceSourceClauses.ts",
        ROOT / "backend/database/template-definitions/freelancer.json",
        "websiteScopeAnnexSourceClauses",
        ("website_scope_annex_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/freelanceSourceClauses.ts",
        ROOT / "backend/database/template-definitions/freelancer.json",
        "websiteTechnicalAnnexSourceClauses",
        ("website_technical_annex_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/freelanceSourceClauses.ts",
        ROOT / "backend/database/template-definitions/freelancer.json",
        "websiteProjectDataAnnexSourceClauses",
        ("website_project_data_annex_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/freelanceSourceClauses.ts",
        ROOT / "backend/database/template-definitions/freelancer.json",
        "websiteDeliveryAnnexSourceClauses",
        ("website_delivery_annex_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/freelanceSourceClauses.ts",
        ROOT / "backend/database/template-definitions/freelancer.json",
        "websiteSlaAnnexSourceClauses",
        ("website_sla_annex_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/freelanceSourceClauses.ts",
        ROOT / "backend/database/template-definitions/freelancer.json",
        "websiteFutureDevelopmentAnnexSourceClauses",
        ("website_future_development_annex_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/freelanceSourceClauses.ts",
        ROOT / "backend/database/template-definitions/freelancer.json",
        "socialMediaMainSourceClauses",
        ("social_media_management_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/freelanceSourceClauses.ts",
        ROOT / "backend/database/template-definitions/freelancer.json",
        "socialMediaScopeAnnexSourceClauses",
        ("social_media_scope_annex_source_",),
    ),
    (
        ROOT / "packages/template-engine/src/legal-content/freelanceSourceClauses.ts",
        ROOT / "backend/database/template-definitions/freelancer.json",
        "socialMediaFinancialAnnexSourceClauses",
        ("social_media_financial_annex_source_",),
    ),
]

TEXT_ISSUE_PATTERNS = [
    ("broken spaced كل", re.compile(r"\bك\s*[\u064B-\u065F\u0670]?\s+ل(ه|ها|هم|هن|كم|نا)?\b")),
    ("broken لا يتجزأ", re.compile(r"\bال\s+يتجزأ\b")),
    ("broken إلا/ألا", re.compile(r"\b[إأ]ال\b")),
    ("broken أل with hamza above/below", re.compile(r"األ|اإل|اآل")),
    ("broken double alif-lam", re.compile(r"اال")),
    ("joined إن وجدت", re.compile(r"إنوجدت")),
    ("joined إذا رفعت", re.compile(r"إذارفعت")),
    ("split تعمد", re.compile(r"\bت\s+عمد\b")),
    ("wrong لإجراءات", re.compile(r"\bإلجراءات\b")),
    ("UTF-8 mojibake marker", re.compile(r"[ÙØâ]")),
    ("scrambled preamble marker", re.compile(r"ومفسرا لجميع أحكامه.*ومكمال")),
    ("broken standalone لا", re.compile(r"(?:^|[\s،؛:.(])و?ال\s+")),
    ("OCR relationship", re.compile(r"العالقات?|عالقات")),
    ("OCR استلام", re.compile(r"استالم")),
    ("OCR إخلال/إخلاء/إبلاغ", re.compile(r"إخالل|إخالء|إبالغ")),
    ("OCR خلال", re.compile(r"خالل")),
    ("joined legal words", re.compile(r"قبولاباستمرار|\)يوما|إنوجدت|إذارفعت")),
    ("split legal words", re.compile(r"المع\s+تمدة|جوالات المراجعة|ت\s+نظيم|أ\s+عمال|يلتز\s+م|م\s+باشرة")),
    ("known OCR spelling", re.compile(r"استقالل|المراسالت|اختالف|اختالل|لالستمرار|إلعذار|بخالف|الالزم|يقض القانون|يخلاف|جائز\s+ا|تكامالت|إلجراءات|لالس\s*تخدام")),
    ("standalone OCR فلا", re.compile(r"(?:^|[\s،؛:.(])فال\s+")),
    ("court conflicts with selected court", re.compile(r"المحكمة المختصة الواقع في دائرتها العقار|للمحكمة (?:المختصة )?التي يقع في دائرتها العقار")),
]


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def extract_exported_json_array(path: Path, export_name: str) -> list[dict[str, Any]]:
    text = path.read_text(encoding="utf-8")
    marker = f"export const {export_name}: LegalClauseDefinition[]"
    marker_index = text.find(marker)
    if marker_index == -1:
        raise ValueError(f"{export_name} was not found in {path}")

    assignment_index = text.find("=", marker_index)
    if assignment_index == -1:
        raise ValueError(f"{export_name} has no assignment in {path}")

    start = text.find("[", assignment_index)
    if start == -1:
        raise ValueError(f"{export_name} has no array assignment in {path}")

    depth = 0
    in_string = False
    escaped = False
    for index in range(start, len(text)):
        char = text[index]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
        elif char == "[":
            depth += 1
        elif char == "]":
            depth -= 1
            if depth == 0:
                return json.loads(text[start : index + 1])

    raise ValueError(f"{export_name} array was not closed in {path}")


def source_clauses_by_prefix(data: dict[str, Any], prefixes: tuple[str, ...]) -> list[dict[str, Any]]:
    return [
        clause
        for clause in data.get("legalClauses", [])
        if any(clause.get("key", "").startswith(prefix) for prefix in prefixes)
    ]


def load_compiled_definitions() -> dict[str, dict[str, Any]]:
    return load_template_definitions(ROOT)


def check_template(doc_name: str, path: Path, expected_variant_keys: set[str]) -> tuple[int, int, list[str]]:
    data = load_json(path)
    issues: list[str] = []
    variants = data.get("variants", [])
    clauses = data.get("legalClauses", [])
    clause_by_key = {str(clause.get("key", "")): clause for clause in clauses}
    optional_by_key = {str(optional.get("key", "")): optional for optional in data.get("optionalClauses", [])}
    variant_keys = {variant.get("key") for variant in variants}

    print(f"\n[*] {doc_name}:")
    if variant_keys != expected_variant_keys:
        issues.append(
            f"{path.name}: variant keys mismatch. expected={sorted(expected_variant_keys)} current={sorted(variant_keys)}"
        )

    required_annex_variants = [
        str(variant.get("key", ""))
        for variant in variants
        if "requiredAnnexKeys" in variant
    ]
    if required_annex_variants:
        issues.append(f"{path.name}: mandatory annex configuration remains in: {', '.join(required_annex_variants)}")

    for optional_key, optional in optional_by_key.items():
        if "requiredWhen" in optional:
            issues.append(f"{path.name}/{optional_key}: annex must never have requiredWhen")
        description = str(optional.get("description", ""))
        if "اختياري" not in description or "لا يُضاف تلقائيًا" not in description:
            issues.append(f"{path.name}/{optional_key}: annex description must state explicit optional selection")

    website_article_five = clause_by_key.get("website_development_source_section_06")
    if website_article_five:
        if website_article_five.get("titleAr") != "المادة الخامسة: الملاحق الاختيارية":
            issues.append("website contract Article 5 does not identify annexes as optional")
        article_body = str(website_article_five.get("bodyAr", ""))
        if "لا يُضاف أي ملحق تلقائيًا" not in article_body or "الملاحق الأساسية" in article_body:
            issues.append("website contract Article 5 still implies automatic or mandatory annexes")

    for variant in variants:
        steps = variant.get("steps", [])
        for step in steps:
            for field in step.get("fields", []):
                help_text = str(field.get("helpText", ""))
                if any(phrase in help_text for phrase in ("النموذج الأصلي", "سعر شراء القالب", "إذا ألغيت هذا الاختيار")):
                    issues.append(f"{variant.get('key')}/{field.get('key')}: customer guidance contains internal or redundant template commentary")
        missing_article_ranges = [step.get("key") for step in steps if not str(step.get("articleRange", "")).strip()]
        if missing_article_ranges:
            issues.append(f"{variant.get('key')}: steps missing contract/article mapping: {', '.join(map(str, missing_article_ranges))}")
        field_keys = [
            str(field.get("key", ""))
            for step in steps
            for field in step.get("fields", [])
            if str(field.get("key", ""))
        ]
        duplicate_field_keys = sorted({key for key in field_keys if field_keys.count(key) > 1})
        if duplicate_field_keys:
            issues.append(f"{variant.get('key')}: duplicate wizard fields: {', '.join(duplicate_field_keys)}")

        reachable_clause_keys = list(map(str, variant.get("requiredClauseKeys", [])))
        for optional_key in variant.get("allowedOptionalClauseKeys", []):
            optional = optional_by_key.get(str(optional_key), {})
            reachable_clause_keys.extend(map(str, optional.get("legalClauseKeys", [])))
        missing_clause_keys = sorted({key for key in reachable_clause_keys if key not in clause_by_key})
        if missing_clause_keys:
            issues.append(f"{variant.get('key')}: referenced legal clauses are missing: {', '.join(missing_clause_keys)}")

        available_values = set(field_keys) | set(map(str, variant.get("defaultFieldValues", {}).keys()))
        for optional_key in variant.get("allowedOptionalClauseKeys", []):
            optional = optional_by_key.get(str(optional_key), {})
            for inserted_step in optional.get("insertedSteps", []):
                available_values.update(
                    str(field.get("key", ""))
                    for field in inserted_step.get("fields", [])
                    if str(field.get("key", ""))
                )
        required_variables = {
            str(variable)
            for clause_key in reachable_clause_keys
            for variable in clause_by_key.get(clause_key, {}).get("variables", [])
        }
        missing_variables = sorted(required_variables - available_values)
        if missing_variables:
            issues.append(f"{variant.get('key')}: legal variables have no wizard/default/annex source: {', '.join(missing_variables)}")
        court_steps = [
            (index, step)
            for index, step in enumerate(steps)
            if step.get("titleAr") == COURT_STEP_TITLE
        ]
        if len(court_steps) != 1:
            issues.append(f"{variant.get('key')}: expected exactly one '{COURT_STEP_TITLE}' step, found {len(court_steps)}")
            status = "[FAIL]"
            court_step_number = "-"
        else:
            court_index, court_step = court_steps[0]
            court_step_number = court_index + 1
            is_penultimate = court_index == len(steps) - 2
            has_court_field = any(
                str(field.get("labelAr", "")).startswith(COURT_STEP_TITLE)
                for field in court_step.get("fields", [])
            )
            court_fields = [
                field
                for field in court_step.get("fields", [])
                if str(field.get("labelAr", "")).startswith(COURT_STEP_TITLE)
            ]
            court_is_required = bool(court_fields) and all(
                field.get("required") is True for field in court_fields
            )
            court_options = {
                str(option.get("value", ""))
                for field in court_fields
                for option in field.get("options", [])
            }
            if not is_penultimate:
                issues.append(f"{variant.get('key')}: court step must be directly before final review step")
            if "الاختصاص القضائي" not in str(court_step.get("articleRange", "")):
                issues.append(f"{variant.get('key')}: court step articleRange does not mention jurisdiction")
            if not has_court_field:
                issues.append(f"{variant.get('key')}: court step has no court field")
            if not court_is_required:
                issues.append(f"{variant.get('key')}: competent court must be required")
            if not {"القاهرة", "المنيا"}.issubset(court_options):
                issues.append(f"{variant.get('key')}: competent court list is incomplete")
            status = "[OK]" if is_penultimate and has_court_field and court_is_required else "[FAIL]"

        print(
            f"  {status} {variant.get('nameAr', variant.get('key'))} "
            f"-> Total Steps: {len(steps)} | Court Step: #{court_step_number}"
        )

    for clause in clauses:
        text = "\n".join(
            str(clause.get(field, ""))
            for field in ("titleAr", "bodyAr")
        )
        for label, pattern in TEXT_ISSUE_PATTERNS:
            if pattern.search(text):
                issues.append(f"{clause.get('key')}: {label}")

    return len(variants), len(clauses), issues


def check_preview_integrity() -> list[str]:
    issues: list[str] = []
    preview_path = ROOT / "frontend/src/components/contract/LegalDocumentSheet.tsx"
    wizard_path = ROOT / "frontend/src/features/contracts/wizard/ContractWizard.tsx"
    formatter_path = ROOT / "frontend/src/features/contracts/domain/contractDisplay.ts"
    renderer_path = ROOT / "frontend/src/features/contracts/wizard/DynamicFieldRenderer.tsx"
    frontend_css_path = ROOT / "frontend/src/app/globals.css"
    frontend_layout_path = ROOT / "frontend/src/app/layout.tsx"
    pdf_path = ROOT / "backend/resources/views/pdf/contract.blade.php"
    install_path = ROOT / "backend/deploy/install-ubuntu.sh"
    document_job_path = ROOT / "backend/app/Console/Commands/ProcessDocumentJobs.php"
    selector_path = ROOT / "frontend/src/features/contracts/wizard/OptionalClauseSelector.tsx"
    engine_path = ROOT / "packages/template-engine/src/resolver.ts"
    php_engine_path = ROOT / "backend/app/Services/TemplateEngineService.php"
    preview = preview_path.read_text(encoding="utf-8")
    wizard = wizard_path.read_text(encoding="utf-8")
    formatter = formatter_path.read_text(encoding="utf-8")
    renderer = renderer_path.read_text(encoding="utf-8")
    frontend_css = frontend_css_path.read_text(encoding="utf-8")
    frontend_layout = frontend_layout_path.read_text(encoding="utf-8")
    pdf = pdf_path.read_text(encoding="utf-8")
    install = install_path.read_text(encoding="utf-8")
    document_job = document_job_path.read_text(encoding="utf-8")
    selector = selector_path.read_text(encoding="utf-8")
    engine = engine_path.read_text(encoding="utf-8")
    php_engine = php_engine_path.read_text(encoding="utf-8")

    expectations = [
        ("DraftWatermark", preview, "personalized draft watermark is missing"),
        ("معاينة غير صالحة للاستخدام", preview, "draft warning text is missing"),
        ("AnnexPreviewSheet", preview, "printable annex preview is missing"),
        ("BlankDocumentDataSections", preview, "schema-driven blank annex layout is missing"),
        ("A4PreviewScaler", preview, "whole-page A4 preview scaling is missing"),
        ('data-a4-preview-scaler="true"', preview, "A4 preview scaling marker is missing"),
        ("min-h-[297mm]", preview, "A4 preview height is missing"),
        ("w-[210mm]", preview, "A4 preview width is missing"),
        ("px-[15mm]", preview, "print-matched side margins are missing"),
        ("pt-[13mm]", preview, "print-matched first-page top margin is missing"),
        ("py-[16mm]", preview, "print-matched annex margins are missing"),
        ("zd-doc-masthead", preview, "print-matched document masthead is missing"),
        ("zd-doc-clause-body", preview, "print-matched legal body typography hook is missing"),
        ("print:hidden", preview, "draft print blocking is missing"),
        ("mainRenderedClauses.map", preview, "full active-clause rendering is missing"),
        ("DocumentDataSections", preview, "schema-driven print data sections are missing"),
        ("steps={resolvedDefinition.steps}", preview, "live preview is not using resolved wizard step order"),
        ("field.printInDocument !== false", preview, "live preview does not honor PDF field visibility"),
        ("data-step-preview-key", preview, "schema step-to-preview mapping is missing"),
        ("LegalTextBody", preview, "compact legal paragraph renderer is missing"),
        ('<bdi dir="ltr"', preview, "RTL-safe numbered-list rendering is missing"),
        ("blankFieldValue", preview, "blank annex-field renderer is missing"),
        ("قالب فارغ للطباعة والتعبئة اليدوية", preview, "blank printable annex notice is missing"),
        ("data-active-preview", preview, "live field-location marker is missing"),
        ("const requiredReviewItems = useMemo", wizard, "schema-driven required-field review is missing"),
        ("البنود والملاحق الاختيارية المتاحة", wizard, "optional-clause review is missing"),
        ("onFieldFocus", wizard, "wizard-to-preview focus guidance is missing"),
        ("schemaStepTarget", wizard, "wizard steps do not prioritize their schema-matched preview section"),
        ("[data-active-preview='exact']", wizard, "exact preview target is not prioritized during focus guidance"),
        ("الخطوة {currentStep} من {progressSteps.length}", wizard, "explicit current/total step counter is missing"),
        ("formatWizardFieldValue", wizard, "schema-backed value formatting is missing"),
        ("CircleHelp", renderer, "collapsible field guidance is missing"),
        ("min-h-9 rounded-lg", renderer, "compact radio-option sizing is missing"),
        ("aria-pressed={selected}", renderer, "choice-button selected state is not exposed"),
        ("Noto Sans Arabic", frontend_css, "print font is missing from frontend document CSS"),
        ("font-size: 11.35pt", frontend_css, "frontend legal body size does not match print"),
        ("font-size: 17.5pt", frontend_css, "frontend legal title size does not match print"),
        ('@fontsource/noto-sans-arabic/400.css', frontend_layout, "frontend print font asset is not loaded"),
        ('font-family: "Noto Sans Arabic"', pdf, "PDF does not use the shared Arabic document font"),
        ("font-size:11.35pt", pdf, "PDF legal body size marker is missing"),
        ("font-size:17.5pt", pdf, "PDF legal title size marker is missing"),
        ("fonts-noto-core", install, "production install does not provision the shared PDF font"),
        ("buildBlankSections($steps)", document_job, "PDF blank annex-section rendering is missing"),
        ("formatClauseBody", pdf, "PDF legal text compaction/number formatting is missing"),
        ("قيمة غير معتمدة — يرجى إعادة الاختيار", formatter, "raw-enum guard is missing"),
        ("جميع الملاحق اختيارية بالكامل", selector, "annex selector does not state that every annex is optional"),
        ("لا يوجد أي ملحق إجباري", wizard, "review does not clearly state that no annex is mandatory"),
        ("Every annex is optional", document_job, "PDF worker does not document selected-annex-only behavior"),
        ("Every annex is optional", php_engine, "backend engine does not document selected-annex-only behavior"),
    ]
    for marker, source, message in expectations:
        if marker not in source:
            issues.append(message)
    if 'clause.key.endsWith("_source_article_01")' in preview:
        issues.append("preview still hides mandatory source article 01")
    if "leading-[1.85]" in preview:
        issues.append("preview still uses excessive legal line spacing")
    if "Noto Naskh Arabic" in pdf:
        issues.append("PDF still prefers a different Arabic font from the live preview")
    for marker in ("line-height: 1.44", "font-size: 11.25pt", "font-size: 9.4pt"):
        if marker not in frontend_css:
            issues.append(f"frontend print typography token is missing: {marker}")
    for marker in ("line-height:1.44", "font-size:11.25pt", "font-size:9.4pt"):
        if marker not in pdf:
            issues.append(f"PDF print typography token is missing: {marker}")
    if 'return "final_sale"' in preview:
        issues.append("preview still uses the invalid final_sale fallback")
    if "arabicValueMap" in wizard:
        issues.append("wizard still contains a partial hard-coded enum map")
    for marker in ("annexAutofillValue", "annexTargetTracksField"):
        if marker in preview:
            issues.append(f"annex preview still contains forbidden auto-fill marker: {marker}")
    for marker in ("manualAnnexContext", "manualAnnexFieldValue", "manualAnnexLabelValue"):
        if marker in document_job:
            issues.append(f"PDF annex worker still contains forbidden auto-fill marker: {marker}")
    for source_name, source in (
        ("TypeScript resolver", engine),
        ("backend engine", php_engine),
        ("PDF worker", document_job),
        ("wizard", wizard),
        ("annex selector", selector),
    ):
        if "requiredAnnexKeys" in source:
            issues.append(f"{source_name} still contains mandatory-annex runtime logic")
    if "disabled={required}" in selector or "أساسي — مضاف تلقائيًا" in selector:
        issues.append("annex selector still locks or auto-labels a mandatory annex")
    return issues


def check_source_sync() -> list[str]:
    issues: list[str] = []
    backend_cache: dict[Path, dict[str, Any]] = {}
    print("\n[*] TypeScript source clause key coverage:")

    for source_path, json_path, export_name, prefixes in SOURCE_ARRAYS:
        backend_data = backend_cache.setdefault(json_path, load_json(json_path))
        expected = source_clauses_by_prefix(backend_data, prefixes)
        actual = extract_exported_json_array(source_path, export_name)
        expected_keys = [clause.get("key") for clause in expected]
        actual_keys = [clause.get("key") for clause in actual]
        status = "[OK]" if actual_keys == expected_keys else "[FAIL]"
        print(f"  {status} {export_name} -> {len(actual)} clauses")
        if actual_keys != expected_keys:
            issues.append(
                f"{export_name}: TypeScript source clause keys do not match {json_path.name} for prefixes {', '.join(prefixes)}"
            )

    print("\n[*] Compiled template definitions sync with backend JSON:")
    try:
        compiled_definitions = load_compiled_definitions()
    except Exception as exc:
        issues.append(f"Unable to load compiled template definitions from dist: {exc}")
        return issues

    compiled_checks = [
        ("rental", ROOT / "backend/database/template-definitions/rental.json"),
        ("apartment_sale", ROOT / "backend/database/template-definitions/apartment_sale.json"),
        ("freelancer", ROOT / "backend/database/template-definitions/freelancer.json"),
    ]
    for slug, json_path in compiled_checks:
        expected = compiled_definitions[slug]
        actual = load_json(json_path)
        status = "[OK]" if actual == expected else "[FAIL]"
        print(f"  {status} {json_path.name}")
        if actual != expected:
            issues.append(f"{json_path.name}: backend JSON does not match compiled {slug} template definition")

    return issues


def main() -> int:
    print("=" * 60)
    print("VERIFYING ALL CONTRACTS & VARIANTS")
    print("=" * 60)

    total_variants = 0
    total_clauses = 0
    issues: list[str] = []

    for doc_name, path, expected_variant_keys in TEMPLATE_FILES:
        variants_count, clauses_count, template_issues = check_template(doc_name, path, expected_variant_keys)
        total_variants += variants_count
        total_clauses += clauses_count
        issues.extend(template_issues)

    issues.extend(check_source_sync())
    issues.extend(check_preview_integrity())

    if total_variants != 9:
        issues.append(f"Expected 9 contract variants, found {total_variants}")
    if total_clauses != 378:
        issues.append(f"Expected 378 legal clauses, found {total_clauses}")

    print("\n" + "=" * 60)
    print(f"RESULTS: Verified {total_variants} contract variants and {total_clauses} legal clauses.")
    if issues:
        print(f"Found {len(issues)} issue(s):")
        for issue in issues:
            print(" -", issue)
        print("=" * 60)
        return 1

    print("ALL 100% SUCCESS: court steps, legal text cleanliness, and TS/JSON sync are verified.")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
