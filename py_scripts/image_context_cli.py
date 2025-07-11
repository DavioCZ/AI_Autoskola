# -*- coding: utf-8 -*-
"""
image_context_cli.py

Rozhraní příkazového řádku pro modul image_context.
Umožňuje volat ImageContextStore z jiných procesů (např. Node.js).

Příklad volání:
python image_context_cli.py --question-id 24030003 --json-path ../public/analyza_okruh1
python image_context_cli.py --url "https://..." --json-path ../public/analyza_okruh1
"""

import argparse
import json
import sys
from pathlib import Path
from typing import List

# Přidáme nadřazený adresář do cesty, aby bylo možné importovat image_context
sys.path.append(str(Path(__file__).resolve().parent))

from image_context import ImageContextStore


def main():
    """Hlavní funkce pro zpracování argumentů a volání store."""
    parser = argparse.ArgumentParser(
        description="Získá kontext obrázku z JSON analýz na základě ID otázky nebo URL."
    )
    parser.add_argument(
        "--question-id",
        type=str,
        help="ID otázky pro vyhledání kontextu."
    )
    parser.add_argument(
        "--url",
        type=str,
        help="URL obrázku/média pro vyhledání kontextu."
    )
    parser.add_argument(
        "--json-path",
        action="append",
        required=True,
        help="Cesta k JSON souboru nebo adresáři s JSON soubory. Může být použito vícekrát."
    )

    args = parser.parse_args()

    if not args.question_id and not args.url:
        print(json.dumps({"error": "Musí být poskytnuto --question-id nebo --url."}), file=sys.stderr)
        sys.exit(1)

    try:
        # Zpracování cest - mohou to být soubory i adresáře
        paths_to_load: List[Path] = []
        for p in args.json_path:
            path = Path(p)
            if path.is_dir():
                paths_to_load.extend(sorted(path.glob("*.json")))
            elif path.is_file():
                paths_to_load.append(path)
        
        if not paths_to_load:
             raise ValueError(f"V zadaných cestách nebyly nalezeny žádné .json soubory: {args.json_path}")

        store = ImageContextStore(paths_to_load)
        
        context = store.get_context(question_id=args.question_id, url=args.url)
        
        # Výstup ve formátu JSON na stdout
        print(json.dumps(context, ensure_ascii=False, indent=2))

    except (ValueError, RuntimeError) as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
