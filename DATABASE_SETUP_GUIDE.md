# Průvodce zřízením databáze na vlastním serveru

Tento dokument shrnuje všechny klíčové kroky a informace potřebné k úspěšnému nasazení a správě databáze na vašem vlastním serveru.

## 1. Server a Hosting

Prvním krokem je výběr platformy, kde vaše databáze poběží.

-   **Typ serveru:**
    -   **Virtuální Privátní Server (VPS):** Nejflexibilnější a nejběžnější volba. Získáte garantovaný výkon a plnou kontrolu nad systémem.
        -   *Doporučení poskytovatelé:* Hetzner, DigitalOcean, Vultr, Linode.
    -   **Dedikovaný server:** Pronájem celého fyzického stroje pro maximální výkon. Vhodné pro velmi náročné aplikace.
    -   **Vlastní hardware (On-Premise):** Fyzický server ve vaší správě. Vyžaduje stabilní internetové připojení, napájení a chlazení.

-   **Operační systém (OS):**
    -   Důrazně doporučujeme serverovou distribuci **Linuxu** kvůli stabilitě, bezpečnosti a široké podpoře.
        -   **Ubuntu Server:** Velmi populární, obrovská komunita a spousta návodů.
        -   **Debian:** Extrémně stabilní, ideální pro produkční prostředí.

-   **Hardwarové požadavky:**
    -   **CPU:** Pro menší až střední projekty postačí 2 vCPU.
    -   **RAM:** Databáze milují RAM. Minimum pro produkci jsou 2 GB, ale **doporučujeme 4 GB a více**.
    -   **Disk:** **SSD** nebo **NVMe** je nutností pro rychlé databázové operace. Velikost závisí na očekávaném objemu dat.

## 2. Databázový software (DBMS)

Na základě souborů ve vašem projektu (`mysql.js`, `supabase.ts`) se zaměříme na relační databáze.

-   **MariaDB (doporučeno pro začátek):**
    -   Komunitou vyvíjená, plně kompatibilní náhrada za MySQL.
    -   **Výhody:** Snadná instalace, obrovská podpora, skvělý výkon pro webové aplikace.
-   **PostgreSQL:**
    -   Technicky pokročilejší systém.
    -   **Výhody:** Vynikající pro komplexní dotazy, striktní dodržování SQL standardů, podpora pokročilých datových typů (JSONB, pole). Vhodný pro budoucí škálování.

## 3. Instalace a základní konfigurace (Příklad pro Ubuntu/Debian + MariaDB)

1.  **Připojení k serveru:**
    -   Použijte klienta **SSH**. Pro vyšší bezpečnost nakonfigurujte přihlašování pomocí SSH klíčů místo hesla.

2.  **Aktualizace systému:**
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```

3.  **Instalace MariaDB:**
    ```bash
    sudo apt install mariadb-server
    ```

4.  **Základní zabezpečení:**
    -   Spusťte interaktivní skript, který vás provede základním zabezpečením (nastavení hesla pro roota, odstranění anonymních uživatelů atd.).
    ```bash
    sudo mysql_secure_installation
    ```

5.  **Vytvoření databáze a uživatele:**
    -   **Nikdy nepoužívejte `root` účet pro připojení z aplikace!** Vždy vytvořte dedikovaného uživatele pro každou aplikaci.
    -   Přihlaste se do databáze jako root: `sudo mysql`
    -   Spusťte následující SQL příkazy:
    ```sql
    -- Vytvoření nové databáze
    CREATE DATABASE autoskola_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

    -- Vytvoření nového uživatele a nastavení hesla (nahraďte 'silne_heslo')
    CREATE USER 'autoskola_user'@'localhost' IDENTIFIED BY 'silne_heslo';

    -- Udělení všech práv na danou databázi tomuto uživateli
    GRANT ALL PRIVILEGES ON autoskola_db.* TO 'autoskola_user'@'localhost';

    -- Aplikování změn
    FLUSH PRIVILEGES;

    -- Ukončení
    EXIT;
    ```

## 4. Připojovací údaje (Credentials)

Pro připojení vaší aplikace budete potřebovat následující údaje. Uložte je bezpečně do `.env` souboru, který je v `.gitignore`.

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=autoskola_user
DB_PASSWORD=silne_heslo
DB_NAME=autoskola_db
```

-   **DB_HOST:** Pokud aplikace běží na stejném serveru, použijte `localhost`. Jinak IP adresa serveru.
-   **DB_PORT:** Výchozí pro MariaDB/MySQL je `3306`.

## 5. Zabezpečení sítě (Firewall)

Omezte přístup k serveru a databázi.

-   **Nástroj:** `ufw` (Uncomplicated Firewall) je standardem na Ubuntu.
-   **Konfigurace:**
    ```bash
    # Povolit základní porty
    sudo ufw allow ssh      # Port 22 pro váš přístup
    sudo ufw allow http     # Port 80 pro web
    sudo ufw allow https    # Port 443 pro web

    # Povolit přístup k databázi POUZE z IP adresy vaší aplikace
    # Pokud aplikace běží na stejném serveru, tento krok není nutný.
    # sudo ufw allow from IP_ADRESA_APLIKACE to any port 3306

    # Aktivovat firewall
    sudo ufw enable
    ```

## 6. Zálohování

Zálohy jsou naprosto kritické. Plánujte pro případ selhání hardwaru nebo lidské chyby.

-   **Strategie:** Pravidelné, automatické a ukládané na externí úložiště.
-   **Nástroj:** `mysqldump`
-   **Příklad skriptu pro zálohu (`backup.sh`):**
    ```bash
    #!/bin/bash
    DB_USER="autoskola_user"
    DB_PASS="silne_heslo"
    DB_NAME="autoskola_db"
    BACKUP_DIR="/cesta/k/vasim/zaloham"
    DATE=$(date +"%Y-%m-%d_%H-%M-%S")

    mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/$DB_NAME-$DATE.sql.gz
    ```
-   **Automatizace:** Použijte `cron` pro pravidelné spouštění skriptu (např. každou noc).
    -   Otevřete editor cronu: `crontab -e`
    -   Přidejte řádek pro spuštění ve 2:00 ráno:
        ```
        0 2 * * * /cesta/k/vasemu/skriptu/backup.sh
        ```
-   **Uložení záloh:** Zálohy ukládejte na jiné fyzické místo (např. S3 bucket, Backblaze B2, jiný VPS).
