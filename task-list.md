## **Detailní TASK-LIST**

>  _✔️ označuje hotové funkce detekované v kódu (_DrivingTestApp.tsx_)_  
>  _Číslování je hierarchické – snadno se z toho dá udělat GitHub Projects._

### 0. Refactor & příprava
- [ ] 0.1 Oddělit **business logiku** do `/src/services` (testBuilder, statsStore, recommender).
- [x] 0.2 Založit **typy** v `/src/dataModels.ts` (Student, TestSession, Question, StudentAnswer). ✔️

### 1. UI/UX revamp
1.1 Globální téma  
  - [ ] 1.1.1 `theme.ts` + `ThemeProvider` (světlý/tmavý režim)  
  - [ ] 1.1.2 Přepsat Tailwind třídy na CSS-proměnné

1.2 Obnovit layout  
  - [ ] 1.2.1 Přesun `TopNav` do samostatné komponenty (`/components/layout/TopNav.tsx`)  
  - [ ] 1.2.2 Sticky footer s progressem a shortcuts

1.3 Dashboard  
  - [ ] 1.3.1 Komponenta `<DashboardCard>`  
  - [ ] 1.3.2 Stránka `/dashboard` s kartami Statistik, Doporučení, Poslední sezení

1.4 Otázka & chat  
  - [ ] 1.4.1 `<Sheet>` (shadcn/ui) pro chat – toggle na mobilu  
  - [ ] 1.4.2 Klávesové zkratky a focus management

### 2. Rozšířená analytika
2.1 Sběr dat  
  - [x] 2.1.1 **`loadStats()` / `saveStats()`** – základ persistence ✔️
  - [x] 2.1.2 **`calculateAndSavePracticeStats()`** – uchovává 1. pokus ✔️  
  - [ ] 2.1.3 Přidat IndexedDB vrstvu (`idb-keyval`) pro detailní logy

2.2 Výpočty  
  - [ ] 2.2.1 Funkce `getAccuracyByGroup()`  
  - [ ] 2.2.2 Funkce `getTrend(field, window)` – klouzavý průměr

2.3 Vizualizace  
  - [ ] 2.3.1 Graf *Score vs. čas* (Recharts LineChart)  
  - [ ] 2.3.2 Graf *Úspěšnost podle okruhu* (Recharts BarChart)

### 3. Personalizované tréninky
3.1 Algoritmus doporučení  
  - [ ] 3.1.1 `selectWeakGroups(threshold, staleness)`  
  - [ ] 3.1.2 `buildPersonalizedTest(size, mixRatio)` – využije `buildExam` logiku

3.2 UI  
  - [ ] 3.2.1 Tlačítko **„Navrhnout trénink“** na dashboardu  
  - [ ] 3.2.2 Modal s parametry (počet otázek, zaměření)

3.3 Export  
  - [ ] 3.3.1 Generovat PDF/CSV pomocí `jsPDF` / `papaparse`

### 4. Kód a funkce JIŽ HOTOVÉ
- [x] **`buildExam()`** – generování ostrého testu
- [x] **`buildPractice()`** – generování procvičování
- [x] **`finishExam()`** – výpočet skóre & uložení statistik
- [x] Časomíra (`useEffect` nad `timeLeft`) ✔️  
- [x] Mockovaný AI chat (`useAi` hook) ✔️  
- [x] Přehled odpovědí po testu ✔️  

### 5. Zprovoznění Online (Deployment)
- [ ] 5.1 Fáze 1: Testování v lokální síti
  - [ ] 5.1.1 Konfigurace Vite serveru pro přístup z lokální sítě (host: '0.0.0.0')
  - [ ] 5.1.2 Testování dostupnosti z jiných zařízení ve stejné Wi-Fi síti
- [ ] 5.2 Fáze 2: Veřejné nasazení
  - [ ] 5.2.1 Výběr hostingové platformy (Vercel, Netlify, GitHub Pages)
  - [ ] 5.2.2 Nastavení CI/CD pipeline pro automatický deployment
- [ ] 5.2.3 Zřízení domény a konfigurace DNS záznamů

### 6. Správa uživatelů (přihlašovací obrazovka)
> **Poznámka:** Implementována přihlašovací obrazovka s whitelistem uživatelů ("Tester", "Tanika") a možností pokračovat jako "Host".

- [x] 6.1 Vytvořit přihlašovací obrazovku jako výchozí fázi aplikace. ✔️
- [x] 6.2 Implementovat logiku pro ověření jména proti whitelistu. ✔️
- [x] 6.3 Ukládat přihlášeného uživatele do `localStorage` pro perzistenci. ✔️
- [x] 6.4 Odstranit pole pro zadání jména z `TopNav` a nahradit ho zobrazením profilu a tlačítkem pro odhlášení. ✔️

---

#### Další tipy
* **Verzování schema statistik** – uložte `statsVersion` do `localStorage`, aby se dala bezpečně migrovat struktura.  
* **Telemetry** – zvážit anonymní sběr agregovaných dat (Opt-in) pro další zlepšování obtížných otázek.  
* **E2E testy** – Cypress scénáře: ostrý test, přerušení timeru, generování doporučení.  

Takto rozdrobený seznam můžete rovnou vložit do Issues nebo Project boardu a začít odškrtávat. Hodně štěstí 🚗🎓!
