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
import { Send, BarChart2, RefreshCcw } from "lucide-react";
import clsx from "clsx";

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
          {label} {timeLeft !== null && timeLeft !== undefined && <span className="ml-2 font-mono">{timeFmt}</span>}
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
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats>(loadStats()); // Manage stats in state

  // chat UI state
  const [messages, setMessages] = useState<Array<{ from: "ai" | "user"; text: string }>>([{ from: "ai", text: "Ahoj! Zeptej se na cokoliv k testu." }]);
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
  function finishExam() {
    setPhase("done");
    const currentStats = loadStats();
    let newStats: Stats;
    if (examMode) {
      const score = questions.reduce((acc, qq) => (responses[qq.id] === qq.spravna ? acc + qq.points : acc), 0);
      const passed = score >= 43;
      const newTaken = currentStats.examTaken + 1;
      const newAvgScore = parseFloat(((currentStats.examAvgScore * currentStats.examTaken + score) / newTaken).toFixed(1));
      const spent = OSTRY_TIME - (timeLeft ?? 0);
      const newAvgTime = Math.round((currentStats.examAvgTime * currentStats.examTaken + spent) / newTaken);
      newStats = {
        ...currentStats,
        examTaken: newTaken,
        examPassed: currentStats.examPassed + (passed ? 1 : 0),
        examAvgScore: newAvgScore,
        examAvgTime: newAvgTime,
      };
    } else {
      const answeredQuestionsInPractice = questions.filter(q => responses.hasOwnProperty(q.id));
      const answeredCount = answeredQuestionsInPractice.length;
      const correctCount = answeredQuestionsInPractice.filter(q => responses[q.id] === q.spravna).length;
      newStats = {
        ...currentStats,
        practiceAnswered: currentStats.practiceAnswered + answeredCount,
        practiceCorrect: currentStats.practiceCorrect + correctCount,
      };
    }
    saveStats(newStats);
    setStats(newStats); // Update state to reflect changes in UI
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
    setMessages((m) => [...m, { from: "user", text: userMessage }]);
    setDraft("");

    // Mock AI Response
    setTimeout(() => {
      const mockAiResponse = `Toto je mockovaná odpověď AI na vaši otázku: "${userMessage}". Kontext otázky: ${currentQ?.otazka ? `"${currentQ.otazka}"` : "Žádný kontext otázky."}`;
      setMessages((m) => [...m, { from: "ai", text: mockAiResponse }]);
    }, 1000);
  };

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const q = questions[current];

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
                {questions.map((_, idx) => (
                  <Button
                    key={`nav-${idx}`}
                    variant={idx === current ? "default" : responses.hasOwnProperty(questions[idx].id) ? "secondary" : "outline"}
                    size="sm"
                    className={clsx("h-7 w-7 p-0 text-xs md:h-8 md:w-8 md:text-sm", {
                      "bg-yellow-400 hover:bg-yellow-500 text-black": responses.hasOwnProperty(questions[idx].id) && idx !== current,
                      "border-blue-500": idx === current,
                    })}
                    onClick={() => setCurrent(idx)}
                  >
                    {idx + 1}
                  </Button>
                ))}
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
                  onValueChange={(val) => setResponses(prev => ({ ...prev, [q.id]: parseInt(val) }))}
                  className="mt-4 space-y-2"
                >
                  {q.moznosti.map((opt, idx) => (
                    <div key={idx} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
                      <RadioGroupItem value={idx.toString()} id={`opt-${q.id}-${idx}`} />
                      <label htmlFor={`opt-${q.id}-${idx}`} className="flex-1 text-sm md:text-base cursor-pointer">{opt}</label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
            <div className="mt-6 flex justify-between items-center">
              <Button variant="outline" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>
                Předchozí
              </Button>
              <span className="text-sm text-gray-600">{current + 1} / {questions.length}</span>
              {current < questions.length - 1 ? (
                <Button onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}>
                  Další
                </Button>
              ) : (
                <Button onClick={finishExam} className="bg-green-600 hover:bg-green-700 text-white">
                  Dokončit test
                </Button>
              )}
            </div>
          </main>

          <aside className="w-full md:w-80 lg:w-96 bg-gray-50 border-l flex flex-col p-1.5 md:p-2 max-h-screen">
            <div className="p-2 md:p-3 border-b">
              <h3 className="font-semibold text-sm md:text-base">Zeptat se AI lektora</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-2 text-xs md:text-sm">
              {messages.map((msg, i) => (
                <div key={i} className={clsx("p-2.5 rounded-lg shadow-sm max-w-[90%]", msg.from === "ai" ? "bg-blue-100 self-start" : "bg-green-100 self-end ml-auto")}>
                  {msg.text.split('\n').map((line, j) => <p key={j} className="break-words">{line}</p>)}
                </div>
              ))}
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
                />
                <Button onClick={sendMsg} size="icon" disabled={!draft.trim()}>
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

    const answeredInPractice = questions.filter(q_item => responses.hasOwnProperty(q_item.id));
    const correctInPractice = answeredInPractice.filter(q_item => responses[q_item.id] === q_item.spravna).length;

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
              Zodpověděli jste {answeredInPractice.length} otázek, z toho {correctInPractice} správně.
              {answeredInPractice.length > 0 && (
                <span> (Úspěšnost: {((correctInPractice / answeredInPractice.length) * 100).toFixed(1)}%)</span>
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
