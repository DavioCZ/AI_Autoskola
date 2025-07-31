# Průvodce datovým formátem: Autoškola App

Tento dokument popisuje současnou a navrhovanou strukturu dat ukládaných v Upstash Redis. Cílem je vytvořit robustní, škálovatelný a snadno udržovatelný systém pro správu uživatelských dat.

---

## 1. Současný stav (Legacy Model)

### Struktura

- **`user:{userId}:analysis`**: (JSON pole) Ukládá všechny záznamy o odpovědích jako jedno velké pole. Každý prvek je objekt s detaily o odpovědi.
- **`user:{userId}:summary`**: (JSON objekt) Předpočítaný souhrn statistik pro jednotlivé otázky (úspěšnost, počet pokusů).
- **`user:{userId}:badges`**: (JSON pole) Seznam odemčených odznaků.

### Problémy

1.  **Neefektivita a duplicity**: Přidávání do velkého JSON pole je neefektivní. Celé pole se musí načíst, dekódovat, upravit a znovu zapsat. To vedlo k problémům s duplicitními záznamy.
2.  **Nekonzistence dat**: Statistiky (`summary`) jsou odvozené od surových dat (`analysis`). Jakákoli operace (jako čištění duplicit) vyžaduje manuální a často chybovou synchronizaci obou struktur.
3.  **Špatná škálovatelnost**: S rostoucím počtem odpovědí se klíč `analysis` stává obrovským, což zpomaluje veškeré operace.
4.  **Nejasné oddělení dat**: Není jasně odděleno, co jsou surová data a co jsou agregované statistiky.

---

## 2. Cílová architektura (V3 Model)

Tento model integruje všechny expertní doporučení pro maximální výkon, škálovatelnost a robustnost.

### Klíčové principy

-   **Event Sourcing**: Všechny změny stavu (odpovědi na otázky) jsou ukládány jako neměnný sled událostí (event log).
-   **Command Query Responsibility Segregation (CQRS)**: Zápis (Command) je optimalizován pro rychlost (přidání události). Čtení (Query) je optimalizováno pro rychlost pomocí předpočítaných, denormalizovaných pohledů (agregací).
-   **Atomicita**: Zápis události a následná aktualizace agregací probíhá v rámci jedné atomické operace (Redis Pipeline/Lua), aby se zabránilo nekonzistentním stavům.

### Nová struktura klíčů (V3)

-   **`users:{userId}:events` (Surová data)**
    -   **Typ**: **Redis Stream**.
    -   **Obsah**: Každá položka je událost s automaticky generovaným ID (`timestamp-seq`). Obsahuje data o odpovědi.
    -   **Výhody**: Ideální pro logování, časové dotazy (`XRANGE`), a budoucí asynchronní zpracování pomocí Consumer Groups.
    -   **Správa velikosti**: Omezena na posledních ~50 000 událostí pomocí `MAXLEN` pro úsporu paměti.

-   **`users:{userId}:summaries` (Agregace per otázka)**
    -   **Typ**: Hash.
    -   **Obsah**: `questionId` -> JSON se statistikami (`attempts`, `successRate`, ...).
    -   **Pojmenování**: Sjednoceno na plurál.

-   **`users:{userId}:stats` (Celkové statistiky)**
    -   **Typ**: Hash.
    -   **Obsah**: Klíče jako `totalTests`, `averageScore`.

-   **`users:{userId}:badges` (Gamifikace)**
    -   **Typ**: **Set**.
    -   **Obsah**: Jednoduchý seznam ID odemčených odznaků (např. `first_test_completed`). Pro odznaky s úrovněmi (např. "Mistr křižovatek") se použije formát `badgeId:level`, např. `crossroads_master:3`.

-   **`users:{userId}:heatmap` (Data pro heatmapu)**
    -   **Typ**: Hash.
    -   **Obsah**: `YYYY-MM-DD` -> JSON `{ "answered": 50, "correct": 45 }`.
    -   **Optimalizace**: Lze použít i `INCRBY` na klíče jako `heatmap:{userId}:2025-07-29` s TTL ~400 dní.

-   **`users:{userId}:due_cards` (Spaced Repetition)**
    -   **Typ**: **Sorted Set**.
    -   **Obsah**: `questionId` s `score` nastaveným na `timestamp` dalšího opakování. Umožňuje bleskový dotaz na karty k opakování (`ZRANGEBYSCORE`).

-   **`meta:{userId}` (Metadata)**
    -   **Typ**: Hash.
    -   **Obsah**: `schemaVersion` -> `3`. Umožňuje aplikaci rozpoznat formát dat a reagovat podle toho.

---

## 3. Plán migrace (Strategie "Blue-Green")

Použijeme nejbezpečnější metodu: migrace do **nové, čisté databáze**.

1.  **Zřízení nové databáze**:
    -   Vytvoříte novou, prázdnou databázi v Upstash.
    -   Poskytnete mi nové přístupové údaje (`UPSTASH_REDIS_V3_URL`, `UPSTASH_REDIS_V3_TOKEN`), které uložíme do `.env`.

2.  **Úprava migračního skriptu** (`scripts/migrate_data_v3.js`):
    -   Skript se připojí ke **dvěma** databázím: staré (zdroj) a nové (cíl).
    -   Bude iterovat přes klíče ve staré DB pomocí `SCAN`, aby nedošlo k zablokování.

3.  **Proces migrace pro každého uživatele**:
    -   Načte data ze starého klíče `user:{userId}:analysis`.
    -   V **nové databázi** vytvoří všechny nové struktury (Stream pro `events`, Hashe pro `summaries` a `stats`, atd.) podle V3 architektury.
    -   Do `meta:{userId}` v nové DB zapíše `schemaVersion: 3`.

4.  **Přepnutí aplikace**:
    -   Po úspěšném dokončení a ověření migrace se v souboru `.env` jednoduše přepnou hlavní přístupové údaje na novou V3 databázi.
    -   Aplikace se restartuje a začne okamžitě pracovat s novou, čistou a výkonnou datovou strukturou.

5.  **Záloha**:
    -   Stará databáze zůstává netknutá a slouží jako perfektní záloha.

### Výhody této strategie

-   **Nulové riziko**: Produkční data nejsou během migrace nijak modifikována.
-   **Žádný downtime**: Přepnutí na novou databázi je okamžité (změna v `.env` a restart serveru).
-   **Snadný rollback**: V případě jakýchkoli problémů se stačí vrátit k původním přístupovým údajům v `.env`.

---

## 4. Cílové využití dat v novém modelu

Tato sekce mapuje, jak budou jednotlivé funkce aplikace využívat uživatelská data **po přechodu na V2 model**. Cílem je ověřit, že navrhovaná struktura podporuje všechny současné i budoucí požadavky.

### Současné funkce

-   **Dashboard (Hlavní stránka)**
    -   **Využívá**: `stats` (celkové statistiky), `summary` (pro nejhorší okruhy).
    -   **Popis**: Zobrazuje klíčové metriky jako průměrné skóre, počet testů a úspěšnost. Identifikuje nejslabší témata.

-   **Podrobná analýza**
    -   **Využívá**: `summary` (pro přehled chybovosti), `analysis` (pro historii odpovědí).
    -   **Popis**: Umožňuje uživateli procházet všechny otázky, na které odpověděl špatně, a vidět detailní historii svých pokusů.

-   **Spaced Repetition ("Balíček na dnes")**
    -   **Využívá**: `summary`.
    -   **Popis**: Server na základě dlouhodobé úspěšnosti v `summary` sestavuje personalizovaný balíček otázek k opakování.

-   **Systém odznaků**
    -   **Využívá**: `analysis`, `summary`, `stats`.
    -   **Popis**: Po dokončení testu se na základě surových i agregovaných dat vyhodnocuje, zda uživatel splnil podmínky pro zisk nových odznaků.

-   **Export dat**
    -   **Využívá**: `analysis`, `badges`.
    -   **Popis**: Umožňuje uživateli stáhnout si kompletní historii svých odpovědí a získaných odznaků.

### Plánované budoucí funkce (dle TASK_LIST.md)

-   **Heatmapa úspěšnosti (Fáze 6.3)**
    -   **Bude využívat**: `analysis` (surová data s časovými značkami).
    -   **Popis**: Vyžaduje přístup k historii odpovědí v čase pro vizualizaci denní aktivity a úspěšnosti. Nový model s oddělenými událostmi je pro toto ideální.

-   **Pokročilý systém odznaků (Fáze 7)**
    -   **Bude využívat**: `analysis`, `stats`.
    -   **Popis**: Pro sledování trendů (zlepšení v čase), sérií správných odpovědí (streaks) a konzistence (aktivní dny v řadě) bude nutné pracovat přímo se surovými, časově označenými daty v `analysis`.

-   **Přehled testů v podrobné analýze (Fáze 9.1)**
    -   **Bude využívat**: `analysis`.
    -   **Popis**: Funkce bude potřebovat seskupit jednotlivé odpovědi (události) podle `sessionId`, aby mohla zobrazit výsledky každého jednotlivého testu. To je s novým modelem snadno proveditelné.

-   **Graf vývoje úspěšnosti (dle vašeho návrhu)**
    -   **Bude využívat**: `analysis`.
    -   **Popis**: Podobně jako u přehledu testů, i zde se data získají seskupením událostí z `analysis` podle `sessionId`. Pro každý test (session) se vypočítá celkové skóre a skóre po jednotlivých okruzích. Tyto body se pak vynesou do grafu v chronologickém pořadí. Nový model toto plně podporuje bez nutnosti duplikovat data.
