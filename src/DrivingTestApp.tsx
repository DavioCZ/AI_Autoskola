import React, { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Progress } from "../components/ui/progress";
import { Textarea } from "../components/ui/textarea";
import { Send, BarChart2, RefreshCcw, CheckCircle2, XCircle } from "lucide-react";
import clsx from "clsx";
import { useAi, ChatMessage } from "./hooks/useAi"; // Přidán import

/* ----------------------- Data typy a konstanty ---------------------- */
export type Question = {
  id: string;
  otazka: string;
  obrazek?: string;
  moznosti: string[];
  spravna: number;
  points: number;
  groupId: number;
};

// Nový typ pro ukládání detailů o odpovědi v režimu procvičování
export type PracticeAttempt = {
  firstAttemptIndex: number;      // Index odpovědi při prvním pokusu
  isFirstAttemptCorrect: boolean; // Zda byl první pokus správný
  finalAttemptIndex: number;      // Index odpovědi při finálním (posledním) pokusu
  answered: true;                 // Indikátor, že na otázku bylo odpovězeno
};

// Typ pro stav responses - může obsahovat buď číslo (pro ostrý test) nebo PracticeAttempt (pro procvičování)
// Pro jednoduchost zatím ponecháme Record<string, number> a logiku upravíme tak,
// aby v procvičování responses[q.id] ukládalo PracticeAttempt, ale budeme muset být opatrní s typy.
// Lepší by bylo mít dva různé stavy nebo sjednocený typ, ale pro začátek zkusíme modifikovat stávající.
// Alternativně, můžeme responses vždy ukládat jako komplexní objekt, i pro examMode, jen některé fieldy nebudou relevantní.

// Prozatím ponecháme responses: Record<string, number> a budeme ukládat jen první pokus
// a správnost prvního pokusu si budeme pamatovat jinak, nebo změníme strukturu responses později,
// pokud se ukáže jako nutné.
// Pro zjednodušení první iterace:
// Vytvoříme nový stav pro sledování prvních pokusů v procvičování.
// responses: Record<string, number> bude nadále ukládat FINÁLNÍ odpověď studenta (pro zobrazení v UI)

const GROUPS = [
  { id: 1, file: "/okruh1.json", name: "Pravidla provozu", quota: 10, points: 2 },
  { id: 2, file: "/okruh2.json", name: "Dopravní značky", quota: 3, points: 1 },
  { id: 3, file: "/okruh3.json", name: "Zásady bezpečné jízdy", quota: 4, points: 2 },
  { id: 4, file: "/okruh4.json", name: "Dopravní situace", quota: 3, points: 4 },
  { id: 5, file: "/okruh5.json", name: "Předpisy o vozidlech", quota: 2, points: 1 },
  { id: 6, file: "/okruh6.json", name: "Předpisy související", quota: 2, points: 2 },
  { id: 7, file: "/okruh7.json", name: "Zdravotnická příprava", quota: 1, points: 1 },
] as const;

const OSTRY_TIME = 30 * 60; // 30 minut v sekundách

/* --------------------------- Statistiky ---------------------------- */
// Ukládáme do localStorage (klíč `autoskolastats`)
// Rozlišujeme ostré testy vs. procvičování
export type Stats = {
  examTaken: number;
  examPassed: number;
  examAvgScore: number;
  examAvgTime: number; // v sekundách
  practiceAnswered: number;
  practiceCorrect: number;
};
const DEFAULT_STATS: Stats = {
  examTaken: 0,
  examPassed: 0,
  examAvgScore: 0,
  examAvgTime: 0,
  practiceAnswered: 0,
  practiceCorrect: 0,
};
function loadStats(): Stats {
  try {
    const storedStats = localStorage.getItem("autoskolastats");
    return storedStats ? JSON.parse(storedStats) : DEFAULT_STATS;
  } catch {
    return DEFAULT_STATS;
  }
}
function saveStats(s: Stats) {
  localStorage.setItem("autoskolastats", JSON.stringify(s));
}

/* ---------------------------- TopNav ------------------------------- */
function TopNav({
  label,
  timeLeft,
  showStats,
  onResetStats,
  onHome,
}: {
  label: string;
  timeLeft?: number | null;
  showStats: boolean;
  onResetStats: () => void;
  onHome: () => void;
}) {
  const mm = timeLeft !== null && timeLeft !== undefined ? Math.floor(timeLeft / 60) : null;
  const ss = timeLeft !== null && timeLeft !== undefined ? timeLeft % 60 : null;
  const timeFmt = (mm !== null && ss !== null) ? `${mm}:${ss.toString().padStart(2, "0")}` : "";
  return (
    <header className="w-full bg-white border-b shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 py-2">
        <h1 className="font-semibold text-lg select-none">Autoškola B</h1>
        <div className="flex-1 text-center text-sm font-medium text-gray-600 select-none">
          {label}{" "}
          {timeLeft !== null && timeLeft !== undefined && (
            <span
              className={clsx("ml-2 font-mono", {
                "text-red-600": timeLeft < 60,
              })}
            >
              {timeFmt}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showStats && (
            <Button variant="ghost" size="icon" title="Vymazat statistiky" onClick={onResetStats}>
              <RefreshCcw size={18} />
            </Button>
          )}
          <Button variant="ghost" onClick={onHome} className="text-sm">
            Domů
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ----------------------------- App -------------------------------- */
export default function DrivingTestApp() {
  const [phase, setPhase] = useState<"intro" | "setup" | "test" | "done">("intro");
  const [examMode, setExamMode] = useState(true);
  const [selectedGroups, setSelected] = useState<number[]>(GROUPS.map((g) => g.id));
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  // responses bude nadále ukládat FINÁLNÍ vybraný index odpovědi (pro UI a pro AI kontext)
  const [responses, setResponses] = useState<Record<string, number>>({}); 
  // Nový stav pro ukládání informací o prvním pokusu v režimu procvičování
  // Klíč je q.id, hodnota je objekt { firstAttemptIndex: number, isFirstAttemptCorrect: boolean }
  const [practiceFirstAttempts, setPracticeFirstAttempts] = useState<Record<string, { firstAttemptIndex: number; isFirstAttemptCorrect: boolean }>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats>(loadStats()); // Manage stats in state

  // Použijeme useAi hook pro správu chatu
  const { ask, loading: aiLoading, answer: aiAnswer, messages, setMessages } = useAi(); // přejmenováno loading a answer, aby se nepletlo
  const [draft, setDraft] = useState("");
  const msgEndRef = useRef<HTMLDivElement | null>(null);

  /* --------------------- načítání otázek -------------------------- */
  async function fetchGroup(gid: number): Promise<Question[]> {
    const g = GROUPS.find((gr) => gr.id === gid)!;
    const res = await fetch(g.file);
    const data = res.ok ? await res.json() : [];
    return (data as Omit<Question, 'points' | 'groupId'>[]).map((q) => ({ ...q, points: g.points, groupId: gid, id: String(q.id) }));
  }
  async function buildExam(): Promise<Question[]> {
    const arr: Question[] = [];
    for (const g of GROUPS) {
      const pool = await fetchGroup(g.id);
      for (let i = 0; i < g.quota && pool.length; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        arr.push(pool.splice(idx, 1)[0]);
      }
    }
    return arr.sort(() => Math.random() - 0.5);
  }
  async function buildPractice(): Promise<Question[]> {
    const pools = await Promise.all(selectedGroups.map(fetchGroup));
    return pools.flat().sort(() => Math.random() - 0.5);
  }

  const startTest = async () => {
    const qs = examMode ? await buildExam() : await buildPractice();
    setQuestions(qs);
    setCurrent(0);
    setResponses({});
    if (!examMode) { // Resetovat i první pokusy pro nový režim procvičování
      setPracticeFirstAttempts({});
    }
    setPhase("test");
    setTimeLeft(examMode ? OSTRY_TIME : null);
  };

  /* ------------------------- Časomíra --------------------------- */
  useEffect(() => {
    if (phase !== 'test' || timeLeft === null) return;
    if (timeLeft <= 0) {
      finishExam();
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => (t !== null ? t - 1 : null)), 1000);
    return () => clearInterval(id);
  }, [timeLeft, phase]);

  /* ---------------------- ukončení testu ------------------------- */

  // Funkce pro výpočet a uložení statistik z procvičování
  function calculateAndSavePracticeStats() {
    const currentStats = loadStats();
    const answeredQuestionIds = Object.keys(practiceFirstAttempts);
    const answeredCountInSession = answeredQuestionIds.length;
    
    if (answeredCountInSession === 0) {
      // Pokud v tomto kole nebyly zodpovězeny žádné otázky, nic neukládáme.
      // Nebo bychom mohli zvážit, zda chceme resetovat practiceFirstAttempts zde,
      // ale to se již děje v startTest.
      return; 
    }

    let correctCountInSession = 0;
    answeredQuestionIds.forEach(questionId => {
      if (practiceFirstAttempts[questionId]?.isFirstAttemptCorrect) {
        correctCountInSession++;
      }
    });

    const newStats: Stats = {
      ...currentStats,
      practiceAnswered: currentStats.practiceAnswered + answeredCountInSession,
      practiceCorrect: currentStats.practiceCorrect + correctCountInSession,
    };
    saveStats(newStats);
    setStats(newStats); // Update state to reflect changes in UI
    // Po uložení statistik z procvičování je dobré vyčistit practiceFirstAttempts pro další kolo,
    // i když se to děje i v startTest. Pro jistotu, pokud by flow bylo jiné.
    // setPracticeFirstAttempts({}); // Toto zvážíme, zda je nutné zde, pokud se vždy volá startTest pro nové kolo.
                                  // Prozatím necháme reset v startTest.
  }

  function finishExam() {
    setPhase("done"); // Vždy přejdeme na obrazovku výsledků
    
    if (examMode) {
      const currentStats = loadStats();
      const score = questions.reduce((acc, qq) => (responses[qq.id] === qq.spravna ? acc + qq.points : acc), 0);
      const passed = score >= 43;
      const newTaken = currentStats.examTaken + 1;
      const newAvgScore = parseFloat(((currentStats.examAvgScore * currentStats.examTaken + score) / newTaken).toFixed(1));
      const spent = OSTRY_TIME - (timeLeft ?? 0);
      const newAvgTime = Math.round((currentStats.examAvgTime * currentStats.examTaken + spent) / newTaken);
      const newStats: Stats = {
        ...currentStats,
        examTaken: newTaken,
        examPassed: currentStats.examPassed + (passed ? 1 : 0),
        examAvgScore: newAvgScore,
        examAvgTime: newAvgTime,
      };
      saveStats(newStats);
      setStats(newStats);
    } else {
      // Pro režim procvičování zavoláme novou funkci pro uložení statistik
      calculateAndSavePracticeStats();
    }
  }

  function handleResetStats() {
    saveStats(DEFAULT_STATS);
    setStats(DEFAULT_STATS); // Update state
    alert("Statistiky vymazány");
  }

  /* ----------------------------- Chat ---------------------------- */
  const sendMsg = async () => {
    if (!draft.trim()) return;
    const currentQ = questions[current];
    const userMessage = draft.trim();
    setDraft(""); // Vyčistíme draft hned

    // Detekce, zda student explicitně žádá o odpověď
    const lowerUserMessage = userMessage.toLowerCase();
    const explicitlyAskedForAnswer = 
      lowerUserMessage.includes("řekni mi správnou odpověď") ||
      lowerUserMessage.includes("řekni správnou odpověď") ||
      lowerUserMessage.includes("jaká je správná odpověď") ||
      lowerUserMessage.includes("co je správně") ||
      lowerUserMessage.includes("prozraď správnou odpověď") ||
      lowerUserMessage.includes("chci vědět odpověď");

    const studentSelectedIndex = responses[currentQ.id]; // Může být undefined, pokud nic není vybráno

    // Voláme funkci 'ask' z hooku useAi s novým formátem kontextu
    await ask(userMessage, {
      question: currentQ, // Celý objekt aktuální otázky (obsahuje text, možnosti atd.)
      studentSelected: typeof studentSelectedIndex === 'number' ? studentSelectedIndex : null, // index nebo null
      explicitlyAsked: explicitlyAskedForAnswer 
    });
  };

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const q = questions[current];

  useEffect(() => {
    // Tento hook se stará o inicializaci/resetování zpráv chatu podle aktuální otázky a fáze testu.
    if (q && phase === "test") {
      const introText = `Otázka: ${q.otazka}\nMožnosti:\n${q.moznosti.join("\n")}`;
      // Inicializujeme messages pomocí setMessages z hooku useAi
      // Role je "user", aby první zpráva pro AI měla správnou roli.
      // Typ pro setMessages v hooku je React.Dispatch<React.SetStateAction<ChatMessage[]>>
      // a ChatMessage má role "user" | "assistant"
      setMessages([{ role: "user", text: introText }]);
      setDraft("");
    } else if (phase !== "test" && phase !== "done") {
      setMessages([{ role: "assistant", text: "Ahoj! Zeptej se na cokoliv k testu." }]);
    }
  }, [q, phase, setMessages, setDraft]); // setMessages a setDraft jsou nyní z hooku

  if (phase === "intro") {
    return (
      <>
        <TopNav label="Vítejte!" showStats={true} onResetStats={handleResetStats} onHome={() => setPhase("intro")} />
        <div className="max-w-xl mx-auto p-4 md:p-8 text-center">
          <h2 className="text-2xl font-semibold mb-6">Vítejte v Autoškole B</h2>
          <p className="mb-8">Vyberte si režim:</p>
          <div className="space-y-4">
            <Button size="lg" className="w-full" onClick={() => { setExamMode(true); setPhase("setup"); }}>
              Ostrý test (Časomíra, 25 otázek, 50 bodů)
            </Button>
            <Button size="lg" variant="outline" className="w-full" onClick={() => { setExamMode(false); setPhase("setup"); }}>
              Procvičování (Vlastní výběr okruhů)
            </Button>
          </div>
          <Card className="mt-10 text-left">
            <CardHeader><h3 className="font-semibold">Statistiky</h3></CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>Absolvované ostré testy: {stats.examTaken}</p>
              <p>Úspěšně složené: {stats.examPassed}</p>
              <p>Průměrné skóre: {stats.examAvgScore > 0 ? stats.examAvgScore.toFixed(1) : "0.0"} / 50</p>
              <p>Průměrný čas: {stats.examAvgTime > 0 ? `${Math.floor(stats.examAvgTime / 60)}m ${stats.examAvgTime % 60}s` : "0m 0s"}</p>
              <hr className="my-2"/>
              <p>Zodpovězeno v procvičování: {stats.practiceAnswered}</p>
              <p>Z toho správně: {stats.practiceCorrect} ({stats.practiceAnswered > 0 ? ((stats.practiceCorrect/stats.practiceAnswered)*100).toFixed(1) : "0.0"}%)</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (phase === "setup") {
    return (
      <>
        <TopNav label={examMode ? "Příprava na ostrý test" : "Nastavení procvičování"} showStats={false} onResetStats={handleResetStats} onHome={() => setPhase("intro")} />
        <div className="max-w-xl mx-auto p-4 md:p-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">{examMode ? "Ostrý test" : "Procvičování"}</h2>
          {!examMode && (
            <div className="mb-6 space-y-3">
              <h3 className="font-medium mb-2">Vyberte okruhy otázek:</h3>
              {GROUPS.map((g) => (
                <div key={g.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50">
                  <Checkbox
                    id={`group-${g.id}`}
                    checked={selectedGroups.includes(g.id)}
                    onCheckedChange={(checked) => {
                      setSelected(prev => checked ? [...prev, g.id] : prev.filter(id => id !== g.id));
                    }}
                  />
                  <label htmlFor={`group-${g.id}`} className="text-sm cursor-pointer flex-1">
                    {g.name} (max {g.quota} otázek, {g.points}b za správnou)
                  </label>
                </div>
              ))}
            </div>
          )}
          {examMode && (
            <p className="text-center mb-6">Test obsahuje 25 náhodně vybraných otázek ze všech okruhů. Časový limit je 30 minut. Pro úspěšné složení je potřeba získat alespoň 43 bodů z 50.</p>
          )}
          <Button size="lg" className="w-full mt-6" onClick={startTest} disabled={!examMode && selectedGroups.length === 0}>
            {examMode ? "Spustit ostrý test" : "Spustit procvičování"}
          </Button>
        </div>
      </>
    );
  }

  if (phase === "test" && q) {
    const progress = questions.length > 0 ? ((current +1) / questions.length) * 100 : 0;
    return (
      <div className="flex flex-col h-screen">
        <TopNav
          label={examMode ? "Ostrý test" : "Procvičování"}
          timeLeft={timeLeft}
          showStats={false}
          onResetStats={handleResetStats}
          onHome={() => { if (confirm("Opravdu chcete opustit test? Průběh nebude uložen.")) setPhase("intro");}}
        />
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 p-2 md:p-4 lg:p-6 overflow-y-auto">
            <Progress value={progress} className="mb-4 h-2" />
            {examMode && (
              <div className="mb-4 flex flex-wrap gap-1 justify-center">
                {questions.map((questionItem, idx) => {
                  const isAnswered = responses.hasOwnProperty(questionItem.id);
                  const isCurrent = idx === current;
                  
                  // Determine correctness if answered (for potential future use, or if logic changes)
                  // const isCorrect = isAnswered && responses[questionItem.id] === questionItem.spravna;

                  let dynamicClasses = {};

                  if (isAnswered && !isCurrent) {
                    // If the question is answered and it's not the current one, mark it yellow.
                    // This is the primary state for answered questions during the test.
                    dynamicClasses = { "bg-yellow-400 hover:bg-yellow-500 text-black": true };
                  }
                  
                  if (isCurrent) {
                    // If it's the current question, add a blue border.
                    // This can be combined with other styles (e.g., an answered current question).
                    dynamicClasses = { ...dynamicClasses, "border-blue-500": true };
                  }
                  
                  // Red/Green logic for "done" phase is handled in the results display,
                  // not on these navigation buttons during the "test" phase.
                  // If immediate red/green feedback on nav buttons during "test" is needed,
                  // `isCorrect` would be used here.

                  return (
                    <Button
                      key={`nav-${idx}`}
                      variant={isCurrent ? "default" : isAnswered ? "secondary" : "outline"}
                      size="sm"
                      className={clsx("h-7 w-7 p-0 text-xs md:h-8 md:w-8 md:text-sm", dynamicClasses)}
                      onClick={() => setCurrent(idx)}
                    >
                      {idx + 1}
                    </Button>
                  );
                })}
              </div>
            )}

            <Card className="shadow-lg">
              <CardHeader>
                <h3 className="font-semibold text-base md:text-lg">Otázka {current + 1} / {questions.length} ({q.points} {q.points === 1 ? "bod" : q.points <=4 ? "body" : "bodů"})</h3>
                <p className="mt-1 text-sm md:text-base">{q.otazka}</p>
              </CardHeader>
              <CardContent>
                {q.obrazek && <img src={q.obrazek} alt="Dopravní situace" className="my-3 rounded max-h-60 md:max-h-80 mx-auto shadow-md" />}
                <RadioGroup
                  value={responses[q.id]?.toString()}
                  onValueChange={(valStr) => {
                    const val = parseInt(valStr);
                    // Vždy aktualizujeme 'responses' pro UI (zobrazení vybrané odpovědi)
                    setResponses(prev => ({ ...prev, [q.id]: val }));

                    // Pokud jsme v režimu procvičování a pro tuto otázku ještě nebyl zaznamenán první pokus
                    if (!examMode && !practiceFirstAttempts[q.id]) {
                      setPracticeFirstAttempts(prev => ({
                        ...prev,
                        [q.id]: {
                          firstAttemptIndex: val,
                          isFirstAttemptCorrect: val === q.spravna,
                        }
                      }));
                    }
                  }}
                  className="mt-4 space-y-2"
                >
                  {q.moznosti.map((opt, idx) => {
                    const isSelected = responses[q.id] === idx;
                    const isCorrect = idx === q.spravna;
                    const anAnswerIsSelectedForThisQuestion = responses[q.id] !== undefined;

                    let itemSpecificClasses = "";
                    if (!examMode && anAnswerIsSelectedForThisQuestion) {
                      if (isCorrect) { // This option is the correct one
                        itemSpecificClasses = "bg-green-50 border-green-400 text-green-700";
                      }
                      if (isSelected && !isCorrect) { // This option was selected by the user AND it's wrong
                        itemSpecificClasses = "bg-red-50 border-red-400 text-red-700";
                      }
                    }

                    return (
                      <div
                        key={idx}
                        className={clsx(
                          "flex items-center space-x-3 p-3 border rounded-md transition-colors cursor-pointer",
                          itemSpecificClasses,
                          !itemSpecificClasses && "hover:bg-gray-50" // Only apply hover if not already colored
                        )}
                      >
                        <RadioGroupItem value={idx.toString()} id={`opt-${q.id}-${idx}`} />
                        <label htmlFor={`opt-${q.id}-${idx}`} className="flex-1 text-sm md:text-base cursor-pointer flex items-center justify-between w-full">
                          <span>{opt}</span>
                          {!examMode && anAnswerIsSelectedForThisQuestion && isSelected && (
                            isCorrect ? (
                              <span className="ml-2 flex items-center text-green-600 font-medium">
                                <CheckCircle2 size={18} className="mr-1" /> Správně
                              </span>
                            ) : (
                              <span className="ml-2 flex items-center text-red-600 font-medium">
                                <XCircle size={18} className="mr-1" /> Nesprávně
                              </span>
                            )
                          )}
                        </label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </CardContent>
            </Card>
            <div className="mt-6 flex justify-between items-center">
              <Button variant="outline" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>
                Předchozí
              </Button>
              {!examMode && ( // Tlačítko Ukončit pouze v režimu procvičování
                <Button variant="outline" onClick={() => {
                  // Odebráno confirm, statistiky se uloží vždy
                  calculateAndSavePracticeStats(); // Uložíme statistiky
                  setPhase("intro"); // Přejdeme do hlavního menu
                }}>
                  Ukončit
                </Button>
              )}
              <span className="text-sm text-gray-600">{current + 1} / {questions.length}</span>
              {current < questions.length - 1 ? (
                <Button onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}>
                  Další
                </Button>
              ) : (
                <Button 
                  onClick={finishExam} 
                  className={clsx(
                    "text-white",
                    examMode ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {examMode ? "Dokončit test" : "Vyhodnotit procvičování"}
                </Button>
              )}
            </div>
          </main>

          <aside className="w-full md:w-80 lg:w-96 bg-gray-50 border-l flex flex-col p-1.5 md:p-2 max-h-screen">
            <div className="p-2 md:p-3 border-b">
              <h3 className="font-semibold text-sm md:text-base">Zeptat se AI lektora</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-2 text-xs md:text-sm">
              {messages.map((msg: ChatMessage, i: number) => ( // Otypování msg a i
                // Používáme msg.role z ChatMessage typu
                <div key={i} className={clsx("p-2.5 rounded-lg shadow-sm max-w-[90%]", msg.role === "assistant" ? "bg-blue-100 self-start" : "bg-green-100 self-end ml-auto")}>
                  {msg.text.split('\n').map((line: string, j: number) => { // Otypování line a j
                    const isImageUrl = /\.(jpeg|jpg|gif|png)$/i.test(line.trim());
                    // Používáme msg.role
                    if (isImageUrl && msg.role === "assistant") { 
                      return <img key={j} src={line.trim()} alt="Odpověď AI" className="my-2 rounded max-h-48 md:max-h-60 mx-auto shadow"/>;
                    }
                    return <p key={j} className="break-words">{line}</p>;
                  })}
                </div>
              ))}
              {aiLoading && <div className="p-2.5 rounded-lg shadow-sm max-w-[90%] bg-blue-100 self-start opacity-70">Přemýšlím...</div>}
              <div ref={msgEndRef} />
            </div>
            <div className="p-2 border-t">
              <div className="flex items-center gap-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Napište dotaz..."
                  rows={2}
                  className="flex-1 text-xs md:text-sm resize-none"
                  onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }}}
                  disabled={aiLoading} // Zakázat vstup během načítání
                />
                <Button onClick={sendMsg} size="icon" disabled={!draft.trim() || aiLoading}>
                  <Send size={16} />
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const score = examMode ? questions.reduce((acc, qq) => (responses[qq.id] === qq.spravna ? acc + qq.points : acc), 0) : 0;
    const totalPoints = examMode ? questions.reduce((acc, qq) => acc + qq.points, 0) : 0;
    const passed = examMode && score >= 43;

    // Pro zobrazení výsledků aktuálního kola procvičování použijeme practiceFirstAttempts
    let answeredInCurrentPracticeSession = 0;
    let correctInCurrentPracticeSession = 0;
    if (!examMode) {
      const attemptedQuestionIdsInSession = Object.keys(practiceFirstAttempts);
      answeredInCurrentPracticeSession = attemptedQuestionIdsInSession.length;
      attemptedQuestionIdsInSession.forEach(id => {
        if (practiceFirstAttempts[id]?.isFirstAttemptCorrect) {
          correctInCurrentPracticeSession++;
        }
      });
    }

    return (
      <>
        <TopNav label="Výsledky testu" showStats={true} onResetStats={handleResetStats} onHome={() => setPhase("intro")} />
        <div className="max-w-xl mx-auto p-4 md:p-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">
            {examMode ? (passed ? "Gratulujeme, uspěli jste!" : "Bohužel, neuspěli jste.") : "Procvičování dokončeno"}
          </h2>
          {examMode && (
            <div className="text-lg md:text-xl mb-6">
              Získali jste <span className="font-bold">{score}</span> z {totalPoints > 0 ? totalPoints : 50} bodů.
              (Minimum pro úspěch: 43 bodů)
            </div>
          )}
          {!examMode && (
            <div className="text-lg md:text-xl mb-6">
              V tomto kole procvičování jste odpověděli na {answeredInCurrentPracticeSession} otázek, z toho {correctInCurrentPracticeSession} správně na první pokus.
              {answeredInCurrentPracticeSession > 0 && (
                <span> (Úspěšnost na první pokus: {((correctInCurrentPracticeSession / answeredInCurrentPracticeSession) * 100).toFixed(1)}%)</span>
              )}
            </div>
          )}
          
          <h3 className="text-lg font-semibold mt-8 mb-4">Přehled odpovědí:</h3>
          <div className="space-y-3 text-left max-h-[50vh] overflow-y-auto border p-3 md:p-4 rounded-md shadow">
            {questions.map((q_item, index) => {
              const userAnswer = responses[q_item.id];
              const isCorrect = userAnswer === q_item.spravna;
              const isAnswered = userAnswer !== undefined;
              return (
                <div key={q_item.id} className={clsx("p-3 border rounded-md text-sm", {
                  "bg-green-50 border-green-400": isAnswered && isCorrect,
                  "bg-red-50 border-red-400": isAnswered && !isCorrect,
                  "bg-gray-50 border-gray-300": !isAnswered,
                })}>
                  <p className="font-medium">{index + 1}. {q_item.otazka}</p>
                  {q_item.obrazek && <img src={q_item.obrazek} alt={`Otázka ${index + 1}`} className="my-2 rounded max-h-48 md:max-h-60 mx-auto shadow"/>}
                  <p className="mt-1">Správná odpověď: <span className="font-semibold">{q_item.moznosti[q_item.spravna]}</span></p>
                  {isAnswered ? (
                    <p className="mt-0.5">Vaše odpověď: <span className={clsx(isCorrect ? "text-green-700" : "text-red-700", "font-semibold")}>{q_item.moznosti[userAnswer]}</span> {isCorrect ? "✓" : "✗"}</p>
                  ) : (
                    <p className="mt-0.5 text-gray-500">Bez odpovědi</p>
                  )}
                </div>
              );
            })}
          </div>

          <Button size="lg" className="mt-8 w-full" onClick={() => setPhase("intro")}>
            Zpět na hlavní stránku
          </Button>
        </div>
      </>
    );
  }

  // Fallback / Loading state
  useEffect(() => {
    // Attempt to reset to intro if stuck in an invalid state, e.g. no questions in test phase
    if (phase === "test" && !q) {
        console.warn("No current question in test phase, resetting to intro.");
        setPhase("intro");
    }
  }, [phase, q]);


  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gray-100">
      <RefreshCcw size={48} className="text-blue-500 animate-spin mb-4" />
      <p className="text-xl text-gray-700 mb-2">Načítám aplikaci...</p>
      <p className="text-sm text-gray-500 mb-6">Pokud načítání trvá příliš dlouho, zkuste obnovit stránku.</p>
      <Button onClick={() => setPhase("intro")} variant="outline">
        Zkusit znovu / Přejít na úvod
      </Button>
    </div>
  );
}
