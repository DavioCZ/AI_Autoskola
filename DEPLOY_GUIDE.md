# Návod pro nasazení na Render.com

Tento návod popisuje, jak nasadit aplikaci **AI_Autoskola**, která využívá Node.js (Express) pro backend a API, React (Vite) pro frontend a Python pro specifické skripty.

## Krok 1: Příprava projektu v Gitu

1.  **Ujistěte se, že je váš repozitář aktuální** na GitHubu.
2.  Není potřeba vytvářet speciální větev, nasazovat budeme přímo z `main` větve.

## Krok 2: Konfigurace pro nasazení

Většina konfigurace je již hotová:
*   `server.js` je nastaven tak, aby servíroval statické soubory z adresáře `dist`.
*   `package.json` obsahuje všechny potřebné závislosti.
*   `requirements.txt` definuje Python závislosti.

## Krok 3: Vytvoření účtu a projektu na Render.com

1.  Přejděte na `https://render.com` a přihlaste se pomocí svého GitHub účtu.
2.  V dashboardu klikněte na **New +** → **Web Service**.
3.  Propojte svůj GitHub účet a vyberte repozitář `AI_Autoskola`.

## Krok 4: Konfigurace Web Service v Renderu

Při vytváření nové Web Service vyplňte následující pole:

-   **Name**: `ai-autoskola` (nebo si zvolte vlastní název).
-   **Region**: `Frankfurt (EU Central)` pro nejlepší dostupnost v Evropě.
-   **Branch**: `main`.
-   **Root Directory**: Ponechte prázdné.
-   **Runtime**: `Node`.

-   **Build Command**: `npm install && npm run build && pip install -r requirements.txt`
    *Tento příkaz zajistí instalaci Node.js i Python závislostí a sestavení frontendu.*

-   **Start Command**: `node server.js`

-   **Environment Variables** (v sekci "Advanced"):
    - Zde přidáte všechny potřebné klíče pro provoz aplikace.

    1.  **Přidejte `GEMINI_API_KEY`**:
        -   **Key**: `GEMINI_API_KEY`
        -   **Value**: Vložte svůj klíč pro Google Gemini API.

    2.  **Přidejte klíče pro Upstash (viz Krok 5)**.

## Krok 5: Nastavení perzistentního úložiště (Upstash Redis)

Protože bezplatný plán na Renderu neumožňuje trvalé ukládání souborů, využijeme externí bezplatnou databázi **Upstash** pro ukládání dat analýz.

1.  **Vytvořte si účet** na [upstash.com](https://upstash.com) (můžete se přihlásit přes Google nebo GitHub).
2.  V dashboardu klikněte na **Create Database**.
3.  **Nastavení databáze**:
    -   **Name**: `ai-autoskola` (nebo si zvolte vlastní)
    -   **Primary Region**: `eu-central-1` (Frankfurt) – je důležité, aby region databáze byl stejný jako region vaší aplikace na Renderu pro minimální latenci.
    -   **Eviction**: Ponechte vypnuté.
    -   Klikněte na **Create Database**.
4.  **Získejte přihlašovací údaje**:
    -   Po vytvoření databáze se zobrazí její detail.
    -   Najděte sekci **`@upstash/redis`** a zkopírujte si hodnoty pro:
        -   `UPSTASH_REDIS_REST_URL`
        -   `UPSTASH_REDIS_REST_TOKEN`
5.  **Vložte údaje do Renderu**:
    -   Vraťte se do nastavení vaší Web Service na Renderu do sekce **Environment**.
    -   Klikněte na **Add Environment Variable** a přidejte postupně obě proměnné s jejich zkopírovanými hodnotami.

## Krok 6: Nasazení a otestování

1.  Klikněte na **Create Web Service**.
2.  Render automaticky spustí `Build Command` a následně `Start Command`. Průběh můžete sledovat v záložce **Logs**.
3.  Po úspěšném nasazení (zobrazí se status "Live") otevřete vygenerovanou URL (např. `https://ai-autoskola.onrender.com`).
4.  Ověřte, že se aplikace načetla a všechny její části, včetně AI Lektora, fungují správně.

## Řešení možných problémů

*   **Chyba při buildu**: Zkontrolujte logy. Nejčastější příčinou bývá chybějící závislost v `package.json` nebo `requirements.txt`.
*   **Aplikace nefunguje (Application Error)**: Zkontrolujte logy spuštění (`Start Command`). Může se jednat o chybějící environmentální proměnnou (`GEMINI_API_KEY`) nebo chybu v `server.js`.
*   **Python skript selhává**: Ujistěte se, že je v `Build Command` správně `pip install -r requirements.txt`. Render by měl automaticky detekovat `requirements.txt` a nainstalovat Python.
*   **Data se neukládají**: Zkontrolujte, zda máte v **Environment Variables** na Renderu správně nastavené `UPSTASH_REDIS_REST_URL` a `UPSTASH_REDIS_REST_TOKEN`. V logu aplikace by se po startu mělo objevit hlášení "✅ Připojeno k Upstash Redis.".
