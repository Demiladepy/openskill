"""CLI entry: python -m ask_docs \"your question\""""

import json
import sys

from .engine import ask


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    query = " ".join(sys.argv[1:]).strip() if len(sys.argv) > 1 else sys.stdin.read().strip()
    if not query:
        print(json.dumps({"ok": False, "error": "No question provided"}))
        sys.exit(1)
    result = ask(query)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
