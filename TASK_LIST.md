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
- [x] **Tmavý režim (Dark Mode):** Přidat do hlavičky aplikace přepínač pro snadné přepnutí mezi světlým a tmavým režimem.
- [x] **Filtrování v přehledu chyb:** Na stránce "Podrobná analýza" do sekce "Přehled chybovosti" přidat filtr/přepínač pro zobrazení: Všechny chyby / Pouze neopravené.
- [x] **Banka otázek s filtry:** Vytvořit novou sekci "Prohlížet otázky", kde si uživatel bude moci zobrazit všechny otázky a filtrovat je podle jednotlivých témat (např. "Dopravní značky", "Pravidla provozu").
- [x] **Opravit automatický přechod na další otázku:**
    - [x] **Problém:** Funkce automaticky přeskočí na další otázku i tehdy, když se uživatel vrátí na již zodpovězenou otázku, což mu brání v její kontrole.
    - [x] **Řešení:** Přeskok se smí aktivovat pouze bezprostředně po zodpovězení otázky, nikoli při pouhém zobrazení již zodpovězené otázky.
    - [x] **Omezení:** V režimu "Procvičování" by tato funkce měla být zcela deaktivována.

### 3.3 | Responzivita a přístupnost (Technical Debt)
- [x] **Optimalizace pro mobilní zařízení:** Zkontrolovat, zda jsou všechny interaktivní prvky na mobilu dostatečně velké (minimálně 48x48px dotyková plocha) a zda se obsah správně zalamuje.
- [x] **Přístupnost z klávesnice:** Projít celou aplikaci pomocí klávesy Tab a zajistit, že je focus stav (obrys) vždy viditelný a pořadí prvků je logické.
- [x] **Kontrola kontrastu:** Použít online nástroj pro kontrolu kontrastu textu vůči pozadí a zajistit splnění standardu WCAG AA (kontrastní poměr ≥ 4.5:1).
- [x] **Konzistence režimů:** Každý nový prvek nebo funkce musí být vizuálně přizpůsobena pro světlý i tmavý režim.

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

---

## Fáze 6: Refactoring datového úložiště a vylepšení analytiky
*Cíl: Optimalizovat ukládání a zpracování dat pro přihlášené i nepřihlášené uživatele, zlepšit výkon a škálovatelnost.*

### 6.1 | Datové úložiště
- [x] **Oddělit data uživatelů v Redis:**
    - [x] Migrovat ze společného klíče `analysis-data` na per-user namespace (`user:{id}:events`, `user:{id}:summary`, `user:{id}:badges`).
    - [x] Vytvořit migrační skript pro přesun existujících dat.
- [x] **Implementovat lokální úložiště pro hosty (IndexedDB):**
    - [x] Zavést `Dexie.js` pro správu IndexedDB.
    - [x] Vytvořit DB schéma: `events: '++id, ts, qid, correct'`, `summary: '&qid, attempts, corrects'`, `meta: '&key'`.
    - [x] Oddělit data hostů pomocí `sessionId` a implementovat TTL.
        - [x] Implementovat TTL ~24h pro automatické mazání starých dat hostů.
        - [x] Přidat `sessionId` do tabulky `events` a filtrovat data podle něj.

### 6.2 | Zpracování a agregace dat
- [x] **Zavést Web Worker pro analýzu na straně klienta:**
    - [x] Vytvořit `analysis.worker.ts` pro výpočty statistik hosta.
    - [x] Přepočítávat `summary` po každém novém záznamu v IndexedDB, aby se neblokoval hlavní thread.
- [x] **Implementovat server-side agregaci pro přihlášené:**
    - [x] Vytvořit cron job nebo worker, který bude agregovat surová data z `user:{id}:events` do `user:{id}:summary`.
    - [x] Upravit frontend tak, aby načítal pouze předpočítané metriky.

### 6.3 | Dashboard a UI
- [x] **Rozdělit dashboard na "Dnes" vs. "Celkově":**
    - [x] Horní část (kroužky) bude zobrazovat pouze dnešní pokrok (reset v 0:00).
    - [x] Dolní část bude zobrazovat celkové statistiky od začátku.
    - [x] Sjednotit logiku pro přihlášené uživatele i hosty.
- [ ] **Přidat nové vizualizace a personalizované učení:**
- [ ] heatmapa
    - [x] **2. Spaced-repetition balíčky (pro otázky < 80 % úspěšnosti):**
        - [x] **Výběr otázek (Vylepšená logika):** Implementována víceúrovňová logika na serveru (`/api/spaced-repetition-deck`):
            - **Priorita 1:** Otázky, ktere nejsou opraveny v sekci přehled chybovosti.
            - **Priorita 2:** Otázky z nejméně úspěšných okruhů.
            - **Priorita 3:** Náhodné otázky pro doplnění balíčku na 20 položek.
        - [ ] **Plánování opakování (Pragmatický mix):**
            - [ ] Otázky < 80 % začínají v "Boxu 1" (denní opakování).
            - [ ] Po dosažení úspěšnosti ≥ 80 % v posledních 5 pokusech přejde karta do standardního režimu řízeného algoritmem SM-2.
            - [ ] Ukládat potřebná data pro SM-2 (`ease`, `interval`, `next_due`).
        - [x] **UI a Interakce:**
            - [x] Na dashboardu je widget "Balíček na dnes" s počtem karet a tlačítkem pro spuštění.
            - [ ] Po zodpovězení karty umožnit hodnocení (0-5) pro aktualizaci SM-2 intervalu.
            - [x] Na dashboardu je widget "Slabá místa" s top 3 okruhy a tlačítkem pro procvičení.
        - [x] **Funkce více balíčků denně:**
            - [x] **Backend:** API je připraveno přijímat `exclude` parametr pro vyloučení již viděných otázek.
            - [x] **Frontend:** Implementovat UI pro žádost o další balíček a posílání vyloučených ID.
    - [ ] **3. Integrace s odznaky a motivací:**
        - [ ] **Odznak "Zachráněná karta":** Přidělit za zlepšení karty z <80 % na ≥90 % ve 3 po sobě jdoucích opakováních (s úrovněmi Bronz, Stříbro, Zlato, Platina).
        - [ ] **Odznak "Heat-map streak":** Přidělit za udržení úspěšnosti ≥ 80 % po dobu 7, 14, 30 a 100 dní v řadě.
        - [ ] **Odznak "Reviewer":** Přidělit za dokončení 50, 200, 500 a 1000 karet v režimu spaced-repetition.

### 6.4 | Údržba a bezpečnost
- [x] **Nastavit TTL a automatický úklid:**
    - [x] Pro hosty v IndexedDB implementovat `expiresAt` a denní garbage-collector.
    - [x] Pro přihlášené uživatele nastavit archivaci/mazání dat po 2 letech.
- [x] **Zavést Rate Limiting:**
    - [x] Implementovat `Upstash Ratelimit` na `write` endpointy (`/api/events`).

### 6.5 | Správa dat
- [x] **Implementovat export a migraci dat:**
    - [x] Umožnit stažení uživatelských dat ve formátu JSON/CSV.
    - [x] Vytvořit workflow pro přenos dat hosta na přihlášený účet pomocí QR kódu.

### 6.6 | Režim Hosta (Guest Mode) - Testování funkcí
- [ ] **Zpřístupnit pokročilé funkce pro "Host" uživatele v testovacím režimu:**
    - [x] **Opraveno:** Balíček pro opakování ("Balíček na dnes") se pro hosty neaktualizoval dynamicky. Nyní se přepočítává po každé změně statistik.
    - [ ] Všechny funkce dostupné přihlášeným (Spaced Repetition, Heatmapa, Odznaky atd.) budou pro hosty aktivní.
    - [ ] Veškerá data generovaná v tomto režimu se budou ukládat pouze lokálně do prohlížeče (IndexedDB).
    - [ ] Vizuálně odlišit tento režim podtitulem nebo vodoznakem "Test funkcí", aby bylo jasné, že se nejedná o trvalý postup.
    - [ ] Po přihlášení nebo registraci se lokální data nesynchronizují, aby nedošlo ke konfliktu s daty na serveru.

---

## Fáze 7: Rozšířený systém gamifikace (Odznaky)
*Cíl: Implementovat propracovaný systém odznaků pro zvýšení dlouhodobé motivace uživatelů napříč všemi režimy aplikace.*

### 7.1 | Návrh a definice metrik
- [ ] **Definovat kategorie a úrovně odznaků:**
    - [ ] **Procvičování:** Celkový počet otázek, přesnost v okruzích, série správných odpovědí.
    - [ ] **Ostré testy:** Průměrné skóre, počet testů s plným skóre, rychlost vyplnění.
    - [ ] **Teorie:** Počet dokončených kapitol.
    - [ ] **Konzistence:** Počet aktivních dnů v řadě.
    - [ ] **Trend zlepšení:** Zvýšení průměrného skóre.
- [ ] **Zpracovat tabulku metrik a prahových hodnot:**
    ```markdown
    | Kategorie                                       | Co se sleduje                                | Bronz    | Stříbro | Zlato  | Platina | Smysl                                               |
    | ----------------------------------------------- | -------------------------------------------- | -------- | ------- | ------ | ------- | --------------------------------------------------- |
    | **Procvičování** *(Režim „Procvičuj“)*          | Celkový počet zodpovězených cvičných otázek  | 100      | 500     | 1 000  | 5 000   | Odměna za vytrvalost a objem                        |
    |                                                 | Přesnost v konkrétním okruhu                 | ≥ 50 %   | ≥ 70 %  | ≥ 85 % | ≥ 95 %  | Uživatel vidí pokrok v tématu, kde začínal na ≪0 %≫ |
    |                                                 | Streak správných odpovědí                    | 10       | 25      | 50     | 100     | Krátkodobé soustředění                              |
    | **Ostré testy** *(Režim „Plný test 50 otázek“)* | Průměrné skóre z posledních 5 testů          | ≥ 35/50  | ≥ 40    | ≥ 45   | 50/50   | Jasně ukazuje zlepšení v „exam mode“                |
    |                                                 | Počet testů s plným skóre                    | 1        | 5       | 10     | 25      | Extrémní meta pro **hard-core** uživatele           |
    |                                                 | Rychlost vyplnění (čas ≤ xx min)             | 1×       | 5×      | 15×    | 30×     | Odmění, když se přestane příliš váhat               |
    | **Prohlížení / Teorie**                         | Dokončené kapitoly pravidel                  | 3        | 6       | 10     | 14      | Nutí pročíst i pasáže, kde se nedělají testy        |
    | **Konzistence**                                 | Aktivní dny po sobě *(libovolný režim)*      | 3        | 7       | 14     | 30      | Buduje návyk                                        |
    | **Zlepšení Trend**                              | Zvýšení průměrného skóre proti prvnímu týdnu | +5 p. b. | +10     | +15    | +20     | „Vidíš, rosteš!“                                    |
    ```

### 7.2 | Adaptivní trend zlepšení
- [ ] **Implementovat dynamický výchozí bod (`baseline`):**
    - [ ] Určit `baseline` po prvních 3-5 ostrých testech.
    - [ ] Při průměru ≥ 45/50 rovnou přidělit bronzový odznak a nastavit `baseline` na tuto hodnotu.
- [ ] **Implementovat adaptivní prahy:**
    - [ ] Počítat zvýšení procentuálně z "volného stropu" do 100 % (`needed = pct_of(100 − baseline)`).
    - [ ] Bronz: +20 %, Stříbro: +40 %, Zlato: +60 %, Platina: +80 %.
- [ ] **Přepnout na režim "Udržení formy":**
    - [ ] Při dosažení a udržení skóre ≥ 98 % v posledních 10 testech nahradit osu "Zlepšení" osou "Udržení formy" s vlastními prahy (10, 25, 50, 100 testů).

### 7.3 | Technická implementace
- [ ] **Vytvořit Badge Engine řízený událostmi:**
    - [ ] Zpracovávat události: `practice_answered`, `exam_finished`, `chapter_viewed`, `session_start`.
    - [ ] Po každé události přepočítat pouze relevantní metriky.
- [ ] **Rozšířit datový model:**
    - [ ] Pro každý odznak ukládat: `level` (0–4), `progress` (0–1), `unlocked_at`.
    - [ ] Ukládat metriku `trend` s atributy `baseline`, `mode` ('improvement'/'consistency'), `level`, `progress`.
    - [ ] Načítat prahové hodnoty z konfiguračního souboru (JSON).
- [ ] **Implementovat migraci pro stávající uživatele:**
    - [ ] Při prvním spuštění dopočítat historická data a přiřadit již zasloužené odznaky.
    - [ ] Rozdělit stávající odznak "100 % ve všech okruzích" na nové úrovně přesnosti.

### 7.4 | Uživatelské rozhraní (UI)
- [ ] **Vizuální stav odznaků:**
    - [ ] Zamčené odznaky zobrazit šedě s tooltipem vysvětlujícím podmínky odemčení.
    - [ ] Přidat kruhový indikátor progresu (SVG) k ikonám odznaků.
- [ ] **Dashboard Widget:**
    - [ ] Přidat na hlavní stránku widget "Nejbližší odznak" s progress-barem.
- [ ] **Vylepšit UX pro trend:**
    - [ ] Tooltipy musí dynamicky vysvětlovat aktuální cíl (např. "+20 % z chybějících bodů do 100 %").
    - [ ] Zobrazit notifikaci při automatickém přidělení bronzového odznaku za vysoký start.

---

## Fáze 8: Optimalizace pro mobilní zařízení
*Cíl: Vylepšit zobrazení a použitelnost aplikace na zařízeních s úzkou obrazovkou.*

### 8.1 | Responzivní hlavička
- [x] **Skrýt oslovení "Vítejte":** Na úzkých obrazovkách odebrat text "Vítejte," pro úsporu místa v hlavičce.
- [x] **Kompaktní zobrazení uživatele v testu:**
    - [x] V režimu "Ostrý test" na úzkých obrazovkách nahradit e-mail uživatele pouze ikonou postavy.
    - [x] Zajistit, aby ikona zůstala plně funkční (otevírala menu).
- [x] **Podmíněné skrytí tlačítka "Domů":** Pokud ani předchozí úpravy nestačí, skrýt na úzkých obrazovkách v "Ostrém testu" tlačítko "Domů".

### 8.2 | Responzivní navigace v testu
- [x] **Zmenšit navigační tlačítka otázek:** Na úzkých obrazovkách zmenšit velikost a odsazení tlačítek pro výběr otázek (1, 2, 3...), aby se jich vešlo více na jeden řádek a zabírala méně vertikálního prostoru.

---

## Fáze 9: Vylepšení podrobné analýzy
*Cíl: Zlepšit přehlednost a interaktivitu stránky s podrobnou analýzou výsledků.*

### 9.1 | Implementace komponenty "Přehled testů"
- [x] **Vytvořit novou, minimalizovatelnou sekci "Přehled testů":**
    - [x] Na stránce "Podrobná analýza" implementovat komponentu `Collapsible` (např. ze ShadCN/UI), která bude obsahovat tabulku s historií testů.
    - [x] **Struktura tabulky:**
        - [x] **Sloupec "Kdy":** Zobrazí datum a čas zahájení testu (např. "17. července 2025 (12:08)").
        - [x] **Sloupec "Stav":** Zobrazí stav testu (`dokončený`, `nestihnutý`).
        - [x] **Sloupec "Výsledek":** Zobrazí výsledek (`SPLNĚNO` / `NESPLNĚNO`) barevně odlišený.
        - [x] **Sloupec "Úspěšnost":** Zobrazí dosažené body a procentuální úspěšnost (např. "44 bodů = 88% (21 z 25)").
        - [x] **Sloupec "Akce":** Bude obsahovat tlačítko "Vyhodnocení", které po kliknutí přesměruje uživatele na stránku s detailními výsledky konkrétního testu.
    - [x] **Načítání dat:**
        - [x] Implementovat logiku pro načtení historie testů z datového zdroje (IndexedDB pro hosty, API endpoint pro přihlášené).
        - [x] Zobrazit loading stav během načítání a prázdný stav, pokud uživatel ještě žádné testy neabsolvoval.

### 9.2 | Vylepšení interaktivity stránky
- [x] **Aplikovat minimalizaci na "Přehled chybovosti":**
    - [x] "Obalit" stávající sekci "Přehled chybovosti" do stejné `Collapsible` komponenty, aby bylo možné ji také skrýt a ušetřit tak místo na stránce.
    - [x] Zajistit, aby obě sekce byly ve výchozím stavu zabalené.

---

## Fáze 10: Cílová funkčnost (dle V3 databáze)
*Cíl: Implementovat a ověřit všechny klíčové funkce popsané uživatelem po přechodu na novou datovou architekturu.*

### 10.1 | Dashboard
- [x] **Balíček na dnes:**
    - [x] Sestavit balíček 20 otázek dle logiky v `TASK_LIST.md` (Fáze 6.3).
    - [x] Po dokončení umožnit generování dalšího balíčku.
    - [x] Do nového balíčku volitelně zařadit až 5 špatně zodpovězených otázek z předchozího.
    - [x] Občasně zařadit i již opravené otázky z přehledu chybovosti pro ověření znalostí.
- [ ] **Slabá místa:**
    - [ ] Zobrazit 3 nejméně úspěšné okruhy z podrobné analýzy.
    - [ ] Nabídnout možnost procvičení daného okruhu.
    - [ ] Nezobrazovat okruhy s úspěšností ≥ 86 %.
- [x] **Dnešní pokrok:**
    - [x] Zobrazit odděleně počet a úspěšnost pro "Ostré testy" a "Procvičování".
    - [x] "Procvičování" zahrnuje všechny ostatní režimy (prohlížení, balíčky atd.).
- [x] **Celkové statistiky:**
    - [x] Zobrazit odděleně celkový počet a úspěšnost pro "Ostré testy" a "Procvičování".
    - [x] Vizuálně sjednotit s "Dnešním pokrokem".
- [ ] **Moje odznaky:**
    - [ ] Zobrazit získané a nezískané odznaky dle definice v `TASK_LIST.md` (Fáze 7).
- [ ] **Heatmapa:**
    - [ ] Zobrazit aktivitu uživatele v časovém horizontu (styl GitHub).
    - [ ] Odstíny barev odlišit podle počtu aktivit a úspěšnosti v daný den.

### 10.2 | Podrobná analýza
- [ ] **Přehled podle okruhů:**
    - [ ] Zachovat stávající funkci, ale optimalizovat načítání dat z nové databáze.
- [x] **Přehled testů:**
    - [x] Zobrazit historii jednotlivých ostrých testů.
    - [x] U každého testu zobrazit i čas potřebný k jeho dokončení.
    - [x] Zajistit striktní oddělení jednotlivých testovacích sessions, aby nedocházelo k jejich slučování.
    - [x] Přidat možnost rozkliknout detailní vyhodnocení pro každý test.
    - [ ] **(Budoucí):** Implementovat graf závislosti úspěšnosti na počtu provedených testů.
- [x] **Přehled chybovosti:**
    - [x] Zobrazit všechny otázky, na které uživatel kdykoliv odpověděl špatně.
    - [x] Umožnit opravu chybných otázek.
    - [x] Pokud uživatel správně odpoví na chybnou otázku v jakémkoliv režimu, přesunout ji do sekce "Opraveno".
    - [x] Pokud na ni znovu odpoví špatně, zvýšit počítadlo chyb pro danou otázku.

---

## Fáze 11: Údržba a dočasné úpravy
*Cíl: Dokumentovat postupy pro dočasné změny a jejich navrácení do původního stavu.*

### 11.1 | Obnovení Cloudflare Captcha (Turnstile)
- [ ] **Krok 1: Obnovení na straně klienta (`src/components/Turnstile.tsx`)**
    - [ ] **Odstranit dočasný kód:** Smazat nebo zakomentovat `useEffect` blok, který automaticky volá `onSuccess`.
    - [ ] **Obnovit původní kód:** Odkomentovat původní logiku komponenty, která renderuje `<Turnstile>`.
    - **Před:**
      ```typescript
      const TurnstileWidget: FC<TurnstileWidgetProps> = ({ onSuccess, onExpire, onError }) => {
        // Dočasné vypnutí Captcha pro testování
        useEffect(() => {
          onSuccess("captcha-disabled-for-testing");
        }, [onSuccess]);

        return null;

        /*
        const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
        // ... zbytek původního kódu
        */
      };
      ```
    - **Po:**
      ```typescript
      const TurnstileWidget: FC<TurnstileWidgetProps> = ({ onSuccess, onExpire, onError }) => {
        const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

        if (!siteKey) {
          console.error("VITE_TURNSTILE_SITE_KEY is not set in .env file.");
          return <div>Captcha configuration error.</div>;
        }

        return (
          <Turnstile
            siteKey={siteKey}
            onSuccess={onSuccess}
            onExpire={onExpire}
            onError={onError}
            options={{
              theme: 'light',
            }}
          />
        );
      };
      ```

- [ ] **Krok 2: Obnovení na straně serveru (`server.js`)**
    - [ ] **Odstranit podmínku pro testovací token:** Smazat `if` blok, který kontroluje `token === "captcha-disabled-for-testing"`.
    - **Před:**
      ```javascript
      async function verifyCaptcha(token) {
        // Dočasné vypnutí Captcha pro testování
        if (token === "captcha-disabled-for-testing") {
          console.log("✅ CAPTCHA ověření přeskočeno (testovací režim).");
          return true;
        }

        if (!TURNSTILE_SECRET_KEY) {
        // ... zbytek původního kódu
        }
      }
      ```
    - **Po:**
      ```javascript
      async function verifyCaptcha(token) {
        if (!TURNSTILE_SECRET_KEY) {
          console.error("TURNSTILE_SECRET_KEY is not set.");
          return false;
        }
        const response = await fetch(
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          // ... zbytek původního kódu
        );
        const data = await response.json();
        return data.success;
      }
      ```
- [ ] **Krok 3: Restartovat server**
    - [ ] Po uložení změn v `server.js` je nutné restartovat Node.js server, aby se nová logika načetla.
