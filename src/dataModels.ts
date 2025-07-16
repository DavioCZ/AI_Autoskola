/**
 * 1. Data o Studentovi (Uživatelský profil)
 * Tato data pomáhají kontextualizovat výkon a personalizovat přístup.
 */
export interface Student {
  id: string; // Unikátní identifikátor každého studenta.
  drivingLicenseGroup: 'A' | 'B' | 'C' | 'D' | 'B+E' | 'C+E' | 'D+E'; // Cílová skupina řidičského oprávnění.
  drivingSchoolId?: string; // Přiřazená autoškola
  instructorId?: string; // Přiřazený instruktor
  registrationDate: Date; // Datum registrace pro sledování délky přípravy.
  // Volitelné a anonymizované demografické údaje
  age?: number;
  gender?: 'male' | 'female' | 'other';
}

/**
 * 2. Data o Testovací Relaci (Session)
 * Každé spuštění testu je jedna "relace".
 */
export interface TestSession {
  id: string; // Unikátní identifikátor pro každou testovací session.
  studentId: string; // Propojení relace s konkrétním studentem.
  startTime: Date; // Kdy student začal test.
  endTime?: Date; // Kdy student test dokončil nebo opustil.
  totalTimeSeconds?: number; // Doba strávená v testu v sekundách.
  testType: 'full_exam' | 'topic_practice' | 'mistake_practice' | 'quick_test'; // Typ testu.
  result: 'passed' | 'failed'; // Výsledek relace.
  totalPoints: number; // Celkový počet získaných bodů.
  scorePercentage: number; // Procentuální úspěšnost.
  status: 'completed' | 'interrupted' | 'timed_out'; // Stav relace.
  device: 'desktop' | 'mobile_app_ios' | 'mobile_app_android' | 'mobile_web'; // Použité zařízení.
}

/**
 * 3. Data o Otázce (Statická data)
 * Tato data definují samotnou otázku a jsou většinou neměnná.
 */
export interface Question {
  id: string; // Unikátní identifikátor otázky (ideálně oficiální ID od ministerstva).
  text: string; // Plné znění.
  mediaId?: string; // Odkaz na připojený obrázek/video.
  topic: 'rules' | 'signs' | 'situations' | 'safety' | 'medical' | 'vehicle_conditions' | 'regulations'; // Okruh / Kategorie.
  subtopic?: string; // Jemnější dělení (např. u značek: Výstražné, Příkazové).
  points: 1 | 2 | 4; // Počet bodů za otázku.
  correctAnswerIds: string[]; // Označení, která možnost(i) je správná.
  // Vypočítaná statistická obtížnost napříč všemi studenty.
  statisticalDifficulty?: number; // např. 0.75 (75% úspěšnost)
}

/**
 * 4. Data o Odpovědi Studenta (Interakce)
 * Zaznamenává každou jednotlivou interakci studenta s otázkou.
 */
export interface StudentAnswer {
  id: string; // Unikátní záznam pro každou odpověď.
  sessionId: string; // Vazba na ID Relace.
  studentId: string; // Vazba na ID Studenta.
  questionId: string; // Vazba na ID Otázky.
  selectedAnswerIds: string[]; // Co konkrétně student zakliknul.
  isCorrect: boolean; // Výsledek odpovědi: Správně / Špatně.
  timeToAnswerSeconds: number; // Klíčový údaj: čas na odpověď v sekundách.
  questionOrderInTest: number; // Pořadí otázky v testu (analyzovat vliv únavy).
  markedForLaterReview: boolean; // Signál studentovy nejistoty.
}
