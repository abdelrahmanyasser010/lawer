import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


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
    script = """
import {
  rentalTemplateDefinition,
  apartmentSaleTemplateDefinition,
  freelancerTemplateDefinition,
} from './packages/template-engine/dist/index.js';

console.log(JSON.stringify({
  rental: rentalTemplateDefinition,
  apartment_sale: apartmentSaleTemplateDefinition,
  freelancer: freelancerTemplateDefinition,
}));
""".strip()
    output = subprocess.check_output(
        ["node", "--input-type=module", "-e", script],
        cwd=ROOT,
        encoding="utf-8",
    )
    return json.loads(output)


def check_template(doc_name: str, path: Path, expected_variant_keys: set[str]) -> tuple[int, int, list[str]]:
    data = load_json(path)
    issues: list[str] = []
    variants = data.get("variants", [])
    clauses = data.get("legalClauses", [])
    variant_keys = {variant.get("key") for variant in variants}

    print(f"\n[*] {doc_name}:")
    if variant_keys != expected_variant_keys:
        issues.append(
            f"{path.name}: variant keys mismatch. expected={sorted(expected_variant_keys)} current={sorted(variant_keys)}"
        )

    for variant in variants:
        steps = variant.get("steps", [])
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
            if not is_penultimate:
                issues.append(f"{variant.get('key')}: court step must be directly before final review step")
            if "الاختصاص القضائي" not in str(court_step.get("articleRange", "")):
                issues.append(f"{variant.get('key')}: court step articleRange does not mention jurisdiction")
            if not has_court_field:
                issues.append(f"{variant.get('key')}: court step has no court field")
            status = "[OK]" if is_penultimate and has_court_field else "[FAIL]"

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
