#!/usr/bin/env python3
"""Statically compare literal Laravel DB SQL placeholders with literal binding arrays.

This intentionally checks only DB::* calls where both the SQL string and the
binding array can be resolved safely without executing PHP. Dynamic queries are
reported as skipped rather than guessed.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
APP = BACKEND / "app"


def find_balanced(text: str, start: int, open_char: str = "(", close_char: str = ")") -> int | None:
    depth = 0
    quote: str | None = None
    escaped = False
    for index in range(start, len(text)):
        char = text[index]
        if quote is not None:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue
        if char in "'\"":
            quote = char
            continue
        if char == open_char:
            depth += 1
        elif char == close_char:
            depth -= 1
            if depth == 0:
                return index
    return None


def split_top_level(text: str) -> list[str]:
    values: list[str] = []
    last = 0
    round_depth = square_depth = curly_depth = 0
    quote: str | None = None
    escaped = False
    for index, char in enumerate(text):
        if quote is not None:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue
        if char in "'\"":
            quote = char
            continue
        if char == "(":
            round_depth += 1
        elif char == ")":
            round_depth -= 1
        elif char == "[":
            square_depth += 1
        elif char == "]":
            square_depth -= 1
        elif char == "{":
            curly_depth += 1
        elif char == "}":
            curly_depth -= 1
        elif char == "," and round_depth == square_depth == curly_depth == 0:
            values.append(text[last:index].strip())
            last = index + 1
    tail = text[last:].strip()
    if tail:
        values.append(tail)
    return values


def decode_php_string(value: str) -> str | None:
    value = value.strip()
    if len(value) < 2 or value[0] not in "'\"" or value[-1] != value[0]:
        return None
    quote = value[0]
    body = value[1:-1]
    if quote == "'":
        return body.replace("\\'", "'").replace("\\\\", "\\")
    # Double-quoted strings with interpolation cannot be resolved reliably here.
    if "$" in body:
        return None
    try:
        return bytes(body, "utf-8").decode("unicode_escape")
    except UnicodeDecodeError:
        return body


def literal_array_count(value: str) -> int | None:
    value = value.strip()
    if not (value.startswith("[") and value.endswith("]")):
        return None
    body = value[1:-1].strip()
    if not body:
        return 0
    return len(split_top_level(body))


def main() -> int:
    checked = 0
    skipped = 0
    issues: list[dict[str, object]] = []
    method_pattern = re.compile(r"DB::(select|selectOne|insert|update|statement)\s*\(")

    for path in sorted(APP.rglob("*.php")):
        source = path.read_text("utf-8", errors="ignore")
        for match in method_pattern.finditer(source):
            end = find_balanced(source, match.end() - 1)
            if end is None:
                skipped += 1
                continue
            args = split_top_level(source[match.end():end])
            if len(args) < 2:
                continue
            sql = decode_php_string(args[0])
            binding_count = literal_array_count(args[1])
            if sql is None or binding_count is None:
                skipped += 1
                continue
            placeholder_count = sql.count("?")
            checked += 1
            if placeholder_count != binding_count:
                issues.append(
                    {
                        "file": str(path.relative_to(BACKEND)),
                        "line": source.count("\n", 0, match.start()) + 1,
                        "method": match.group(1),
                        "placeholders": placeholder_count,
                        "bindings": binding_count,
                        "sqlPreview": sql[:220],
                    }
                )

    result = {
        "status": "passed" if not issues else "failed",
        "checkedLiteralQueries": checked,
        "skippedDynamicQueries": skipped,
        "issues": issues,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if not issues else 1


if __name__ == "__main__":
    sys.exit(main())
