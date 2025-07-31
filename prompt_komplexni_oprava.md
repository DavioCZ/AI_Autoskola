# Prompt pro AI: Komplexní oprava a validace databáze autoškoly

**Tvá role:** Jsi specializovaný nástroj na validaci a opravu dat. Tvým úkolem je vzít dva JSON soubory (`analysis.json`, `summary.json`) a sadu pravidel a vygenerovat jejich opravené a plně konzistentní verze.

---

## VSTUPY

1.  **`analysis.json`:** Soubor obsahující pole surových záznamů o odpovědích.
2.  **`summary.json`:** Soubor obsahující objekt s agregovanými statistikami.
3.  **Pravidla (data_format_guide):** Následující text definuje správnou strukturu a logiku dat.

```markdown
# Průvodce datovými formáty v databázi

## 1. Surová data událostí (`analysis`)

Obsahuje pole (JSON array) objektů. Každý objekt má strukturu:
{
  "user": "string", "questionId": "string", "questionText": "string", "groupId": "number",
  "answeredAt": "string" (ISO 8601), "timeToAnswer": "number" (ms),
  "isCorrect": "boolean", "isFirstAttemptCorrect": "boolean",
  "answerIndex": "number", "mode": "'exam' | 'practice'"
}

### Speciální záznam: `SESSION_END`
Na konec každého dokončeného ostrého testu se vkládá marker:
{
  "user": "string", "questionId": "string" (např. "SESSION_END_..."),
  "questionText": "Session End Marker", "groupId": -1, "answeredAt": "string" (ISO),
  "timeToAnswer": 0, "isCorrect": false, "isFirstAttemptCorrect": false,
  "answerIndex": -1, "mode": "exam",
  "sessionStatus": "'dokončený' | 'nedokončený' | 'nestihnutý'"
}

## 2. Agregovaná data (`summary`)

Obsahuje jeden JSON objekt, kde klíče jsou `questionId`. Struktura hodnoty:
{
  "questionId": "string", "questionText": "string", "groupId": "number",
  "attempts": "number", "correct": "number", "totalTimeToAnswer": "number" (ms),
  "history": [ { "answeredAt": "string", "isCorrect": "boolean", "timeToAnswer": "number" } ],
  "avgTime": "number" (ms), "successRate": "number" (%)
}
```

---

## POSTUP ZPRACOVÁNÍ (KROK ZA KROKEM)

### Krok 1: Oprava a validace `analysis.json`

1.  **Načti `analysis.json`**. Seřaď pole chronologicky podle `answeredAt`.
2.  **Validuj a doplň `SESSION_END` markery:**
    *   Iteruj záznamy s `mode: 'exam'`.
    *   Identifikuj bloky po 25 otázkách, které nemají na konci `SESSION_END` marker.
    *   Za každý takový kompletní blok 25 otázek vlož správně naformátovaný `SESSION_END` marker podle pravidel výše. `sessionStatus` nastav na `'dokončený'`.
    *   Pokud na konci zůstane nekompletní blok (méně než 25 otázek), marker nevkládej.
3.  **Validuj datové typy:** Projdi každý záznam a zkontroluj, zda datové typy odpovídají pravidlům (např. `groupId` musí být číslo). Pokud ne, pokus se je opravit (např. `"groupId": "1"` -> `"groupId": 1`).
4.  **Výstup kroku 1:** Ulož opravená data jako `corrected_analysis.json`.

### Krok 2: Kompletní rekonstrukce `summary.json`

**Důležité:** Ignoruj původní `summary.json`. Vytvoř zcela nový souhrn z opravených dat z kroku 1, aby byla zajištěna 100% konzistence.

1.  **Vytvoř prázdný objekt** pro nový souhrn.
2.  **Iteruj `corrected_analysis.json`:**
    *   Pro každý záznam (kromě `SESSION_END` markerů):
        *   Pokud v novém souhrnu neexistuje záznam pro daný `questionId`, vytvoř ho podle struktury z pravidel (s `attempts: 0`, `correct: 0` atd.).
        *   Inkrementuj `attempts`.
        *   Pokud je `isCorrect: true`, inkrementuj `correct`.
        *   Přičti `timeToAnswer` k `totalTimeToAnswer`.
        *   Přidej záznam do pole `history`.
3.  **Dopočítej odvozené hodnoty:**
    *   Po dokončení iterace projdi všechny záznamy v novém souhrnu.
    *   Vypočítej `avgTime` (`totalTimeToAnswer / attempts`).
    *   Vypočítej `successRate` (`(correct / attempts) * 100`).
4.  **Výstup kroku 2:** Ulož kompletně nový souhrn jako `corrected_summary.json`.

---

## FINÁLNÍ VÝSTUP

Poskytni mi dva oddělené a kompletní JSON soubory:

1.  **`corrected_analysis.json`**
2.  **`corrected_summary.json`**

Každý soubor v samostatném, správně naformátovaném JSON bloku.
