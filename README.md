# Autoškola B - Testovací Aplikace

Tato aplikace slouží k procvičování a skládání testů pro získání řidičského oprávnění skupiny B.

## Funkce

- **Ostrý test:** Simulace reálného testu s časovým limitem 30 minut, 25 náhodně vybranými otázkami a bodovým hodnocením (max 50 bodů, potřeba 43 pro úspěch).
- **Procvičování:** Možnost výběru konkrétních okruhů otázek pro cílené učení.
- **Statistiky:** Sledování úspěšnosti v ostrých testech (počet pokusů, úspěšnost, průměrné skóre, průměrný čas) a v procvičování (počet zodpovězených otázek, procento správných odpovědí). Statistiky jsou ukládány lokálně v prohlížeči.
- **AI Chatbot / Lektor (Mock):** Během testu nebo procvičování je k dispozici chatovací rozhraní ("Zeptat se AI lektora"), kde lze klást otázky týkající se aktuálně zobrazené testové otázky. Pomáhá lépe porozumět otázkám a jejich kontextu. **Důležité:** Odpovědi jsou aktuálně pouze simulované (mockované) a nejsou generovány skutečnou umělou inteligencí.
- **Přehled odpovědí:** Po dokončení testu/procvičování se zobrazí detailní přehled všech otázek s vyznačením správných a vašich odpovědí.

## Struktura projektu

- **`public/`**: Obsahuje JSON soubory s otázkami pro jednotlivé okruhy (`okruh1.json` - `okruh7.json`).
- **`src/`**: Hlavní zdrojové kódy aplikace.
  - **`DrivingTestApp.tsx`**: Hlavní komponenta aplikace obsahující veškerou logiku testu, procvičování, statistiky a UI.
  - **`main.tsx`**: Vstupní bod aplikace, renderuje `DrivingTestApp`.
  - **`index.css`**: Globální styly (využívá Tailwind CSS).
- **`components/ui/`**: Opakovaně použitelné UI komponenty (Button, Card, Checkbox, Progress, RadioGroup, Textarea) vytvořené pomocí Shadcn/ui.
- **`lib/`**: Pomocné utility (např. `utils.ts` pro `cn` funkci).
- **`scraper/`**: Python skripty (`scraper_okruhX.py`) pravděpodobně použité pro získání dat otázek.
- **`database - otazky/`**: Adresář obsahující archiv starších otázek.

## Použité technologie

- **React** (s Vite jako buildovacím nástrojem)
- **TypeScript**
- **Tailwind CSS** pro stylování
- **Shadcn/ui** pro UI komponenty
- **Lucide React** pro ikony

## Spuštění projektu

Projekt se skládá ze dvou hlavních částí:
1.  **Frontendová aplikace** (Vite + React) - zobrazuje uživatelské rozhraní.
2.  **Backendový server** (Node.js + Express) - slouží jako proxy pro AI lektora (Google Gemini).

Pro plnou funkčnost je nutné spustit obě části.

### 1. Příprava

**a) Instalace závislostí:**
Otevřete terminál v kořenovém adresáři projektu a spusťte:
```bash
npm install
```

**b) Nastavení AI lektora:**
Backendový server vyžaduje API klíč pro Google Gemini.
1.  Vytvořte v kořenovém adresáři soubor s názvem `.env`.
2.  Do souboru vložte svůj API klíč v následujícím formátu:
    ```
    GEMINI_API_KEY="VÁŠ_API_KLÍČ_PŘIJDE_SEM"
    ```

### 2. Spuštění

Otevřete terminál v kořenovém adresáři projektu a spusťte jediný příkaz:
```bash
npm run dev
```
Tento příkaz automaticky spustí jak backendový server (na portu 3001), tak frontendovou aplikaci (na portu 5173) najednou. Aplikace bude dostupná na `http://localhost:5173`.

### 3. Produkční sestavení
    ```bash
    npm run build
    ```
    Výsledné soubory budou v adresáři `dist/`.

4.  **Náhled produkčního sestavení:**
    ```bash
    npm run preview
    ```

## Okruhy otázek

Aplikace využívá následující okruhy otázek:

1.  Pravidla provozu (10 otázek, 2 body/otázka)
2.  Dopravní značky (3 otázky, 1 bod/otázka)
3.  Zásady bezpečné jízdy (4 otázky, 2 body/otázka)
4.  Dopravní situace (3 otázky, 4 body/otázka)
5.  Předpisy o vozidlech (2 otázky, 1 bod/otázka)
6.  Předpisy související (2 otázky, 2 body/otázka)
7.  Zdravotnická příprava (1 otázka, 1 bod/otázka)

## Poznámky

- Aplikace ukládá statistiky do `localStorage` prohlížeče pod klíčem `autoskolastats`.
