import argparse
import json
from pathlib import Path

from template_source_runtime import load_template_definitions


ROOT = Path(__file__).resolve().parents[1]
TARGETS = {
    "rental": ROOT / "backend/database/template-definitions/rental.json",
    "apartment_sale": ROOT / "backend/database/template-definitions/apartment_sale.json",
    "freelancer": ROOT / "backend/database/template-definitions/freelancer.json",
}


def serialized(value: dict) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Synchronize backend template JSON from template-engine source.")
    parser.add_argument("--check", action="store_true", help="Only report whether files are synchronized.")
    parser.add_argument("--write", action="store_true", help="Write synchronized JSON files (default action).")
    args = parser.parse_args()

    definitions = load_template_definitions(ROOT)
    mismatches: list[str] = []
    for slug, path in TARGETS.items():
        expected = serialized(definitions[slug])
        current = path.read_text(encoding="utf-8") if path.exists() else ""
        if current != expected:
            mismatches.append(path.name)
            if not args.check:
                path.write_text(expected, encoding="utf-8")

    if args.check and mismatches:
        print("Out of sync:", ", ".join(mismatches))
        return 1
    if mismatches:
        print("Updated:", ", ".join(mismatches))
    else:
        print("Template definitions are already synchronized.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
