# Master Redesign & Development Tasklist: Autoškola App

## Fáze 1: Strategické a layoutové jádro
*Cíl: Upravit klíčové funkce a sjednotit základní rozvržení hlavní stránky.*

### 1.1 | Klíčové funkční úpravy (Core UX)
- [x] **Deaktivovat AI Lektora v "Ostrém testu":** Zcela skrýt/deaktivovat panel s AI lektorem v režimu "Ostrý test", aby byla zajištěna validita výsledků. Lektor zůstane aktivní pouze v režimu "Procvičování".
- [x] **Zpřesnit potvrzovací dialogy:** Sjednotit chování potvrzovacích dialogů tak, aby se zobrazovaly pouze v "Ostrém testu" (kde hrozí ztráta dat). Dialog se nyní zobrazuje při odchodu na "Domů" a jako vizuálně přívětivější popover u tlačítka "Dokončit test".

### 1.2 | Redesign hlavní stránky (Dashboard)
- [x] **Vytvořit "Hero" sekci a širší layout:**
    - [x] Nastavit hlavnímu obsahovému kontejneru na této stránce `max-width: ~960px` a vycentrovat ho.
    - [x] Do horní části přidat jasnou "Hero" sekci s hlavním nadpisem (`<h1>`, např. "Otestujte si své znalosti") a krátkým podnadpisem (`<p>`, např. "Připravte se na zkoušky v autoškole.").
- [x] **Vizuálně odlišit hlavní akce (CTA):**
    - [x] **"Ostrý test" (Primární CTA):** Přestylizovat na velké tlačítko s plnou modrou barvou, výraznějším textem a přidat ikonu stopek (⏱️).
    - [x] **"Procvičování" (Sekundární CTA):** Přestylizovat na obrysové (outline) tlačítko s méně výrazným textem a přidat ikonu knihy (📚).

### 1.3 | Vylepšení statistik a prázdných stavů
- [x] **Zobrazovat smysluplné prázdné stavy:** Pokud uživatel ještě nemá žádné statistiky (např. 0.0% úspěšnost), místo čísel zobrazit informativní text: "Ještě jste nezkoušeli žádný test. Začněte a sledujte zde svůj pokrok!"
- [x] **Sjednotit formát času:** V detailních statistikách zajistit, aby se čas vždy zobrazoval ve formátu `Xm Ys` (např. `0m 0s`), i když je hodnota nulová.

---

## Fáze 2: Vizuální systém a interaktivita
*Cíl: Sjednotit vzhled napříč aplikací a přidat interaktivní prvky pro lepší uživatelský prožitek.*

### 2.1 | Design System (Barvy, Ikony, Typografie)
- [x] **Definovat a aplikovat konzistentní barevnou paletu:** Zrevidovat použití barev pro úspěch (zelená), chybu (červená) a varování (žlutá) a zajistit jejich konzistentní použití napříč celou aplikací.
- [x] **Sjednotit a doplnit ikony:** Integrovat konzistentní sadu ikon (např. z Lucide Icons nebo FontAwesome) na další místa:
    - [x] Vedle názvů okruhů v "Podrobné analýze".
    - [x] Do tlačítek "Prohlížení otázek" a "Podrobná analýza".
- [x] **Nastavit a dodržovat typografickou hierarchii:** Zkontrolovat velikosti fontů pro nadpisy (h1, h2, h3) a běžný text (p) a zajistit dostatečné řádkování (`line-height: 1.5`) pro lepší čitelnost.

### 2.2 | Mikro-interakce a zpětná vazba
- [x] **Implementovat loading stavy:** Po kliknutí na tlačítka, která spouští akci s načítáním dat (např. "Spustit ostrý test"), zobrazit v tlačítku loading spinner, aby uživatel věděl, že systém pracuje.
- [x] **Vytvořit "Moment of Delight":**
    - [x] Po úspěšném dokončení testu (splnění bodového limitu) zobrazit výraznější gratulaci, např. s animací konfet.
    - [x] V "Přehledu chybovosti" po opravení poslední chyby zobrazit výraznější zprávu: "Skvělá práce! Všechny své chyby jste si již opravili." s velkou zelenou fajfkou.

### 2.3 | Vylepšení stránky s výsledky
- [x] **Přidat přehled výsledků podle okruhů:** Na stránce s výsledky testu zobrazit novou sekci, která vizuálně shrnuje skóre a odpovědi pro každý okruh zvlášť.

---

## Fáze 3: Dlouhodobý rozvoj a motivace
*Cíl: Přidat funkce, které udrží uživatele motivované a zvýší hodnotu aplikace.*

### 3.1 | Gamifikace
- [x] **Systém odznaků:** Navrhnout a implementovat systém odemykatelných odznaků za dosažené milníky (např. "První úspěšný test", "Mistr křižovatek", "100 správných odpovědí v řadě").
- [x] **Vizuální progress na hlavní stránce:** Místo prostého progress baru zvážit implementaci progresního kruhu u statistik, který by vizuálně atraktivněji znázorňoval pokrok.

### 3.2 | Nové funkce pro komfort a učení
- [ ] **Tmavý režim (Dark Mode):** Přidat do hlavičky aplikace přepínač pro snadné přepnutí mezi světlým a tmavým režimem.
- [ ] **Filtrování v přehledu chyb:** Na stránce "Podrobná analýza" do sekce "Přehled chybovosti" přidat filtr/přepínač pro zobrazení: Všechny chyby / Pouze neopravené.
- [x] **Banka otázek s filtry:** Vytvořit novou sekci "Prohlížet otázky", kde si uživatel bude moci zobrazit všechny otázky a filtrovat je podle jednotlivých témat (např. "Dopravní značky", "Pravidla provozu").

### 3.3 | Responzivita a přístupnost (Technical Debt)
- [ ] **Optimalizace pro mobilní zařízení:** Zkontrolovat, zda jsou všechny interaktivní prvky na mobilu dostatečně velké (minimálně 48x48px dotyková plocha) a zda se obsah správně zalamuje.
- [ ] **Přístupnost z klávesnice:** Projít celou aplikaci pomocí klávesy Tab a zajistit, že je focus stav (obrys) vždy viditelný a pořadí prvků je logické.
- [ ] **Kontrola kontrastu:** Použít online nástroj pro kontrolu kontrastu textu vůči pozadí a zajistit splnění standardu WCAG AA (kontrastní poměr ≥ 4.5:1).

---

## Fáze 4: Implementace sekce "Výuka"
*Cíl: Vytvořit komplexní výukovou sekci s teoretickými materiály, obrázky a videi.*

### 4.1 | Fáze 1: Příprava obsahu a právní náležitosti (1–2 týdny)
- [ ] **Právní audit a rozhodnutí o obsahu:**
    - [ ] Potvrdit interně, že veškerý obsah (texty, obrázky, schémata, videa) bude vytvořen originálně.
    - [ ] Prostudovat Zákon č. 361/2000 Sb. a související vyhlášky.
- [ ] **Vytvoření textového obsahu:**
    - [ ] Napsat vlastní texty pro všechny plánované kapitoly.
    - [ ] Připravit popisky k dopravním značkám, křižovatkám a situacím.
- [ ] **Vytvoření grafického obsahu:**
    - [ ] Navrhnout a vytvořit originální schémata křižovatek.
    - [ ] Vytvořit sadu infografik (Postup při nehodě, Povinná výbava, Brzdná dráha).
    - [ ] Shromáždit nebo vytvořit obrázky pro všechny dopravní značky.
- [ ] **Vytvoření video obsahu:**
    - [ ] Definovat scénáře pro krátká výuková videa (30-60s).
    - [ ] Natočit a sestříhat videa s využitím 3D simulace.
    - [ ] Uložit a nahrát videa na hosting.

### 4.2 | Fáze 2: Návrh UI/UX a komponent (1 týden)
- [ ] **Integrace do hlavní navigace:**
    - [ ] Na hlavní obrazovku přidat tlačítko/kartu "Výuka" s ikonou knihy (📖).
- [ ] **Návrh vstupní stránky "Výuka":**
    - [ ] Vytvořit design pro přehled kapitol (mřížka karet).
- [ ] **Návrh detailu kapitoly:**
    - [ ] Navrhnout layout pro zobrazení obsahu (text, obrázky, videa).
    - [ ] Design pro mřížku dopravních značek.
    - [ ] Design pro zobrazení videa/animace křižovatek.
    - [ ] Design pro zobrazení teorie a zásad.
- [ ] **Návrh interaktivního propojení:**
    - [ ] Přidat tlačítko "Procvičit tuto kapitolu".

### 4.3 | Fáze 3: Vývoj a implementace (2–3 týdny)
- [ ] **Backend a datová struktura:**
    - [ ] Vytvořit datové modely pro výukové materiály.
    - [ ] Vytvořit API endpointy pro načítání kapitol a lekcí.
- [ ] **Frontend – Vstupní stránka a navigace:**
    - [ ] Implementovat tlačítko "Výuka" na hlavní obrazovku.
    - [ ] Vytvořit novou routu a stránku `/vyuka`.
    - [ ] Implementovat zobrazení přehledu kapitol.
- [ ] **Frontend – Komponenty pro detail kapitol:**
    - [ ] Vytvořit routu a stránku pro detail kapitoly (`/vyuka/:slug`).
    - [ ] Implementovat komponentu pro textový obsah.
    - [ ] Implementovat komponentu pro galerii značek.
    - [ ] Implementovat komponentu pro zobrazení videa.
    - [ ] Implementovat komponentu pro infografiky.
    - [ ] Naplnit stránky obsahem.
- [ ] **Frontend – Interaktivita:**
    - [ ] Implementovat funkci tlačítka "Procvičit tuto kapitolu".

### 4.4 | Fáze 4: Testování a nasazení (1 týden)
- [ ] **Funkční testování:**
    - [ ] Zkontrolovat zobrazení kapitol a lekcí.
    - [ ] Ověřit načítání médií (videa, obrázky).
    - [ ] Otestovat tlačítko "Procvičit".
    - [ ] Otestovat responzivitu.
- [ ] **Uživatelské testování (doporučené):**
    - [ ] Získat zpětnou vazbu od 2-3 uživatelů.
- [ ] **Nasazení do produkce:**
    - [ ] Nasadit novou verzi aplikace.
    - [ ] Sledovat analytiku a zpětnou vazbu.

---

## Fáze 5: Nasazení a dokumentace
*Cíl: Zdokumentovat a připravit návod pro nasazení aplikace na veřejnou platformu.*

### 5.1 | Vytvořit návod pro nasazení na Render.com
- [x] **Vytvořen aktuální návod pro nasazení:** Původní instrukce byly zastaralé (pro Python/Flask). Byl vytvořen nový, přesný návod pro nasazení kombinované Node.js + Python aplikace.
- [x] **Návod je k dispozici v souboru [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md).**
