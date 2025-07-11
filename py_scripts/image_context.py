# -*- coding: utf-8 -*-
"""image_context.py

Jednoduchý samostatný modul pro AI_Autoškolu, který:
1. Načte JSON s analýzou obrázků / videí.
2. Umožní rychlé vyhledání kontextu podle ID otázky nebo URL souboru.
3. Vytvoří prompt pro velký jazykový model, včetně stručného shrnutí situace na obrázku.

Modul je psaný tak, aby fungoval jako drop‑in knihovna (stačí jeden soubor + JSON).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union


class ImageContextStore:
    """Načte JSON soubory a vytvoří index (klíč → analýza).

    Klíč je dvojice (id_otazky, adresa). Umožňuje vyhledávat
    podle ID otázky *nebo* podle URL.
    """

    def __init__(self, json_paths: Union[str, Path, List[Union[str, Path]]]):
        self.index: Dict[Tuple[str, str], Dict[str, Any]] = {}
        
        paths_to_process: List[Union[str, Path]] = []
        if isinstance(json_paths, list):
            paths_to_process.extend(json_paths)
        else:
            paths_to_process.append(json_paths)

        paths_to_load: List[Path] = []
        for p in paths_to_process:
            path = Path(p)
            if path.is_dir():
                paths_to_load.extend(sorted(path.glob("*.json")))
            elif path.is_file():
                paths_to_load.append(path)

        if not paths_to_load:
            raise ValueError(f"V zadaných cestách nebyly nalezeny žádné .json soubory: {json_paths}")

        for path in paths_to_load:
            self._load(path)

    # ---------------------------------------------------------------------
    # Interní metody
    # ---------------------------------------------------------------------
    def _load(self, json_path: Path) -> None:
        """Načte jeden JSON soubor a přidá jeho obsah do indexu."""
        try:
            with json_path.open("r", encoding="utf-8") as f:
                data = json.load(f)
        except FileNotFoundError as e:
            raise RuntimeError(f"Soubor {json_path} nebyl nalezen.") from e
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Chyba při parsování JSON souboru {json_path}: {e}") from e

        for item in data.get("výsledky_okruhu", []):
            question_id: str = item.get("id_otazky", "")
            for media in item.get("url", []):
                url: str = media.get("adresa", "")
                analysis: Optional[dict] = media.get("analyza")
                if analysis and question_id and url:
                    self.index[(question_id, url)] = analysis

    # ------------------------------------------------------------------
    # Veřejné API
    # ------------------------------------------------------------------
    def get_context(self, *, question_id: str | None = None, url: str | None = None) -> Optional[dict]:
        """Vrátí analýzu obrázku, pokud existuje.

        Můžete předat buď `question_id`, `url`, nebo oboje. Pokud se najde
        několik záznamů pro stejné ID otázky (u typických single‑frame otázek
        bývá jen jeden), vrátí první nalezený.
        """
        if question_id and url:
            return self.index.get((question_id, url))

        if question_id:
            for (qid, _), ctx in self.index.items():
                if qid == question_id:
                    return ctx

        if url:
            for (_, u), ctx in self.index.items():
                if u == url:
                    return ctx
        return None

    # ------------------------------------------------------------------
    # Pomocné funkce pro tvorbu promptu
    # ------------------------------------------------------------------
    @staticmethod
    def build_prompt(question_text: str, context: Optional[dict]) -> str:
        """Složí text promptu pro LLM.

        * `question_text` – text otázky položený studentem
        * `context` – analýza kontextu (dictionary) nebo None
        """
        parts: list[str] = [f"Otázka studenta: {question_text}\n"]

        if context:
            summary = context.get("shrnuti")
            details = " ".join(context.get("poznatky_relevantni_k_odpovedim", [])[:2])
            parts.append(f"Kontekst obrázku: {summary}.")
            if details:
                parts.append(f"Důležité poznatky: {details}")

        parts.append("Odpověz ČESKY, jasně a výstižně.")
        return "\n".join(parts)


# -------------------------------------------------------------------------
# Příklady použití (lze spustit jako skript: python image_context.py)
# -------------------------------------------------------------------------
if __name__ == "__main__":
    # Cesta k adresáři s JSON soubory, relativně k tomuto skriptu
    # Předpokládá strukturu:
    # /
    # ├── py_scripts/
    # │   └── image_context.py
    # └── public/
    #     └── analyza_okruh1/
    #         ├── okruh1_analyza_URL_1.json
    #         └── ...
    
    # Najdeme kořenový adresář projektu (půjdeme o dva adresáře výš)
    project_root = Path(__file__).resolve().parent.parent
    json_directory = project_root / "public" / "analyza_okruh1"

    print(f"Načítám data z adresáře: {json_directory}")
    
    try:
        # Příklad 1: Načtení všech JSON souborů z jednoho adresáře
        store = ImageContextStore(json_directory)
        print(f"Úspěšně načteno {len(store.index)} záznamů.")

        # Příklad 2 – dotaz podle ID otázky z prvního souboru
        qid = "24030003"
        ctx = store.get_context(question_id=qid)
        prompt = store.build_prompt(
            "Musí řidič dodržet bezpečný boční odstup při míjení cyklisty v označeném pruhu?",
            ctx,
        )
        print("\n----------- PROMPT 1 (z ID otázky) --------------")
        print(prompt)
        assert ctx is not None, "Kontext pro qid 24030003 by měl existovat"

        # Příklad 3 – dotaz podle URL z jiného souboru
        url = "https://www.autoskola-testy.cz/img/single/240707.png" # Z okruh1_analyza_URL_2.json
        ctx2 = store.get_context(url=url)
        prompt2 = store.build_prompt("Co musím udělat, když vyjíždím z parkoviště?", ctx2)
        print("\n----------- PROMPT 2 (z URL) --------------")
        print(prompt2)
        assert ctx2 is not None, "Kontext pro URL ...240707.png by měl existovat"

        # Příklad 4 - Dotaz na neexistující data
        ctx3 = store.get_context(question_id="NEEXISTUJICI_ID")
        print("\n----------- PROMPT 3 (neexistující) --------------")
        prompt3 = store.build_prompt("Tohle je test", ctx3)
        print(prompt3)
        assert ctx3 is None, "Neexistující kontext by měl vrátit None"

    except (ValueError, RuntimeError) as e:
        print(f"Chyba: {e}")
