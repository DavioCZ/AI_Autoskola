# Nasazení AI_Autoskola na vlastní Ubuntu Server

Tento návod popisuje, jak nasadit aplikaci `AI_Autoskola` na vašem vlastním serveru s operačním systémem Ubuntu. Pokrývá všechny kroky od instalace závislostí až po spuštění aplikace a její zpřístupnění přes Nginx.

---

## Rozdíly oproti nasazení na Render.com

| Aspekt                  | Render.com (PaaS)                                       | Vlastní Ubuntu Server (IaaS)                                     |
| ----------------------- | ------------------------------------------------------- | ---------------------------------------------------------------- |
| **Správa serveru**      | **Automatizovaná.** Render se stará o OS, bezpečnost, aktualizace. | **Manuální.** Vy jste zodpovědní za instalaci, konfiguraci a údržbu OS. |
| **Instalace prostředí** | **Definováno v UI.** Runtime (Node, Python) se nastaví v dashboardu. | **Manuální.** Musíte nainstalovat Node.js, Python, Nginx atd. přes `apt`. |
| **Build proces**        | **Jeden příkaz.** `npm install && npm run build && pip install ...` | **Manuální spouštění.** Spouštíte příkazy postupně v terminálu. |
| **Spuštění aplikace**   | **Automatické.** Render spustí `Start Command` (`node server.js`). | **Manuální + Process Manager.** Musíte použít nástroj jako `pm2` pro běh na pozadí. |
| **Doména a HTTPS**      | **Automatické.** Render poskytuje subdoménu a spravuje SSL certifikáty. | **Manuální.** Musíte si pořídit doménu a nastavit Nginx a Let's Encrypt pro HTTPS. |
| **Cena**                | **Předvídatelná.** Platíte za konkrétní plán (existuje i bezplatný). | **Variabilní.** Platíte za pronájem serveru (VPS) + případné náklady na doménu. |
| **Flexibilita**         | **Omezená.** Jste vázáni na možnosti platformy.          | **Maximální.** Plná kontrola nad serverem a softwarem.            |

---

## Krok 1: Příprava Ubuntu serveru

Nejdříve je potřeba na server nainstalovat veškerý potřebný software. Připojte se k serveru přes SSH a spusťte následující příkazy:

```bash
# Aktualizace seznamu balíčků
sudo apt update
sudo apt upgrade -y

# Instalace Gitu
sudo apt install git -y

# Instalace Nginx (pro reverzní proxy)
sudo apt install nginx -y

# Instalace Node.js (doporučeno přes NVM - Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
# Restartujte terminál nebo spusťte 'source ~/.bashrc'
nvm install --lts  # Nainstaluje nejnovější LTS verzi Node.js
nvm use --lts

# Instalace Pythonu a Pip
sudo apt install python3 python3-pip python3-venv -y
```

## Krok 2: Klonování repozitáře a instalace závislostí

1.  **Naklonujte repozitář** do svého domovského adresáře (nebo kamkoliv jinam).
    ```bash
    git clone https://github.com/DavioCZ/AI_Autoskola.git
    cd AI_Autoskola
    ```

2.  **Nainstalujte Node.js a Python závislosti.**
    *Použijeme `--prefix` pro `npm`, abychom zajistili, že se balíčky nainstalují do správného adresáře, i kdyby se `npm` pokoušelo hledat jinde.*
    ```bash
    npm install --prefix /var/repo/
    pip install -r requirements.txt
    ```

## Krok 3: Konfigurace prostředí

Aplikace vyžaduje citlivé klíče, které by neměly být v kódu. Uložíme je do souboru `.env`.

1.  **Vytvořte soubor `.env`** v kořenovém adresáři projektu.
    ```bash
    nano .env
    ```

2.  **Vložte do něj následující obsah** a nahraďte hodnoty svými klíči.
    *   `UPSTASH_REDIS_*` klíče získáte podle návodu v `DEPLOY_GUIDE.md`.
    *   `PORT` můžete nechat na `3001`, Nginx se o přesměrování postará.

    ```ini
    # .env soubor
    GEMINI_API_KEY=VASE_GOOGLE_GEMINI_API_KEY
    UPSTASH_REDIS_REST_URL=VASE_UPSTASH_URL
    UPSTASH_REDIS_REST_TOKEN=VAS_UPSTASH_TOKEN
    PORT=3001
    ```

## Krok 4: Sestavení (Build) aplikace

Nyní je potřeba sestavit frontend a zkompilovat serverový kód.

```bash
npm run build
```

Tento příkaz:
1.  Zkompiluje `server.ts` a další serverové soubory do JavaScriptu v adresáři `build`.
2.  Sestaví React aplikaci pomocí Vite do adresáře `dist`.

## Krok 5: Spuštění aplikace pomocí PM2

Aby aplikace běžela neustále na pozadí (i po odhlášení ze SSH), použijeme process manager `pm2`.

1.  **Nainstalujte `pm2` globálně.**
    ```bash
    npm install pm2 -g
    ```

2.  **Spusťte aplikaci pomocí `pm2`.**
    *   Spouštíme zkompilovaný `build/server.js`, nikoliv `server.js`.
    ```bash
    pm2 start build/server.js --name ai-autoskola
    ```

3.  **Ověřte, že aplikace běží.**
    ```bash
    pm2 list
    # Měli byste vidět 'ai-autoskola' se statusem 'online'
    ```

4.  **Nastavte `pm2`, aby se spouštěl automaticky po restartu serveru.**
    ```bash
    pm2 startup
    # Postupujte podle instrukcí, které příkaz vypíše
    pm2 save
    ```

## Krok 6: Konfigurace Nginx jako reverzní proxy

Nyní nastavíme Nginx, aby přesměrovával veřejný provoz z portu 80 (HTTP) na port 3001, kde běží naše aplikace.

1.  **Vytvořte nový konfigurační soubor pro vaši doménu.** (Nahraďte `vase-domena.cz` vaší skutečnou doménou).
    ```bash
    sudo nano /etc/nginx/sites-available/vase-domena.cz
    ```

2.  **Vložte následující konfiguraci.**
    ```nginx
    server {
        listen 80;
        server_name vase-domena.cz www.vase-domena.cz;

        location / {
            proxy_pass http://localhost:3001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

3.  **Aktivujte konfiguraci** vytvořením symbolického odkazu.
    ```bash
    sudo ln -s /etc/nginx/sites-available/vase-domena.cz /etc/nginx/sites-enabled/
    ```

4.  **Otestujte syntaxi Nginx a restartujte ho.**
    ```bash
    sudo nginx -t
    sudo systemctl restart nginx
    ```

Nyní by vaše aplikace měla být dostupná na `http://vase-domena.cz`.

## Krok 7 (Doporučeno): Zabezpečení pomocí HTTPS (Let's Encrypt)

1.  **Nainstalujte Certbot**, nástroj pro automatickou správu SSL certifikátů.
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    ```

2.  **Spusťte Certbot**, který automaticky upraví vaši Nginx konfiguraci.
    ```bash
    sudo certbot --nginx -d vase-domena.cz -d www.vase-domena.cz
    ```
    Postupujte podle interaktivních instrukcí (zadejte e-mail, odsouhlaste podmínky). Certbot automaticky nastaví přesměrování z HTTP na HTTPS.

3.  **Ověřte automatické obnovování certifikátu.**
    ```bash
    sudo certbot renew --dry-run
    ```

Vaše aplikace je nyní plně nasazená, zabezpečená a dostupná na `https://vase-domena.cz`.
