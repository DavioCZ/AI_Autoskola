# Redesign Tasklist: Autoškola App

Tento dokument slouží jako podrobný seznam úkolů pro redesign uživatelského rozhraní.

---

## 1 | Vizuální hierarchie & rozvržení

### A. Hlavní rozvržení stránky
- **Současný stav:** Obsah je zarovnán doprostřed, což na širokých monitorech vytváří mnoho prázdného místa.
- **Návrh:** Vytvořit obsahový kontejner s maximální šířkou `~960px` a umístit na začátek "hero" sekci (hlavní nadpis, podnadpis, CTA).
- **Důvod:** Zlepší se čitelnost a uživatel bude mít jasný vizuální středobod.

### B. Tlačítka pro výběr režimu (CTA)
- **Současný stav:** "Ostrý test" a "Procvičování" jsou nevýrazné textové odkazy nebo malá tlačítka.
- **Návrh:** Vizuálně odlišit primární a sekundární akci:
    - **Ostrý test (Primární):** Velké tlačítko s plnou barvou a ikonou stopek (`⏱️`).
    - **Procvičování (Sekundární):** Obrysové (outline) tlačítko s ikonou knihy (`📚`).
- **Důvod:** Uživatel na první pohled pozná hlavní akci, což usnadňuje rozhodování.

### C. Zobrazení statistik
- **Současný stav:** Všechny statistiky jsou pohromadě v jedné kartě bez vizuálního rozlišení.
- **Návrh:** Rozdělit statistiky pro lepší přehlednost:
    - **Karta s progresem:** Zobrazit klíčovou metriku (např. celková úspěšnost v %) pomocí progress-baru nebo koláčového grafu.
    - **Detailní statistiky:** Ostatní data umístit do samostatné, méně výrazné karty, která může být ve výchozím stavu sbalená.
- **Důvod:** Rychlý vizuální přehled o pokroku motivuje. Detailní data jsou k dispozici, ale neruší.

### Úkoly:
- [ ] **1.1 Layout:** Vytvořit hlavní obsahový kontejner s `max-width: 960px` a vycentrovat ho.
- [ ] **1.2 Hero sekce:** Přidat nadpis, podnadpis a CTA do horní části stránky.
- [ ] **1.3 Primární CTA:** Přestylizovat "Ostrý test" na výrazné tlačítko.
- [ ] **1.4 Sekundární CTA:** Přestylizovat "Procvičování" na obrysové tlačítko.
- [ ] **1.5 Progress Card:** Vytvořit komponentu pro vizuální zobrazení celkové úspěšnosti.
- [ ] **1.6 Detailní statistiky:** Oddělit detailní metriky do samostatné, méně výrazné karty.

---

## 2 | Barvy, ikonky, typografie

- **Paleta:** Používat 2–3 hlavní barvy + 1 zvýrazňovací (např. zelená = OK, červená = neuspěl, žlutá = varování).
- **Ikonky (Lucide / FontAwesome):**
  - `⏱️` u Ostrého testu (časomíra)
  - `📚` u Procvičování
  - `🏆` u celkové úspěšnosti
- **Font-scale:** Nadpis `32px`, podnadpis `20px`, běžný text `16px`. Dodržujte `line-height: 1.4+` kvůli čitelnosti.

### Úkoly:
- [ ] **2.1 Barevná paleta:** Definovat a aplikovat konzistentní barevné schéma v celém projektu.
- [ ] **2.2 Ikonky:** Integrovat ikony do tlačítek a statistik.
- [ ] **2.3 Typografie:** Nastavit hierarchii fontů a řádkování.

---

## 3 | Mikro-interakce & zpětná vazba

| Situace | Návrh interakce |
| :--- | :--- |
| Hover nad tlačítkem | Jemné vystoupení (`shadow` + `scale(1.02)`). |
| Kliknutí | Okružní animace „loading“ v tlačítku, aby bylo jasné, že se něco děje. |
| Dokončený test | Konfety / badge „Gratulujeme! Splněno na X %“. |

### Úkoly:
- [x] **3.1 Hover efekty:** Implementovat CSS přechody pro tlačítka.
- [x] **3.2 Loading stav:** Přidat loading spinner do tlačítek po kliknutí.
- [x] **3.3 Oznámení o dokončení:** Vytvořit vizuálně atraktivní zprávu po dokončení testu.

---

## 4 | Obsah & copy

- Zkraťte formulaci: místo „Vyberte si režim:“ → „**Jak chcete začít?**“
- Doporučte akci: „**⚡ Vyzkoušejte ostrý test – přesně jako u zkoušky.**“
- **Statistiky:**
  - Nelistujte nulu; když je vše 0, zobrazte raději text „**Ještě jste nezkoušeli žádný test.**“
  - U průměrného času mějte formát `mm:ss` i u nulové hodnoty („**00:00**“).

### Úkoly:
- [ ] **4.1 Aktualizace textů:** Projít a upravit texty dle návrhu.
- [ ] **4.2 Podmíněné zobrazení statistik:** Implementovat logiku pro zobrazení zprávy u prázdných statistik.
- [ ] **4.3 Formátování času:** Zajistit správný formát zobrazení času.

---

## 5 | Nové prvky pro motivaci

- [ ] **Progresní kruh** kolem avatara/ikony uživatele: např. 0 / 50 bodů.
- [ ] **Odemykatelné odznaky** (gamifikace): „Prvních 10 otázek správně na 1. pokus“ apod.
- [ ] **Dynamický banner** s tipem na dnešní dopravní značku nebo video (30 s) ke konkrétnímu pravidlu.
- [ ] **Tmavý režim** přepínač v topbaru – stále populárnější, navíc šetří oči při večerním učení.

---

## 6 | Responzivita & přístupnost

- [ ] **Mobil:** Stackovat karty pod sebe, CTA přes celou šířku, `48px` touch-target.
- [ ] **Klávesnice:** Zkontrolovat `tab-order`, `focus-ring` viditelný.
- [ ] **Kontrast:** Text na pozadí ≥ 4.5:1 (WCAG AA).
- [ ] **ARIA-live** pro flash zprávy („Test uložen“).

---

## 8 | Vylepšení průběhu testu (Zpětná vazba)

Tato sekce vznikla na základě zpětné vazby a zaměřuje se na zpřesnění a zjemnění ukazatele průběhu a stavu otázek během testu.

### A. Logika a vizuál Progress Baru
- **Současný stav:** Ukazatel průběhu sleduje aktuální pozici v testu (`index / total`), což může být matoucí. Je vizuálně příliš výrazný.
- **Návrh:**
    1.  **Logika:** Ukazatel musí měřit reálný postup, tj. počet **zodpovězených** otázek (`answeredCount / totalCount`).
    2.  **Vizuál:** Zjemnit vzhled – výška `4px`, zaoblené rohy, tlumenější barva.
    3.  **Umístění:** Přesunout pod číselnou navigaci otázek.
    4.  **Textový popisek:** Doplnit o textový údaj, např. `7 / 25 hotovo`.

### B. Vizuální stavy navigačních tlačítek otázek
- **Současný stav:** Tlačítka rozlišují pouze aktuální a zodpovězenou otázku.
- **Návrh:** Jasně barevně odlišit tři klíčové stavy, aby uživatel měl okamžitý přehled:
    - **Aktuální otázka:** Výrazný okraj (např. modrý).
    - **Zodpovězená otázka:** Plná barva (např. zelená nebo tmavě šedá), aby bylo jasné, že je "hotová".
    - **Nezodpovězená otázka:** Základní obrysový styl (outline).

### Úkoly:
- [x] **8.1 Logika progress baru:** Upravit výpočet na `zodpovězeno / celkem`.
- [x] **8.2 Vizuál progress baru:** Snížit výšku, změnit barvu, zaoblit a přidat plynulou animaci.
- [x] **8.3 Umístění progress baru:** Přesunout pod mřížku s čísly otázek.
- [x] **8.4 Textový popisek:** Přidat text `X / Y hotovo`.
- [x] **8.5 Stavy tlačítek:** Implementovat nové barevné rozlišení pro aktuální, zodpovězené a nezodpovězené otázky.

---

## 9 | Layout Refactoring & Responsivita

Tato sekce se zaměřuje na kompletní přestavbu layoutu pro lepší využití prostoru na větších obrazovkách (tablety, notebooky, desktopy) a zajištění perfektní responzivity.

### A. Hlavní kontejner a dvou-sloupcový grid
- **Současný stav:** Úzký, vycentrovaný sloupec, který na širokých monitorech nechává příliš mnoho prázdného místa.
- **Návrh:**
    1.  **Rozšířit kontejner:** Zvětšit maximální šířku (`max-w-screen-lg` nebo `max-w-screen-xl`), aby obsah lépe dýchal.
    2.  **Dvou-sloupcový layout:** Na obrazovkách od `lg` (1024px) nahoru rozdělit obsah na dva sloupce:
        - **Levý sloupec (flexibilní):** Hlavní obsah – karta s otázkou.
        - **Pravý sloupec (fixní šířka):** Postranní panel s AI lektorem (`~320px`).
    3.  **Mobile-first:** Na menších obrazovkách se sloupce automaticky skládají pod sebe.

### B. Karta s otázkou a AI panel
- **Návrh:**
    1.  **Karta s otázkou:** Musí zabírat 100 % šířky svého sloupce. Zvětšit vnitřní padding a upravit velikost fontů pro lepší čitelnost.
    2.  **AI Panel:** Na velkých obrazovkách bude `sticky`, aby zůstal viditelný při scrollování otázkou.

### Úkoly:
- [ ] **9.1 Hlavní kontejner:** Aplikovat `max-w-screen-lg` a responzivní `padding` na hlavní obalující element.
- [ ] **9.2 Grid Layout:** Implementovat `grid lg:grid-cols-[1fr_320px]` pro rozdělení obsahu ve fázi testu.
- [ ] **9.3 Karta s otázkou:** Upravit styly karty (`w-full`, `p-6`, `text-lg`) podle nového layoutu.
- [ ] **9.4 AI Panel:** Nastavit panelu `lg:sticky` pozici.
- [ ] **9.5 Zarovnání Progress Baru:** Zajistit, aby se progress bar a číselník zarovnávaly s novým, širším kontejnerem.

---

## 7 | Další rozvoj (střednědobě)

| Funkce | Přínos |
| :--- | :--- |
| Pokračovat tam, kde jsem skončil | Jediným klikem se vrátím do rozdělaného testu. |
| Přehled otázek (bank) s filtrem podle tématu | Cílené učení slabých oblastí. |
| Tematické „mini-testy” (5–7 otázek) | Rychlé opakování může zvednout retenci. |
| Grafy výkonu (line chart „body vs. čas“) | Vizualizace pokroku = vyšší motivace. |
| Sdílení výsledků (obrázek nebo odkaz) | Virální prvek, marketing „zadarmo“. |

---

## Shrnutí klíčových změn

- **Vzbuďte pozornost:** Větší a barevně odlišené hlavní tlačítko + jasný podtitulek.
- **Usnadněte rozhodnutí:** Primární/sekundární CTA, méně textu, více ikon.
- **Okamžitá motivace:** Progresní vizualizace, gamifikace, gratulace.
- **Plynulý zážitek:** Hover/active stavy, loading indikátory, responzivita.
- **Čitelnost & kontrast:** Dostatečné mezery, font-hierarchie, WCAG.
