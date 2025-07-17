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
    - Klikněte na **Add Environment Variable**.
    - **Key**: `GEMINI_API_KEY`
    - **Value**: Vložte svůj klíč pro Google Gemini API.

## Krok 5: Nasazení a otestování

1.  Klikněte na **Create Web Service**.
2.  Render automaticky spustí `Build Command` a následně `Start Command`. Průběh můžete sledovat v záložce **Logs**.
3.  Po úspěšném nasazení (zobrazí se status "Live") otevřete vygenerovanou URL (např. `https://ai-autoskola.onrender.com`).
4.  Ověřte, že se aplikace načetla a všechny její části, včetně AI Lektora, fungují správně.

## Řešení možných problémů

*   **Chyba při buildu**: Zkontrolujte logy. Nejčastější příčinou bývá chybějící závislost v `package.json` nebo `requirements.txt`.
*   **Aplikace nefunguje (Application Error)**: Zkontrolujte logy spuštění (`Start Command`). Může se jednat o chybějící environmentální proměnnou (`GEMINI_API_KEY`) nebo chybu v `server.js`.
*   **Python skript selhává**: Ujistěte se, že je v `Build Command` správně `pip install -r requirements.txt`. Render by měl automaticky detekovat `requirements.txt` a nainstalovat Python.
