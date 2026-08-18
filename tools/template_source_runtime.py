"""Load template-engine definitions without requiring checked-in dependencies.

The normal path uses the compiled dist bundle. For source-only review archives,
Node 24 can execute a temporary copy of the TypeScript after type stripping.
The temporary copy only adds explicit `.ts` extensions to relative imports;
the project source itself is never rewritten.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any


RELATIVE_IMPORT = re.compile(
    r"(?P<prefix>\bfrom\s+['\"])(?P<path>\.{1,2}/[^'\"]+)(?P<suffix>['\"])",
)


def _node_definition_script(module_uri: str) -> str:
    return f"""
const module = await import({json.dumps(module_uri)});
process.stdout.write(JSON.stringify({{
  rental: module.rentalTemplateDefinition,
  apartment_sale: module.apartmentSaleTemplateDefinition,
  freelancer: module.freelancerTemplateDefinition,
}}));
""".strip()


def _run_node(root: Path, module_uri: str, *, strip_types: bool) -> dict[str, dict[str, Any]]:
    command = ["node", "--no-warnings"]
    if strip_types:
        command.append("--experimental-strip-types")
    command.extend(["--input-type=module", "-e", _node_definition_script(module_uri)])
    output = subprocess.check_output(command, cwd=root, encoding="utf-8")
    return json.loads(output)


def _append_typescript_extensions(text: str) -> str:
    def replace(match: re.Match[str]) -> str:
        path = match.group("path")
        if Path(path).suffix:
            return match.group(0)
        return f'{match.group("prefix")}{path}.ts{match.group("suffix")}'

    return RELATIVE_IMPORT.sub(replace, text)


def load_template_definitions(root: Path) -> dict[str, dict[str, Any]]:
    root = root.resolve()
    dist_index = root / "packages/template-engine/dist/index.js"
    if dist_index.exists():
        return _run_node(root, dist_index.as_uri(), strip_types=False)

    source_root = root / "packages/template-engine/src"
    if not source_root.exists():
        raise FileNotFoundError(f"Template-engine source directory was not found: {source_root}")

    with tempfile.TemporaryDirectory(prefix="zdraft-template-source-") as temporary:
        runtime_root = Path(temporary) / "src"
        shutil.copytree(source_root, runtime_root)
        for source_file in runtime_root.rglob("*.ts"):
            source_file.write_text(
                _append_typescript_extensions(source_file.read_text(encoding="utf-8")),
                encoding="utf-8",
            )
        return _run_node(root, (runtime_root / "index.ts").as_uri(), strip_types=True)
