### Prompt pro AI na opravu dat

**Cíl:** Opravit historická data o testech (`analysisData`) tak, aby byla kompatibilní s novou logikou zobrazování. Problém spočívá v chybějících záznamech `SESSION_END`, které oddělují jednotlivé testy. Je potřeba tyto záznamy zpětně doplnit.

**Kontext:**
Aplikace ukládá každou odpověď v testu jako objekt v poli `analysisData`. Nově se na konec každého dokončeného testu vkládá speciální záznam (marker) s `questionId` začínajícím na `SESSION_END`. Stará data tento marker nemají, a proto se několik testů jeví jako jeden dlouhý test. Standardní ostrý test má přesně 25 otázek.

**Vstupní data:**
1.  `analysisData`: Pole objektů, kde každý objekt reprezentuje jednu odpověď.
2.  `summaryData`: Agregovaná data. **Tato data není třeba opravovat**, protože se automaticky přepočítají z opraveného `analysisData`.

**Instrukce pro AI:**

1.  Vezmi jako vstup pole `analysisData`. Ujisti se, že je chronologicky seřazené podle `answeredAt`.
2.  Iteruj polem a identifikuj po sobě jdoucí bloky záznamů, které mají `mode: 'exam'`.
3.  Tyto bloky rozděl na jednotlivá "sezení" (sessions). Každé sezení má přesně 25 otázek.
4.  Za každý takový kompletní blok 25 otázek vlož nový objekt – `SESSION_END` marker.
5.  Struktura `SESSION_END` markeru musí být přesně následující:
    *   `user`: Stejné `user` ID jako u ostatních záznamů v sezení.
    *   `questionId`: Unikátní řetězec, např. `SESSION_END_{timestamp}`, kde timestamp je čas poslední otázky v sezení.
    *   `questionText`: `'Session End Marker'`
    *   `groupId`: `-1`
    *   `answeredAt`: Časová značka (`ISO string`) poslední, 25. otázky v sezení.
    *   `timeToAnswer`: `0`
    *   `isCorrect`: `false`
    *   `isFirstAttemptCorrect`: `false`
    *   `answerIndex`: `-1`
    *   `mode`: `'exam'`
    *   `sessionStatus`: `'dokončený'`

6.  **Příklad:** Pokud najdeš 25 po sobě jdoucích záznamů s `mode: 'exam'`, za 25. záznam vlož `SESSION_END` marker. Pokud poté následuje dalších 25 záznamů, proces opakuj.
7.  Pokud na konci dat zůstane nekompletní blok (méně než 25 otázek), jedná se o nedokončený test. Za tento blok **nevkládej** `SESSION_END` marker.
8.  Výstupem musí být kompletní, opravené pole `analysisData`, které obsahuje všechny původní záznamy a nově vložené `SESSION_END` markery na správných místech.

**Příklad dat před a po opravě:**

**PŘED:**
```json
[
  // ... 24 otázek z prvního testu ...
  { "questionId": "q25_test1", "mode": "exam", "answeredAt": "2025-07-20T10:30:00Z" },
  { "questionId": "q1_test2", "mode": "exam", "answeredAt": "2025-07-21T11:00:00Z" },
  // ... 24 otázek z druhého testu ...
  { "questionId": "q25_test2", "mode": "exam", "answeredAt": "2025-07-21T11:30:00Z" }
]
```

**PO:**
```json
[
  // ... 24 otázek z prvního testu ...
  { "questionId": "q25_test1", "mode": "exam", "answeredAt": "2025-07-20T10:30:00Z" },
  { "questionId": "SESSION_END_1721471400000", "mode": "exam", "sessionStatus": "dokončený", "answeredAt": "2025-07-20T10:30:00Z", "groupId": -1, ... },
  { "questionId": "q1_test2", "mode": "exam", "answeredAt": "2025-07-21T11:00:00Z" },
  // ... 24 otázek z druhého testu ...
  { "questionId": "q25_test2", "mode": "exam", "answeredAt": "2025-07-21T11:30:00Z" },
  { "questionId": "SESSION_END_1721561400000", "mode": "exam", "sessionStatus": "dokončený", "answeredAt": "2025-07-21T11:30:00Z", "groupId": -1, ... }
]
