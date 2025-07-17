import React, { useEffect, useRef, useState } from "react";
import Confetti from "react-confetti";
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
import { Send, BarChart2, RefreshCcw, CheckCircle2, XCircle, User, LogOut, Timer, Book, Library, FileText, PanelLeftClose, PanelRightOpen } from "lucide-react";
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

// Nový typ pro ukládání dat pro podrobnou analýzu
export type AnalysisEntry = {
  user: string; // Kdo odpovídal
  questionId: string;
  questionText: string;
  groupId: number;
  answeredAt: string; // ISO string
  timeToAnswer: number; // v milisekundách
  isCorrect: boolean; // Byla finální odpověď správná?
  isFirstAttemptCorrect: boolean; // Byla první odpověď správná?
  mode: 'exam' | 'practice';
  isCorrection?: boolean; // Jedná se o pokus o opravu?
};

// Nový typ pro ukládání detailů o odpovědi v režimu procvičování
export type PracticeAttempt = {
  firstAttemptIndex: number;      // Index odpovědi při prvním pokusu
  isFirstAttemptCorrect: boolean; // Zda byl první pokus správný
  finalAttemptIndex: number;      // Index odpovědi při finálním (posledním) pokusu
  answered: true;                 // Indikátor, že na otázku bylo odpovězeno
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
export type Stats = {
  examTaken: number;
  examPassed: number;
  examAvgScore: number;
  examAvgTime: number; // v sekundách
  practiceAnswered: number;
  practiceCorrect: number;
  lastExamScore: number | null;
  lastExamTimeSpent: number | null;
  lastExamPassed: boolean | null;
  lastPracticeAnswered: number | null;
  lastPracticeCorrect: number | null;
};
const DEFAULT_STATS: Stats = {
  examTaken: 0,
  examPassed: 0,
  examAvgScore: 0,
  examAvgTime: 0,
  practiceAnswered: 0,
  practiceCorrect: 0,
  lastExamScore: null,
  lastExamTimeSpent: null,
  lastExamPassed: null,
  lastPracticeAnswered: null,
  lastPracticeCorrect: null,
};

const ALLOWED_USERS = ["Tester", "Tanika"];

const getCurrentUser = (): string | null => localStorage.getItem("autoskola-currentUser");

function loadStats(user: string): Stats {
  try {
    const storedStats = localStorage.getItem(`autoskolastats-${user}`);
    return storedStats ? JSON.parse(storedStats) : DEFAULT_STATS;
  } catch {
    return DEFAULT_STATS;
  }
}
function saveStats(user: string, s: Stats) {
  localStorage.setItem(`autoskolastats-${user}`, JSON.stringify(s));
}

/* ----------------------- Analytická data ------------------------- */
async function getAnalysisData(): Promise<AnalysisEntry[]> {
  try {
    const res = await fetch("/api/analysis-data");
    if (!res.ok) {
      throw new Error(`Server responded with status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Could not get analysis data:", error);
    return [];
  }
}

async function appendAnalysisData(entries: AnalysisEntry[]) {
  if (entries.length === 0) {
    console.log("[appendAnalysisData] No entries to append. Skipping API call.");
    return;
  }
  try {
    console.log("[appendAnalysisData] Sending entries to server:", entries);
    const response = await fetch("/api/save-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }
    console.log("[appendAnalysisData] Successfully sent data.");
  } catch (error) {
    console.error("Failed to save analysis data:", error);
  }
}

/* ---------------------------- TopNav ------------------------------- */
function TopNav({
  label,
  timeLeft,
  showStats,
  onResetStats,
  onHome,
  currentUser,
  onSetCurrentUser,
}: {
  label: string;
  timeLeft?: number | null;
  showStats: boolean;
  onResetStats: () => void;
  onHome: () => void;
  currentUser: string;
  onSetCurrentUser: (name: string | null) => void;
}) {
  const mm = timeLeft !== null && timeLeft !== undefined ? Math.floor(timeLeft / 60) : null;
  const ss = timeLeft !== null && timeLeft !== undefined ? timeLeft % 60 : null;
  const timeFmt = (mm !== null && ss !== null) ? `${mm}:${ss.toString().padStart(2, "0")}` : "";
  return (
    <header className="w-full bg-white border-b shadow-sm sticky top-0 z-40">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Book size={20} className="text-blue-600" />
          <h1 className="font-semibold text-lg select-none">Autoškola B</h1>
        </div>
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
        <div className="flex items-center gap-4">
          {showStats && currentUser && (
            <div className="flex items-center gap-2 border-r pr-2">
              <div className="flex items-center gap-2">
                <User size={16} className="text-gray-600" />
                <span className="text-sm font-medium">{currentUser}</span>
              </div>
              <Button variant="ghost" size="icon" title="Odhlásit se" onClick={() => onSetCurrentUser(null)}>
                <LogOut size={18} />
              </Button>
            </div>
          )}
          <Button variant="ghost" onClick={onHome} className="text-sm font-medium">
            Domů
          </Button>
        </div>
      </div>
    </header>
  );
}

/* ----------------------------- Login Screen ------------------------ */
function LoginScreen({ onLogin }: { onLogin: (name: string) => void }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    const trimmedName = username.trim();
    if (ALLOWED_USERS.map(u => u.toLowerCase()).includes(trimmedName.toLowerCase())) {
      const caseCorrectedName = ALLOWED_USERS.find(u => u.toLowerCase() === trimmedName.toLowerCase())!;
      onLogin(caseCorrectedName);
    } else {
      setError("Neplatné uživatelské jméno.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-sm p-6">
        <CardHeader className="text-center">
          <h2 className="text-2xl font-bold">Přihlášení</h2>
          <p className="text-sm text-gray-500 mt-2">Zadejte své uživatelské jméno.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">Uživatelské jméno</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError("");
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Zadejte jméno"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <Button onClick={handleLogin} className="w-full">
            Přihlásit se
          </Button>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Nebo</span>
            </div>
          </div>
          <Button onClick={() => onLogin("Host")} variant="secondary" className="w-full">
            Pokračovat jako Host
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ----------------------------- App -------------------------------- */
export default function DrivingTestApp() {
  const [currentUser, setCurrentUser] = useState<string | null>(getCurrentUser());
  const [phase, setPhase] = useState<"intro" | "setup" | "test" | "done" | "browse" | "analysis">("intro");
  const [browseState, setBrowseState] = useState<"groups" | "questions">("groups");
  const [originPhase, setOriginPhase] = useState<"intro" | "browse">("intro");
  const [examMode, setExamMode] = useState(true);
  const [selectedGroups, setSelected] = useState<number[]>(GROUPS.map((g) => g.id));
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({}); 
  const [practiceFirstAttempts, setPracticeFirstAttempts] = useState<Record<string, { firstAttemptIndex: number; isFirstAttemptCorrect: boolean }>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [sessionAnalysis, setSessionAnalysis] = useState<Record<string, { timeToAnswer: number; firstAttemptCorrect: boolean }>>({});
  const [analysisData, setAnalysisData] = useState<AnalysisEntry[]>([]);
  const { ask, loading: aiLoading, answer: aiAnswer, messages, setMessages } = useAi();
  const [draft, setDraft] = useState("");
  const msgEndRef = useRef<HTMLDivElement | null>(null);
  const [isAiTutorCollapsed, setIsAiTutorCollapsed] = useState(false);

  const handleLogin = (name: string) => {
    localStorage.setItem("autoskola-currentUser", name);
    setCurrentUser(name);
    setStats(loadStats(name));
  };

  const handleLogout = () => {
    localStorage.removeItem("autoskola-currentUser");
    setCurrentUser(null);
    setStats(DEFAULT_STATS);
  };

  useEffect(() => {
    if (currentUser) {
      setStats(loadStats(currentUser));
    }
  }, [currentUser]);

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

  async function buildPractice(groupsToBuild: number[]): Promise<Question[]> {
    const pools = await Promise.all(
      groupsToBuild.map(async (gid) => {
        const questions = await fetchGroup(gid);
        for (let i = questions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [questions[i], questions[j]] = [questions[j], questions[i]];
        }
        return {
          gid,
          questions,
          quota: GROUPS.find(g => g.id === gid)!.quota,
          currentIndex: 0, 
        };
      })
    );

    const result: Question[] = [];
    const totalQuestions = pools.reduce((sum, p) => sum + p.questions.length, 0);
    const weightedGroupIds: number[] = [];
    for (const pool of pools) {
      for (let i = 0; i < pool.quota; i++) {
        weightedGroupIds.push(pool.gid);
      }
    }

    while (result.length < totalQuestions) {
      for (let i = weightedGroupIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [weightedGroupIds[i], weightedGroupIds[j]] = [weightedGroupIds[j], weightedGroupIds[i]];
      }

      let addedInThisRound = false;
      for (const gid of weightedGroupIds) {
        const pool = pools.find(p => p.gid === gid);
        if (pool && pool.currentIndex < pool.questions.length) {
          result.push(pool.questions[pool.currentIndex]);
          pool.currentIndex++;
          addedInThisRound = true;
        }
      }

      if (!addedInThisRound) {
        for (const pool of pools) {
          while (pool.currentIndex < pool.questions.length) {
            result.push(pool.questions[pool.currentIndex]);
            pool.currentIndex++;
          }
        }
      }
    }
    return result;
  }

  const initiateTest = async (isExam: boolean, groups: number[], questionsOverride?: Question[]) => {
    setIsLoading(true);
    setOriginPhase("intro");
    setExamMode(isExam);
    const qs = questionsOverride ?? (isExam ? await buildExam() : await buildPractice(groups));
    setQuestions(qs);
    setCurrent(0);
    setResponses({});
    if (!isExam) {
      setPracticeFirstAttempts({});
    }
    setSessionAnalysis({});
    setPhase("test");
    setTimeLeft(isExam ? OSTRY_TIME : null);
    setIsLoading(false);
  };

  const startTest = async () => {
    await initiateTest(examMode, selectedGroups);
  };

  useEffect(() => {
    if (phase !== 'test' || timeLeft === null) return;
    if (timeLeft <= 0) {
      finishExam();
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => (t !== null ? t - 1 : null)), 1000);
    return () => clearInterval(id);
  }, [timeLeft, phase]);

  function calculateAndSavePracticeStats() {
    if (!currentUser) return;
    const currentStats = loadStats(currentUser);
    const answeredQuestionIds = Object.keys(practiceFirstAttempts);
    const answeredCountInSession = answeredQuestionIds.length;
    
    if (answeredCountInSession === 0) return; 

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
      lastPracticeAnswered: answeredCountInSession,
      lastPracticeCorrect: correctCountInSession,
      lastExamScore: currentStats.lastExamScore,
      lastExamTimeSpent: currentStats.lastExamTimeSpent,
      lastExamPassed: currentStats.lastExamPassed,
    };
    saveStats(currentUser, newStats);
    setStats(newStats); 
  }

  function commitSessionAnalysis() {
    console.log("[commitSessionAnalysis] Starting.");
    const entries: AnalysisEntry[] = [];
    const answeredQuestionIds = Object.keys(responses);
    console.log(`[/commit] Responded IDs (${answeredQuestionIds.length}):`, answeredQuestionIds);
    console.log(`[/commit] Session Analysis State (${Object.keys(sessionAnalysis).length} keys):`, sessionAnalysis);

    for (const qId of answeredQuestionIds) {
      const question = questions.find(q => q.id === qId);
      const sessionData = sessionAnalysis[qId];
      const finalAnswerIndex = responses[qId];

      if (!question) {
        console.warn(`[/commit] SKIPPING: Question not found for id: ${qId}`);
        continue;
      }
      if (!sessionData) {
        console.warn(`[/commit] SKIPPING: Session analysis data not found for id: ${qId}`);
        continue;
      }

      console.log(`[/commit] PROCESSING: id: ${qId}`);
      entries.push({
        user: currentUser || "unknown",
        questionId: qId,
        questionText: question.otazka,
        groupId: question.groupId,
        answeredAt: new Date().toISOString(),
        timeToAnswer: sessionData.timeToAnswer,
        isFirstAttemptCorrect: sessionData.firstAttemptCorrect,
        isCorrect: finalAnswerIndex === question.spravna,
        mode: examMode ? 'exam' : 'practice',
      });
    }
    console.log("[commitSessionAnalysis] Compiled entries:", entries);
    appendAnalysisData(entries);
  }

  function finishExam() {
    // Okamžitě se pokusíme odeslat data z dokončené session
    commitSessionAnalysis();

    setPhase("done");
    
    if (examMode) {
      if (!currentUser) return;
      const currentStats = loadStats(currentUser);
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
        lastExamScore: score,
        lastExamTimeSpent: spent,
        lastExamPassed: passed,
        lastPracticeAnswered: currentStats.lastPracticeAnswered,
        lastPracticeCorrect: currentStats.lastPracticeCorrect,
      };
      saveStats(currentUser, newStats);
      setStats(newStats);
    } else {
      calculateAndSavePracticeStats();
    }
  }

  async function handleResetStats() {
    if (currentUser && confirm(`Opravdu chcete vymazat všechny statistiky pro uživatele "${currentUser}"? Tato akce je nevratná.`)) {
      saveStats(currentUser, DEFAULT_STATS);
      setStats(DEFAULT_STATS);
      try {
        const response = await fetch("/api/reset-analysis", { method: "POST" });
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        setAnalysisData([]);
        alert("Statistiky a analytická data byla vymazána.");
      } catch (error) {
        console.error("Failed to reset analysis data:", error);
        alert("Nepodařilo se smazat analytická data na serveru. Zkuste to prosím znovu.");
      }
    }
  }

  const sendMsg = async () => {
    if (!draft.trim()) return;
    const currentQ = questions[current];
    const userMessage = draft.trim();
    setDraft("");

    const lowerUserMessage = userMessage.toLowerCase();
    const explicitlyAskedForAnswer = 
      lowerUserMessage.includes("řekni mi správnou odpověď") ||
      lowerUserMessage.includes("řekni správnou odpověď") ||
      lowerUserMessage.includes("jaká je správná odpověď") ||
      lowerUserMessage.includes("co je správně") ||
      lowerUserMessage.includes("prozraď správnou odpověď") ||
      lowerUserMessage.includes("chci vědět odpověď");

    const studentSelectedIndex = responses[currentQ.id];
    await ask(userMessage, {
      question: { ...currentQ, id_otazky: currentQ.id },
      studentSelected: typeof studentSelectedIndex === 'number' ? studentSelectedIndex : null,
      explicitlyAsked: explicitlyAskedForAnswer 
    });
  };

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const q = questions[current];

  useEffect(() => {
    if (q) {
      setQuestionStartTime(Date.now());
    }
  }, [q]);

  useEffect(() => {
    if (phase === 'analysis') {
        getAnalysisData().then(setAnalysisData);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "test") {
        setMessages([{ role: "assistant", text: `Jsem připraven zodpovědět tvé dotazy k otázce: "${q?.otazka}"` }]);
        setDraft("");
    } else if (phase === "intro" || phase === "setup") {
        setMessages([{ role: "assistant", text: "Ahoj! Zeptej se na cokoliv k testu nebo si vyber režim." }]);
    }
  }, [q, phase, setMessages]);

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (phase === "intro") {
    return (
      <>
        <TopNav 
          label={`Vítejte, ${currentUser}!`}
          showStats={true} 
          onResetStats={handleResetStats} 
          onHome={() => setPhase("intro")}
          currentUser={currentUser}
          onSetCurrentUser={handleLogout}
        />
        <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6 space-y-6">
          <div className="text-center py-12 md:py-16">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl" style={{ lineHeight: '1.3' }}>
              Otestujte si své znalosti
            </h1>
            <p className="mt-6 text-base leading-7 text-gray-600 max-w-2xl mx-auto md:text-lg md:leading-8">
              Připravte se na zkoušky v autoškole. Vyberte si mezi ostrým testem nanečisto nebo volným procvičováním.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <Button size="lg" className="w-full h-auto py-6 text-base flex-col" onClick={() => { setExamMode(true); setPhase("setup"); }}>
              <div className="flex items-center">
                <Timer className="mr-2 h-5 w-5" />
                <span className="font-semibold">Ostrý test</span>
              </div>
              <span className="font-normal text-sm text-gray-200 mt-1">Časomíra, 25 otázek, 50 bodů</span>
            </Button>
            <Button size="lg" variant="outline" className="w-full h-auto py-6 text-base flex-col" onClick={() => { setExamMode(false); setPhase("setup"); }}>
               <div className="flex items-center">
                <Book className="mr-2 h-5 w-5" />
                <span className="font-semibold">Procvičování</span>
              </div>
              <span className="font-normal text-sm text-gray-500 mt-1">Vlastní výběr okruhů</span>
            </Button>
            <div className="md:col-span-2">
              <Button size="lg" variant="secondary" className="w-full h-auto py-6 text-base flex-col" onClick={() => { setPhase("browse"); setBrowseState("groups"); }}>
                  <div className="flex items-center">
                      <Library className="mr-2 h-5 w-5" />
                      <span className="font-semibold">Prohlížení otázek</span>
                  </div>
                  <span className="font-normal text-sm text-gray-500 mt-1">Zobrazit všechny otázky podle okruhů</span>
              </Button>
            </div>
            <div className="md:col-span-2">
              <Button size="lg" variant="secondary" className="w-full h-auto py-6 text-base flex-col" onClick={() => { setPhase("analysis"); }}>
                  <div className="flex items-center">
                      <FileText className="mr-2 h-5 w-5" />
                      <span className="font-semibold">Podrobná analýza</span>
                  </div>
                  <span className="font-normal text-sm text-gray-500 mt-1">Zjistěte, kde děláte nejvíce chyb</span>
              </Button>
            </div>
          </div>
          <div className="mt-16">
            <h3 className="text-xl font-bold text-center mb-6 flex items-center justify-center gap-2">
              <BarChart2 size={24} className="text-primary" />
              Váš pokrok
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <h4 className="font-semibold text-lg">Ostré testy</h4>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Celková úspěšnost</p>
                  <div className="flex items-center gap-4 mt-2">
                    <Progress value={stats.examTaken > 0 ? (stats.examPassed / stats.examTaken) * 100 : 0} className="h-3" />
                    <span className="font-bold text-lg">
                      {stats.examTaken > 0 ? ((stats.examPassed / stats.examTaken) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </div>
                  {stats.lastExamScore !== null && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-gray-500 uppercase font-medium">Poslední pokus</p>
                      <p className="text-sm mt-1">
                        <span className={clsx(stats.lastExamPassed ? "text-green-600" : "text-red-600", "font-semibold")}>
                          {stats.lastExamPassed ? "Úspěšně" : "Neúspěšně"}
                        </span>
                        <span className="text-gray-600"> ({stats.lastExamScore} b.)</span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <h4 className="font-semibold text-lg">Procvičování</h4>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Správnost na 1. pokus</p>
                  <div className="flex items-center gap-4 mt-2">
                    <Progress value={stats.practiceAnswered > 0 ? (stats.practiceCorrect / stats.practiceAnswered) * 100 : 0} className="h-3" />
                    <span className="font-bold text-lg">
                      {stats.practiceAnswered > 0 ? ((stats.practiceCorrect / stats.practiceAnswered) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </div>
                   {stats.lastPracticeAnswered !== null && stats.lastPracticeCorrect !== null && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-gray-500 uppercase font-medium">Poslední kolo</p>
                      <p className="text-sm mt-1">
                        <span className="font-semibold">{stats.lastPracticeCorrect} / {stats.lastPracticeAnswered}</span>
                        <span className="text-gray-600"> správně</span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <Card className="mt-8 text-left bg-gray-50/50">
              <CardHeader><h3 className="font-semibold">Detailní statistiky</h3></CardHeader>
              <CardContent className="text-sm space-y-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                <div>
                  <h4 className="font-medium text-xs text-gray-500 uppercase">Ostré testy</h4>
                  <p>Absolvované: <span className="font-medium">{stats.examTaken}</span></p>
                  <p>Průměrné skóre: <span className="font-medium">{stats.examAvgScore > 0 ? stats.examAvgScore.toFixed(1) : "0.0"} / 50</span></p>
                  <p>Průměrný čas: <span className="font-medium">{stats.examAvgTime > 0 ? `${Math.floor(stats.examAvgTime / 60)}m ${stats.examAvgTime % 60}s` : "0m 0s"}</span></p>
                </div>
                <div>
                  <h4 className="font-medium text-xs text-gray-500 uppercase">Procvičování</h4>
                  <p>Zodpovězeno otázek: <span className="font-medium">{stats.practiceAnswered}</span></p>
                  <p>Správně na 1. pokus: <span className="font-medium">{stats.practiceCorrect}</span></p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  if (phase === "analysis") {
    const userAnalysisData = analysisData.filter(entry => entry.user === currentUser);

    const analysisByGroup = GROUPS.map(group => {
      const groupEntries = userAnalysisData.filter(entry => entry.groupId === group.id);
      const total = groupEntries.length;
      if (total === 0) {
        return { ...group, total: 0, successRate: 0, avgTime: 0 };
      }
      const correct = groupEntries.filter(e => e.isFirstAttemptCorrect).length;
      const totalTime = groupEntries.reduce((sum, e) => sum + e.timeToAnswer, 0);
      return {
        ...group,
        total,
        successRate: (correct / total) * 100,
        avgTime: totalTime / total / 1000, // v sekundách
      };
    });

    const incorrectAnswers = userAnalysisData.filter(e => !e.isFirstAttemptCorrect);
    const mistakesByQuestion = userAnalysisData.reduce((acc, entry) => {
      if (!acc[entry.questionId]) {
        acc[entry.questionId] = {
          text: entry.questionText,
          history: [],
        };
      }
      acc[entry.questionId].history.push({
        isCorrect: entry.isFirstAttemptCorrect,
        answeredAt: entry.answeredAt,
      });
      return acc;
    }, {} as Record<string, { text: string; history: { isCorrect: boolean; answeredAt: string }[] }>);

    const processedMistakes = Object.entries(mistakesByQuestion)
      .map(([questionId, data]) => {
        const incorrectCount = data.history.filter(h => !h.isCorrect).length;
        const lastAttempt = data.history[data.history.length - 1];
        const isCorrected = lastAttempt ? lastAttempt.isCorrect : false;
        return {
          questionId,
          text: data.text,
          incorrectCount,
          isCorrected,
        };
      })
      .filter(item => item.incorrectCount > 0) // Zobrazíme jen otázky, kde byla alespoň jedna chyba
      .sort((a, b) => {
        if (a.isCorrected !== b.isCorrected) {
          return a.isCorrected ? 1 : -1; // Opravené chyby dáme na konec
        }
        return b.incorrectCount - a.incorrectCount; // Řadíme podle počtu chyb
      });

    const startPracticeFromMistakes = async () => {
      if (!currentUser) return;
      
      const questionsToPracticeIds = processedMistakes
        .filter(m => !m.isCorrected)
        .map(m => m.questionId);

      if (questionsToPracticeIds.length === 0) {
        alert("Nemáte žádné otázky, ve kterých byste chybovali. Skvělá práce!");
        return;
      }
      
      setIsLoading(true);
      const allQuestionsPromises = GROUPS.map(g => fetchGroup(g.id));
      const allQuestionsArrays = await Promise.all(allQuestionsPromises);
      const allQuestions = allQuestionsArrays.flat();
      
      let questionsForPractice = allQuestions.filter(q => questionsToPracticeIds.includes(q.id));
      
      // Shuffle
      for (let i = questionsForPractice.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questionsForPractice[i], questionsForPractice[j]] = [questionsForPractice[j], questionsForPractice[i]];
      }

      await initiateTest(false, [], questionsForPractice);
      setIsLoading(false);
    };

    return (
      <>
        <TopNav 
          label="Podrobná analýza" 
          showStats={false} 
          onResetStats={handleResetStats} 
          onHome={() => setPhase("intro")}
          currentUser={currentUser}
          onSetCurrentUser={handleLogout}
        />
        <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
          <h2 className="text-2xl font-semibold mb-6 text-center">Podrobná analýza úspěšnosti</h2>
          {userAnalysisData.length === 0 ? (
            <Card className="max-w-3xl mx-auto text-center p-8">
              <CardHeader><h3 className="font-semibold text-lg">Zatím zde nic není</h3></CardHeader>
              <CardContent>
                <p className="text-gray-600">Absolvujte test nebo procvičování, abychom mohli začít sbírat data pro analýzu vašeho pokroku.</p>
                <Button className="mt-6" onClick={() => setPhase("intro")}>Zpět na hlavní stránku</Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <h3 className="font-semibold text-lg">Přehled podle okruhů</h3>
                <p className="text-sm text-gray-500">Údaje jsou založeny na správnosti vaší první odpovědi.</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-3 font-medium">Okruh</th>
                        <th className="p-3 font-medium text-center">Úspěšnost</th>
                        <th className="p-3 font-medium text-center">Průměrný čas</th>
                        <th className="p-3 font-medium text-center">Počet odpovědí</th>
                        <th className="p-3 font-medium text-center">Akce</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisByGroup.map(group => (
                        <tr key={group.id} className="border-b">
                          <td className="p-3 font-medium">{group.name}</td>
                          <td className="p-3 text-center">
                            {group.total > 0 ? (
                              <div className="flex items-center justify-center gap-2">
                                <Progress value={group.successRate} className="h-2 w-24" />
                                <span>{group.successRate.toFixed(1)}%</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center">{group.total > 0 ? `${group.avgTime.toFixed(1)}s` : "-"}</td>
                          <td className="p-3 text-center">{group.total}</td>
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
                              onClick={async () => {
                                await initiateTest(false, [group.id], undefined);
                              }}
                              disabled={isLoading}
                            >
                              Procvičit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {processedMistakes.length > 0 && (
            <Card className="max-w-4xl mx-auto mt-8">
              <CardHeader>
                <h3 className="font-semibold text-lg">Přehled chybovosti</h3>
                <p className="text-sm text-gray-500">Otázky, ve kterých jste v minulosti chybovali.</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {processedMistakes.map(({ questionId, text, incorrectCount, isCorrected }) => (
                    <div key={questionId} className={clsx("p-3 border rounded-md", {
                      "bg-red-50/50 border-red-200": !isCorrected,
                      "bg-green-50/50 border-green-200": isCorrected,
                    })}>
                      <div className="flex justify-between items-center">
                        <p className={clsx("font-semibold", {
                          "text-red-800": !isCorrected,
                          "text-green-800": isCorrected,
                        })}>
                          {incorrectCount}x nesprávně
                        </p>
                        {isCorrected && (
                          <span className="text-xs font-medium text-white bg-green-600 px-2 py-1 rounded-full">
                            OPRAVENO
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {userAnalysisData.length > 0 && (
            <div className="max-w-4xl mx-auto mt-8 text-center">
              <Button 
                size="lg" 
                onClick={startPracticeFromMistakes}
                disabled={isLoading || processedMistakes.filter(m => !m.isCorrected).length === 0}
                isLoading={isLoading}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <RefreshCcw className="mr-2 h-5 w-5" />
                {isLoading ? "Připravuji otázky..." : "Vyzkoušet znovu chybné otázky"}
              </Button>
              {processedMistakes.filter(m => !m.isCorrected).length === 0 && userAnalysisData.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Skvělá práce! Všechny své chyby jste si již opravili.
                </p>
              )}
            </div>
          )}
        </div>
      </>
    );
  }

  if (phase === "browse") {
    const groupName = browseState === 'questions' && questions.length > 0
        ? GROUPS.find(g => g.id === questions[0].groupId)?.name
        : "okruh";

    return (
        <>
            <TopNav 
                label={browseState === 'groups' ? "Prohlížení: Výběr okruhu" : `Prohlížení: ${groupName}`}
                showStats={false} 
                onResetStats={handleResetStats} 
                onHome={() => setPhase("intro")}
                currentUser={currentUser}
                onSetCurrentUser={handleLogout}
            />
            <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
                {isLoading ? (
                    <div className="text-center p-10">
                        <RefreshCcw size={32} className="text-blue-500 animate-spin mx-auto" />
                        <p className="mt-4 text-gray-600">Načítám...</p>
                    </div>
                ) : browseState === 'groups' ? (
                    <>
                        <h2 className="text-2xl font-semibold mb-6 text-center">Vyberte okruh k prohlížení</h2>
                        <div className="mb-6 space-y-3 max-w-2xl mx-auto">
                            {GROUPS.map((g) => (
                                <div 
                                    key={g.id} 
                                    className="flex items-center space-x-2 p-3 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={async () => {
                                        setIsLoading(true);
                                        const qs = await fetchGroup(g.id);
                                        setQuestions(qs.sort((a, b) => {
                                          const idA = parseInt(a.id.replace(/\D/g, ''), 10);
                                          const idB = parseInt(b.id.replace(/\D/g, ''), 10);
                                          return idA - idB;
                                        }));
                                        setBrowseState("questions");
                                        setIsLoading(false);
                                    }}
                                >
                                    <label className="text-sm cursor-pointer flex-1">{g.name}</label>
                                </div>
                            ))}
                        </div>
                    </>
                ) : ( // browseState === 'questions'
                    <>
                        <div className="max-w-3xl mx-auto mb-4">
                            <Button variant="outline" onClick={() => {
                                setBrowseState('groups');
                                setQuestions([]); // Clear questions
                            }}>
                                &larr; Zpět na výběr okruhů
                            </Button>
                        </div>
                        <h2 className="text-2xl font-semibold mb-6 text-center">Vyberte otázku</h2>
                        <div className="space-y-2 max-w-3xl mx-auto">
                            {questions.map((q, index) => (
                                <div 
                                    key={q.id} 
                                    className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => {
                                        setCurrent(index);
                                        setExamMode(false); // Use practice UI
                                        setResponses({});
                                        setPracticeFirstAttempts({});
                                        setOriginPhase("browse"); // Remember where we came from
                                        setPhase("test");
                                    }}
                                >
                                    <p className="font-mono text-xs text-gray-500">ID: {q.id}</p>
                                    <p>{q.otazka}</p>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </>
    );
  }

  if (phase === "setup") {
    return (
      <>
        <TopNav 
          label={examMode ? "Příprava na ostrý test" : "Nastavení procvičování"} 
          showStats={false} 
          onResetStats={handleResetStats} 
          onHome={() => setPhase("intro")}
          currentUser={currentUser}
          onSetCurrentUser={handleLogout}
        />
        <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
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
          <Button 
            size="lg" 
            className="w-full mt-6" 
            onClick={startTest} 
            disabled={!examMode && selectedGroups.length === 0}
            isLoading={isLoading}
          >
            {isLoading ? "Načítám otázky..." : (examMode ? "Spustit ostrý test" : "Spustit procvičování")}
          </Button>
        </div>
      </>
    );
  }

  if (phase === "test" && q) {
    const answeredCount = Object.keys(responses).length;
    const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
    
    return (
      <div className="flex flex-col h-screen">
        <TopNav
          label={examMode ? "Ostrý test" : (originPhase === 'browse' ? 'Prohlížení otázky' : 'Procvičování')}
          timeLeft={timeLeft}
          showStats={false}
          onResetStats={handleResetStats}
          currentUser={currentUser}
          onSetCurrentUser={handleLogout}
          onHome={() => {
            if (originPhase === 'browse') {
              setPhase('browse');
              setBrowseState('questions');
              return;
            }
            if (confirm("Opravdu chcete opustit test? Průběh nebude uložen.")) {
              setPhase("intro");
            }
          }}
        />
        <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
          {originPhase === 'browse' && (
            <div className="mb-4">
              <Button
                variant="outline"
                onClick={() => {
                  setPhase('browse');
                  setBrowseState('questions');
                }}>
                &larr; Zpět
              </Button>
            </div>
          )}
          <section className={clsx(
            "grid gap-8 transition-all duration-300",
            isAiTutorCollapsed
              ? "lg:grid-cols-[1fr_auto]"
              : "lg:grid-cols-[minmax(0,1fr)_320px]"
          )}>
            <main className="space-y-6">
              {examMode && (
                <header className="space-y-3">
                  <ul className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {questions.map((questionItem, idx) => {
                      const isAnswered = responses.hasOwnProperty(questionItem.id);
                      const isCurrent = idx === current;
                      return (
                        <Button
                          key={`nav-${idx}`}
                          variant={isCurrent ? "default" : isAnswered ? "secondary" : "outline"}
                          size="sm"
                          className={clsx(
                            "h-8 w-8 rounded-full text-sm font-medium border",
                            {
                              "bg-slate-600 hover:bg-slate-700 text-white border-slate-600": isAnswered && !isCurrent,
                              "border-blue-500 ring-2 ring-blue-500 ring-offset-1": isCurrent,
                              "bg-white hover:bg-slate-100 text-slate-700 border-slate-300": !isAnswered && !isCurrent,
                            }
                          )}
                          onClick={() => setCurrent(idx)}
                        >
                          {idx + 1}
                        </Button>
                      );
                    })}
                  </ul>
                  <div className="h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-neutral-600">
                    {answeredCount} / {questions.length} hotovo
                  </p>
                </header>
              )}
              {!examMode && <Progress value={progress} className="mb-4 h-2" />}

              <Card className="w-full rounded-xl border border-neutral-200 bg-white shadow-sm p-5 sm:p-6 space-y-6">
                <CardHeader className="p-0">
                  <div className="text-sm text-gray-500">
                    Otázka {current + 1} / {questions.length}
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mt-1" style={{ lineHeight: '1.4' }}>
                    {q.otazka}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({q.points} {q.points === 1 ? "bod" : q.points <= 4 ? "body" : "bodů"}){" "}
                      {GROUPS.find((g) => g.id === q.groupId)?.name}
                    </span>
                  </h3>
                </CardHeader>
                <CardContent className="p-0">
                  {q.obrazek && (
                    q.obrazek.endsWith('.mp4')
                      ? <video src={q.obrazek} autoPlay loop muted playsInline controls className="my-3 rounded max-h-48 md:max-h-64 mx-auto shadow-md" />
                      : <img src={q.obrazek} alt="Dopravní situace" className="my-3 rounded max-h-48 md:max-h-64 mx-auto shadow-md" />
                  )}
                  <RadioGroup
                    key={q.id}
                    value={responses[q.id]?.toString() ?? ''}
                    onValueChange={(valStr) => {
                      const val = parseInt(valStr);
                      const isCorrect = val === q.spravna;

                      // Zaznamenat první pokus pro statistiky procvičování
                      if (!examMode && !practiceFirstAttempts[q.id]) {
                        setPracticeFirstAttempts(prev => ({
                          ...prev,
                          [q.id]: { firstAttemptIndex: val, isFirstAttemptCorrect: isCorrect }
                        }));
                      }
                      
                      // Zaznamenat data pro podrobnou analýzu (pouze při prvním pokusu v sezení)
                      if (!sessionAnalysis[q.id]) {
                        const timeToAnswer = Date.now() - questionStartTime;
                        setSessionAnalysis(prev => ({
                          ...prev,
                          [q.id]: { timeToAnswer, firstAttemptCorrect: isCorrect }
                        }));
                      }

                      // Vždy aktualizovat finální odpověď
                      setResponses(prev => ({ ...prev, [q.id]: val }));
                    }}
                    className="mt-4 flex flex-col gap-4"
                  >
                    {q.moznosti.map((opt, idx) => {
                      const isSelected = responses[q.id] === idx;
                      const isCorrect = idx === q.spravna;
                      const anAnswerIsSelectedForThisQuestion = responses[q.id] !== undefined;

                      let itemSpecificClasses = "";
                      if (!examMode && anAnswerIsSelectedForThisQuestion) {
                        if (isCorrect) {
                          itemSpecificClasses = "bg-green-50 border-green-400 text-green-700";
                        }
                        if (isSelected && !isCorrect) {
                          itemSpecificClasses = "bg-red-50 border-red-400 text-red-700";
                        }
                      }

                      return (
                        <div
                          key={idx}
                          className={clsx(
                            "flex items-start gap-3 p-3 border rounded-md transition-colors cursor-pointer",
                            itemSpecificClasses,
                            !itemSpecificClasses && "hover:bg-gray-50"
                          )}
                        >
                          <RadioGroupItem value={idx.toString()} id={`opt-${q.id}-${idx}`} className="mt-1" />
                          <label htmlFor={`opt-${q.id}-${idx}`} className="flex-1 text-sm md:text-base cursor-pointer flex items-center justify-between w-full">
                            {/\.(jpeg|jpg|gif|png)$/i.test(opt)
                              ? <img src={opt} alt={`Možnost ${idx + 1}`} className="my-2 rounded max-h-48 md:max-h-60 shadow"/>
                              : <span>{opt}</span>
                            }
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
                <div className="flex-1"></div> {/* Prázdný div pro zarovnání doleva */}
                <div className="flex items-center gap-2 justify-center">
                  <Button variant="outline" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>
                    Předchozí
                  </Button>
                  {current < questions.length - 1 ? (
                    <Button variant="outline" onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}>
                      Další
                    </Button>
                  ) : (
                    originPhase !== 'browse' &&
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
                <div className="flex-1 flex justify-end">
                  {!examMode && originPhase !== 'browse' && (
                     <Button
                      variant="outline"
                      onClick={() => {
                        commitSessionAnalysis(); // Uložíme data i při předčasném ukončení
                        calculateAndSavePracticeStats();
                        setPhase("intro");
                      }}>
                      Ukončit
                    </Button>
                  )}
                </div>
              </div>
            </main>

            <aside className={clsx(
              "flex flex-col rounded-lg border border-neutral-200 bg-sky-50/50 h-fit lg:sticky lg:top-28 transition-all duration-300 ease-in-out",
              isAiTutorCollapsed ? "p-2" : "p-4 sm:p-5"
            )}>
              <div className="flex items-center justify-between pb-2 border-b">
                <h3 className={clsx("font-medium", { "hidden": isAiTutorCollapsed })}>Zeptat se AI lektora</h3>
                <Button variant="ghost" size="icon" onClick={() => setIsAiTutorCollapsed(prev => !prev)} className="shrink-0 -mr-2">
                  {isAiTutorCollapsed ? <PanelRightOpen size={18} /> : <PanelLeftClose size={18} />}
                </Button>
              </div>
              <div className={clsx("space-y-4", { "hidden": isAiTutorCollapsed })}>
                <div className="flex-1 overflow-y-auto p-2 space-y-2 text-sm max-h-[60vh]">
                {messages.map((msg: ChatMessage, i: number) => (
                  <div key={i} className={clsx("p-2.5 rounded-lg shadow-sm max-w-[90%]", msg.role === "assistant" ? "bg-blue-100 self-start" : "bg-green-100 self-end ml-auto")}>
                    {msg.text.split('\n').map((line: string, j: number) => {
                      const isImageUrl = /\.(jpeg|jpg|gif|png)$/i.test(line.trim());
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
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Napište dotaz..."
                    rows={2}
                    className="flex-1 text-sm resize-none"
                    onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }}}
                    disabled={aiLoading}
                  />
                  <Button onClick={sendMsg} size="icon" disabled={!draft.trim()} isLoading={aiLoading}>
                    <Send size={16} />
                  </Button>
                </div>
              </div>
            </div>
            </aside>
          </section>
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
        {passed && <Confetti recycle={false} />}
        <TopNav 
          label="Výsledky testu" 
          showStats={true} 
          onResetStats={handleResetStats} 
          onHome={() => setPhase("intro")}
          currentUser={currentUser}
          onSetCurrentUser={handleLogout}
        />
        <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6 text-center">
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
                  {q_item.obrazek && (
                    q_item.obrazek.endsWith('.mp4')
                      ? <video src={q_item.obrazek} autoPlay loop muted playsInline controls className="my-2 rounded max-h-48 md:max-h-60 mx-auto shadow" />
                      : <img src={q_item.obrazek} alt={`Otázka ${index + 1}`} className="my-2 rounded max-h-48 md:max-h-60 mx-auto shadow"/>
                  )}
                  <p className="mt-1">Správná odpověď: {
                    /\.(jpeg|jpg|gif|png)$/i.test(q_item.moznosti[q_item.spravna])
                    ? <img src={q_item.moznosti[q_item.spravna]} alt="Správná odpověď" className="my-2 rounded max-h-48 md:max-h-60 shadow"/>
                    : <span className="font-semibold">{q_item.moznosti[q_item.spravna]}</span>
                  }</p>
                  {isAnswered ? (
                    <p className="mt-0.5">Vaše odpověď: {
                      /\.(jpeg|jpg|gif|png)$/i.test(q_item.moznosti[userAnswer])
                      ? <img src={q_item.moznosti[userAnswer]} alt="Vaše odpověď" className="my-2 rounded max-h-48 md:max-h-60 shadow"/>
                      : <span className={clsx(isCorrect ? "text-green-700" : "text-red-700", "font-semibold")}>{q_item.moznosti[userAnswer]}</span>
                    } {isCorrect ? "✓" : "✗"}</p>
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
