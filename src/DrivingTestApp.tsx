import { useEffect, useMemo, useRef, useState } from "react";
import Confetti from "react-confetti";
import { useAuth } from "./Auth";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import { supabase } from './supabase';
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { CircularProgress } from "@/src/components/ui/circular-progress";
import { Textarea } from "@/components/ui/textarea";
import { Send, BarChart2, RefreshCcw, CheckCircle2, XCircle, User, LogOut, Book, Library, FileText, PanelLeftClose, PanelRightOpen, Car, TrafficCone, Shield, GitFork, Wrench, HeartPulse, Moon, Sun, Settings, Trash2, Download, Expand, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { QuestionImage } from "@/src/components/QuestionImage";
import { useTheme } from "@/src/hooks/useTheme";
import clsx from "clsx";
import { useAi, ChatMessage } from "@/src/hooks/useAi";
import { UnlockedBadge } from "@/src/badges";
import { BadgesDisplay } from "@/src/components/Badges";
import WeakestTopics from "./components/WeakestTopics";
import { MistakesOverview } from "./components/MistakesOverview";
import { db, Event as DbEvent, cleanupExpiredEvents } from "@/src/db";
import { getGuestSessionId } from "@/src/session";
import { Stats, DEFAULT_STATS, getTodayDateString, DEFAULT_PROGRESS_STATS } from "@/src/dataModels";
import { calculateGuestStats } from "@/src/guestStats";
import AnalysisWorker from "@/src/workers/analysis.worker.ts?worker";
import { QRCodeCanvas } from 'qrcode.react';

/* ----------------------- Data typy a konstanty ---------------------- */
export type Question = {
  id: string;
  otazka: string;
  obrazek?: string;
  moznosti: string[];
  spravna: number;
  points: number;
  groupId: number;
  id_otazky?: string; // Přidáno pro kompatibilitu s daty ze serveru
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
  answerIndex: number; // Index odpovědi, kterou uživatel zvolil
  selectedAnswer?: number;
  mode: 'exam' | 'practice';
  isCorrection?: boolean; // Jedná se o pokus o opravu?
};

// Nový typ pro ukládání detailů o odpovědi v režimu procvičování
type PracticeAttempt = {
  firstAttemptIndex: number;      // Index odpovědi při prvním pokusu
  isFirstAttemptCorrect: boolean; // Zda byl první pokus správný
  finalAttemptIndex: number;      // Index odpovědi při finálním (posledním) pokusu
  answered: true;                 // Indikátor, že na otázku bylo odpovězeno
};

type TestSession = {
  date: string;
  entries: AnalysisEntry[];
  score: number;
  totalPoints: number;
  passed: boolean;
  correctAnswers: number;
  totalQuestions: number;
  questionIds?: string[]; // Přidáno pro ukládání ID otázek
  timeSpentSeconds?: number;
};

const GROUPS = [
  { id: 1, file: "/okruh1.json", name: "Pravidla provozu", quota: 10, points: 2, Icon: Car },
  { id: 2, file: "/okruh2.json", name: "Dopravní značky", quota: 3, points: 1, Icon: TrafficCone },
  { id: 3, file: "/okruh3.json", name: "Zásady bezpečné jízdy", quota: 4, points: 2, Icon: Shield },
  { id: 4, file: "/okruh4.json", name: "Dopravní situace", quota: 3, points: 4, Icon: GitFork },
  { id: 5, file: "/okruh5.json", name: "Předpisy o vozidlech", quota: 2, points: 1, Icon: Wrench },
  { id: 6, file: "/okruh6.json", name: "Předpisy související", quota: 2, points: 2, Icon: FileText },
  { id: 7, file: "/okruh7.json", name: "Zdravotnická příprava", quota: 1, points: 1, Icon: HeartPulse },
] as const;

const OSTRY_TIME = 30 * 60; // 30 minut v sekundách

/* --------------------------- Statistiky ---------------------------- */
// Funkce saveStats a loadStats byly odstraněny, protože se statistiky počítají na serveru

/* ----------------------- Analytická data ------------------------- */
export type SummaryData = Record<string, {
    questionId: string;
    questionText: string;
    groupId: number;
    attempts: number;
    correct: number;
    totalTimeToAnswer: number;
    history: { answeredAt: string; isCorrect: boolean; timeToAnswer: number }[];
    avgTime: number;
    successRate: number;
}>;

type UserData = {
  analysisData: AnalysisEntry[];
  unlockedBadges: UnlockedBadge[];
  summaryData: SummaryData;
  allQuestions?: Question[]; // Přidáno
};

async function loadUserData(currentUser: string | null): Promise<UserData & { stats: Stats; testSessions: TestSession[]; allQuestions: Question[] }> {
  if (currentUser && currentUser !== "Host") {
    try {
      const res = await fetch(`/api/analysis-data?userId=${encodeURIComponent(currentUser)}`);
      if (!res.ok) {
        throw new Error(`Server responded with status: ${res.status}`);
      }
      const data = await res.json();
      // console.log("[DEBUG] Data received from /api/analysis-data:", JSON.stringify(data.summaryData, null, 2));
      // Map server data to frontend TestSession type to handle inconsistencies
      const mappedSessions = (data.testSessions || []).map((s: any) => {
        // Ensure date is treated as UTC. MySQL DATETIME format is 'YYYY-MM-DD HH:MM:SS'.
        // new Date() parses this as local time. To parse as UTC, we need to format it as ISO 8601 'YYYY-MM-DDTHH:MM:SSZ'.
        let dateStr = s.startedAt || s.date;
        if (dateStr && typeof dateStr === 'string' && dateStr.includes(' ') && !dateStr.endsWith('Z')) {
          dateStr = dateStr.replace(' ', 'T') + 'Z';
        }
        
        return {
          ...s,
          date: dateStr,
          totalPoints: s.maxScore || s.totalPoints,
          // Handle different possible names for the time spent field from the server robustly
          timeSpentSeconds: s.timeSpentSeconds ?? s.timeSpent ?? s.time_spent_seconds ?? s.time_spent,
        };
      });

      return {
        analysisData: data.analysisData || [],
        unlockedBadges: data.unlockedBadges || [],
        summaryData: data.summaryData || {},
        stats: data.stats || DEFAULT_STATS,
        testSessions: mappedSessions,
        allQuestions: data.allQuestions || [],
      };
    } catch (error) {
      console.error("Could not get user data from server:", error);
      return { analysisData: [], unlockedBadges: [], summaryData: {}, stats: DEFAULT_STATS, testSessions: [], allQuestions: [] };
    }
  } else {
    // Logika pro hosta - načtení z IndexedDB
    try {
      const sessionId = getGuestSessionId();
      const events = await db.events.where({ sessionId }).toArray();
      const analysisData: AnalysisEntry[] = events.map(e => ({
        user: "Host",
        questionId: e.qid,
        questionText: "", // Bude potřeba doplnit, pokud chceme plnou analýzu
        groupId: 0, // Bude potřeba doplnit
        answeredAt: new Date(e.ts).toISOString(),
        timeToAnswer: 0, // V DB zatím nemáme
        isCorrect: e.correct,
        isFirstAttemptCorrect: e.correct, // Zjednodušení prozatím
        answerIndex: 0, // V DB zatím nemáme
        mode: e.mode || 'practice', // Fallback pro stará data
      }));
      // Pro hosta načteme statistiky z lokálního úložiště
      const { stats: guestStats, summaryData: guestSummary, unlockedBadges: guestBadges } = await calculateGuestStats();
      // Host nemá server-side sessions, takže vracíme prázdné pole
      return { analysisData, unlockedBadges: guestBadges, summaryData: guestSummary, stats: guestStats, testSessions: [], allQuestions: [] };
    } catch (error) {
      console.error("Could not get user data from IndexedDB:", error);
      return { analysisData: [], unlockedBadges: [], summaryData: {}, stats: DEFAULT_STATS, testSessions: [], allQuestions: [] };
    }
  }
}

async function appendAnalysisData(
  entries: AnalysisEntry[],
  user: { id: string; email?: string } | null,
  sessionData?: { sessionId: string; score: number; maxScore: number; timeSpentSeconds: number; startedAt: string; questionIds?: string[]; status: string; }
): Promise<UnlockedBadge[]> {
  if (entries.length === 0) {
    console.log("[appendAnalysisData] No entries to append. Skipping.");
    return [];
  }

  const currentUser = user ? user.id : "Host";

  if (currentUser && currentUser !== "Host" && user) {
    try {
      console.log("[appendAnalysisData] Sending entries to /api/ingest for user", currentUser, ":", entries, "with session data:", sessionData);
      const bodyPayload = {
        entries,
        userId: user.id,
        userEmail: user.email,
        session: sessionData, // 'session' is the key expected by /api/ingest
      };
      const response = await fetch("/api/ingest", { // Use the new endpoint
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      const result = await response.json();
      // The new endpoint doesn't return badges directly, this logic might need adjustment later.
      // For now, we assume it might return something similar or we handle it differently.
      console.log("[appendAnalysisData] Successfully sent data via /api/ingest. Server response:", result);
      return result.newlyAwardedBadges || [];
    } catch (error) {
      console.error("Failed to save analysis data to server via /api/ingest:", error);
      return [];
    }
  } else {
    // Logika pro hosta - uložení do IndexedDB
    try {
      const now = Date.now();
      const ttl = 24 * 60 * 60 * 1000; // 24 hodin v ms
      const sessionId = getGuestSessionId();
      const dbEvents: DbEvent[] = entries.map(entry => ({
        ts: new Date(entry.answeredAt).getTime(),
        qid: entry.questionId,
        correct: entry.isCorrect,
        expiresAt: now + ttl,
        sessionId: sessionId,
        mode: entry.mode,
      }));
      await db.events.bulkAdd(dbEvents);
      console.log(`[appendAnalysisData] Successfully saved ${dbEvents.length} events to IndexedDB for guest session ${sessionId}.`);
    } catch (error) {
      console.error("Failed to save analysis data to IndexedDB:", error);
    }
    return []; // Pro hosta nevracíme odznaky
  }
}

/* ---------------------------- TopNav ------------------------------- */
function TopNav({
  label,
  timeLeft,
  onHome,
  currentUser,
  onSetCurrentUser,
  onOpenSettings,
  isTestView,
}: {
  label: React.ReactNode;
  timeLeft?: number | null;
  onHome: () => void;
  currentUser: string;
  onSetCurrentUser: (name?: string | null) => void;
  onOpenSettings: () => void;
  isTestView?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const mm = timeLeft !== null && timeLeft !== undefined ? Math.floor(timeLeft / 60) : null;
  const ss = timeLeft !== null && timeLeft !== undefined ? timeLeft % 60 : null;
  const timeFmt = (mm !== null && ss !== null) ? `${mm}:${ss.toString().padStart(2, "0")}` : "";
  return (
    <header className="w-full bg-background border-b shadow-sm sticky top-0 z-40">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" onClick={onHome} className="flex items-center gap-2 px-1 hover:bg-accent">
          <Book size={20} className="text-blue-600" />
          <h1 className="font-semibold text-lg select-none">Autoškola B</h1>
        </Button>
        <div className="flex-1 text-center text-sm font-medium text-muted-foreground select-none">
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
          {currentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <User size={16} />
                  <span className={clsx("text-sm font-medium", {
                    "hidden sm:inline": isTestView
                  })}>
                    {currentUser}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuItem onClick={onOpenSettings}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Nastavení</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? (
                    <>
                      <Sun className="mr-2 h-4 w-4" />
                      <span>Světlý režim</span>
                    </>
                  ) : (
                    <>
                      <Moon className="mr-2 h-4 w-4" />
                      <span>Tmavý režim</span>
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSetCurrentUser()} className="text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-500">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Odhlásit se</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

/* ----------------------------- Footer ---------------------------- */
function Footer() {
  return (
    <footer className="w-full py-4 mt-8 text-center text-xs text-muted-foreground">
      <p>© {new Date().getFullYear()} DavioCZ. Všechna práva vyhrazena.</p>
      <p>Vytvořeno pro účely autoškoly.</p>
    </footer>
  );
}

/* ----------------------------- Login Screen ------------------------ */
/* ----------------------------- App -------------------------------- */
export default function DrivingTestApp() {
  const { session, user } = useAuth();
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem("isGuest") === "true");
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isActionBarVisible, setIsActionBarVisible] = useState(false);
  const lastScrollY = useRef(0);
  const [mainEl, setMainEl] = useState<HTMLElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const [isFooterVisible, setIsFooterVisible] = useState(false);

  const currentUser = isGuest ? "Host" : user?.email || user?.id || null;
  const [phase, setPhase] = useState<"intro" | "setup" | "test" | "done" | "browse" | "analysis">("intro");
  const [browseState, setBrowseState] = useState<"groups" | "questions">("groups");
  const [originPhase, setOriginPhase] = useState<"intro" | "browse" | "analysis">("intro");
  const [mode, setMode] = useState<'exam' | 'practice'>('exam');
  const [selectedGroups, setSelected] = useState<number[]>(GROUPS.map((g) => g.id));
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [sessionAnalysis, setSessionAnalysis] = useState<Record<string, { timeToAnswer: number; firstAttemptCorrect: boolean }>>({});
  const [analysisData, setAnalysisData] = useState<AnalysisEntry[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData>({});
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<UnlockedBadge[]>([]);

  useEffect(() => {
    const loadAllQuestionsIfNeeded = async () => {
      if (allQuestions.length === 0) {
        console.log("[DataLoad] All questions are missing, loading from JSON files.");
        const allQuestionsPromises = GROUPS.map(g => fetchGroup(g.id));
        const allQuestionsArrays = await Promise.all(allQuestionsPromises);
        setAllQuestions(allQuestionsArrays.flat());
        console.log("[DataLoad] All questions loaded from JSON files.");
      }
    };

    // Načteme otázky, pokud je potřebujeme pro analýzu nebo úvodní obrazovku
    if (phase === 'analysis' || phase === 'intro') {
      loadAllQuestionsIfNeeded();
    }
  }, [phase, allQuestions.length]);
  const { ask, loading: aiLoading, messages, setMessages } = useAi();
  const [draft, setDraft] = useState("");
  const msgEndRef = useRef<HTMLDivElement | null>(null);
  const [isAiTutorCollapsed, setIsAiTutorCollapsed] = useState(false);
  const [isTestsOpen, setIsTestsOpen] = useState(true);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const { setTheme } = useTheme();
  const [transferToken, setTransferToken] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showAiTutorInExam, setShowAiTutorInExam] = useState<boolean>(() => {
    const saved = localStorage.getItem("autoskola-showAiTutorInExam");
    return saved ? JSON.parse(saved) : true;
  });
  const [autoAdvance, setAutoAdvance] = useState<boolean>(() => {
    const saved = localStorage.getItem("autoskola-autoAdvance");
    return saved ? JSON.parse(saved) : true;
  });
  const [viewedSession, setViewedSession] = useState<TestSession | null>(null);
  const [testSessions, setTestSessions] = useState<TestSession[]>([]);

  const summaryValues = Object.values(summaryData);

  const analysisByGroup = useMemo(() => GROUPS.map(group => {
    const groupSummaries = summaryValues.filter(summary => summary.groupId === group.id);
    const totalAttempts = groupSummaries.reduce((sum, s) => sum + s.attempts, 0);
    if (totalAttempts === 0) {
      return { ...group, total: 0, successRate: 0, avgTime: 0 };
    }
    const totalCorrect = groupSummaries.reduce((sum, s) => sum + s.correct, 0);
    const totalTime = groupSummaries.reduce((sum, s) => sum + s.totalTimeToAnswer, 0);
    
    return {
      ...group,
      total: totalAttempts,
      successRate: (totalCorrect / totalAttempts) * 100,
      avgTime: totalTime / totalAttempts / 1000, // v sekundách
    };
  }), [summaryValues]);

  const startPracticeFromMistakeIds = async (questionIds: string[]) => {
    if (questionIds.length === 0) {
      alert("Nemáte žádné otázky k procvičení. Skvělá práce!");
      return;
    }
    
    setIsLoading(true);
    const allQuestionsPromises = GROUPS.map(g => fetchGroup(g.id));
    const allQuestionsArrays = await Promise.all(allQuestionsPromises);
    const allQuestions = allQuestionsArrays.flat();
    
    let questionsForPractice = allQuestions.filter(q => questionIds.includes(q.id));
    
    // Shuffle
    for (let i = questionsForPractice.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questionsForPractice[i], questionsForPractice[j]] = [questionsForPractice[j], questionsForPractice[i]];
    }

    await initiateTest('practice', [], questionsForPractice);
    setIsLoading(false);
  };

  useEffect(() => {
    localStorage.setItem("autoskola-showAiTutorInExam", JSON.stringify(showAiTutorInExam));
  }, [showAiTutorInExam]);

  useEffect(() => {
    localStorage.setItem("autoskola-autoAdvance", JSON.stringify(autoAdvance));
  }, [autoAdvance]);

  useEffect(() => {
    // Inicializujeme Web Worker pro zpracování na pozadí pro hosty
    const worker = new AnalysisWorker();
    console.log("[DrivingTestApp] Analysis worker started for guest data processing.");

    // Spustíme úklid starých dat pro hosty
    cleanupExpiredEvents();

    // Uklidíme worker, když se komponenta odpojí
    return () => {
      worker.terminate();
      console.log("[DrivingTestApp] Analysis worker terminated.");
    };
  }, []);

  const handleLoginAsGuest = () => {
    localStorage.setItem("isGuest", "true");
    setIsGuest(true);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
    }
    localStorage.removeItem("isGuest");
    setIsGuest(false);
  };

  // Efekt pro načítání všech dat při vstupu na hlavní obrazovku
  useEffect(() => {
    const currentUserId = user ? user.id : "Host";
    if (phase !== 'intro' || !currentUserId) {
      return; // Spouštět pouze na úvodní obrazovce, když je znám uživatel/host
    }

    console.log(`[DataLoad] Zahajuji načítání dat pro ${currentUserId}.`);

    // Nejdříve načteme hlavní data uživatele
    loadUserData(currentUserId).then(data => {
      setAnalysisData(data.analysisData);
      setUnlockedBadges(data.unlockedBadges);
      setSummaryData(data.summaryData);
      setStats(data.stats);
      setTestSessions(data.testSessions); // Nastavíme sessions ze serveru
      if (data.allQuestions && data.allQuestions.length > 0) {
        setAllQuestions(data.allQuestions); // Uložíme všechny otázky
      }
      console.log(`[DataLoad] Data pro ${currentUserId} byla načtena.`);
    });
  }, [user, phase]);

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

  const initiateTest = async (newMode: 'exam' | 'practice', groups: number[], questionsOverride?: Question[]) => {
    setIsLoading(true);
    try {
      setOriginPhase("intro");
      setMode(newMode);
      const qs = questionsOverride ?? (newMode === 'exam' ? await buildExam() : await buildPractice(groups));
      setQuestions(qs);
      setCurrent(0);
      setResponses({});
      setSessionAnalysis({});
      setPhase("test");
      setTimeLeft(newMode === 'exam' ? OSTRY_TIME : null);
    } catch (error) {
        console.error("Failed to initiate test:", error);
        alert("Nepodařilo se načíst otázky. Zkuste to prosím znovu.");
        setPhase("intro"); // Go back to intro screen on failure
    } finally {
      setIsLoading(false);
    }
  };

  const startTest = async () => {
    await initiateTest(mode, selectedGroups);
  };

  useEffect(() => {
    if (phase !== 'test' || timeLeft === null) return;
    if (timeLeft <= 0) {
      finishExam('timeup');
      return;
    }
    const id = setInterval(() => setTimeLeft((t) => (t !== null ? t - 1 : null)), 1000);
    return () => clearInterval(id);
  }, [timeLeft, phase]);

  async function commitSessionAnalysis(reason: 'manual' | 'timeup' | 'aborted' = 'manual') {
    console.log(`[commitSessionAnalysis] Starting with reason: ${reason}.`);
    const entries: AnalysisEntry[] = [];
    const answeredQuestionIds = Object.keys(responses);
    const currentUserId = user ? user.id : "Host";
    
    // Ponecháme logiku pro odeslání, i když je pole `entries` prázdné,
    // protože potřebujeme zaznamenat samotné dokončení session.
    if (mode === 'practice' && answeredQuestionIds.length === 0) {
        console.log("[commitSessionAnalysis] No questions answered in practice mode, skipping commit.");
        return;
    }

    for (const qId of answeredQuestionIds) {
      const question = questions.find(q => q.id === qId);
      const sessionData = sessionAnalysis[qId];
      const finalAnswerIndex = responses[qId];

      if (!question || !sessionData) {
        console.warn(`[/commit] SKIPPING: Missing data for question id: ${qId}`);
        continue;
      }

      entries.push({
        user: currentUserId,
        questionId: qId,
        questionText: question.otazka,
        groupId: question.groupId,
        answeredAt: new Date().toISOString(),
        timeToAnswer: sessionData.timeToAnswer,
        isFirstAttemptCorrect: sessionData.firstAttemptCorrect,
        isCorrect: finalAnswerIndex === question.spravna,
        answerIndex: finalAnswerIndex,
        selectedAnswer: finalAnswerIndex,
        mode: mode,
      });
    }

    let sessionDataPayload: { sessionId: string; score: number; maxScore: number; timeSpentSeconds: number; startedAt: string; questionIds: string[]; status: string; } | undefined;

    // Session se ukládá pouze pro ostré testy
    if (mode === 'exam') {
      const score = questions.reduce((acc, q) => (responses[q.id] === q.spravna ? acc + q.points : acc), 0);
      const maxScore = questions.reduce((acc, q) => acc + q.points, 0);
      const timeSpentSeconds = OSTRY_TIME - (timeLeft ?? 0);
      const startedAt = new Date(Date.now() - timeSpentSeconds * 1000).toISOString();

      const statusMap = {
        manual: 'dokončený',
        timeup: 'nestihnutý',
        aborted: 'nedokončený',
      };

      const allQuestionIds = questions.map(q => q.id);
      sessionDataPayload = {
        sessionId: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        score,
        maxScore,
        timeSpentSeconds,
        startedAt,
        questionIds: allQuestionIds,
        status: statusMap[reason],
      };

      // Přidáme speciální záznam o ukončení session
      entries.push({
        user: currentUserId,
        questionId: `SESSION_END_${sessionDataPayload.sessionId}`,
        questionText: 'Session End Marker',
        groupId: -1,
        answeredAt: new Date().toISOString(),
        timeToAnswer: 0,
        isCorrect: false,
        isFirstAttemptCorrect: false,
        answerIndex: -1,
        mode: mode,
      });
    }

    console.log("[commitSessionAnalysis] Compiled entries:", entries);
    console.log("[commitSessionAnalysis] Session payload:", sessionDataPayload);

    const newBadges = await appendAnalysisData(entries, user, sessionDataPayload);
    if (newBadges.length > 0) {
      setUnlockedBadges(prev => [...prev, ...newBadges]);
      alert(`Získali jste ${newBadges.length} nových odznaků!`);
    }
  }

  const endPracticeAndGoHome = async () => {
    // V režimu procvičování se data ukládají průběžně, takže zde není potřeba volat commit.
    // Jen znovu načteme data pro jistotu, kdyby se něco změnilo.
    const currentUserId = user ? user.id : "Host";
    const data = await loadUserData(currentUserId);
    setAnalysisData(data.analysisData);
    setUnlockedBadges(data.unlockedBadges);
    setSummaryData(data.summaryData);
    setStats(data.stats);
    setViewedSession(null); // Reset viewed session
    setPhase("intro");
  };

  async function finishExam(reason: 'manual' | 'timeup' | 'aborted' = 'manual') {
    setViewedSession(null); // Reset viewed session, we are finishing a live one
    
    // Ukládáme session pouze pro ostrý test. Procvičování se ukládá průběžně.
    if (mode === 'exam') {
      await commitSessionAnalysis(reason);
    }

    // Po odeslání dat znovu načteme všechna data, abychom měli aktuální stav
    const currentUserId = user ? user.id : "Host";
    const data = await loadUserData(currentUserId);
    setAnalysisData(data.analysisData);
    setUnlockedBadges(data.unlockedBadges);
    setSummaryData(data.summaryData);
    setStats(data.stats);
    setPhase("done");
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
    const currentUserId = user ? user.id : "Host";
    if (phase === 'analysis' && currentUserId) {
        loadUserData(currentUserId).then(data => {
          setAnalysisData(data.analysisData);
          setUnlockedBadges(data.unlockedBadges);
          setSummaryData(data.summaryData);
        });
    }
  }, [phase, user]);

  useEffect(() => {
    if (phase === "test") {
        setMessages([{ role: "assistant", text: `Jsem připraven zodpovědět tvé dotazy k otázce.` }]);
        setDraft("");
    } else if (phase === "intro" || phase === "setup") {
        setMessages([{ role: "assistant", text: "Ahoj! Zeptej se na cokoliv k testu nebo si vyber režim." }]);
    }
  }, [q, phase, setMessages]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFooterVisible(entry.isIntersecting);
      },
      { root: mainEl, threshold: 0.1 }
    );

    const currentFooterRef = footerRef.current;
    if (phase === 'done' && currentFooterRef) {
      observer.observe(currentFooterRef);
    }

    return () => {
      if (currentFooterRef) {
        observer.unobserve(currentFooterRef);
      }
    };
  }, [phase, mainEl]);

  useEffect(() => {
    if (phase === 'done' && mainEl) {
      const handleScroll = () => {
        const { scrollTop } = mainEl;
        
        if (scrollTop > lastScrollY.current && scrollTop > 50) {
          setIsActionBarVisible(true);
        } else if (scrollTop < lastScrollY.current) {
          setIsActionBarVisible(false);
        }
        
        lastScrollY.current = scrollTop <= 0 ? 0 : scrollTop;
      };

      const timeoutId = setTimeout(() => {
        if (mainEl.scrollHeight <= mainEl.clientHeight) {
          setIsActionBarVisible(false);
          setIsFooterVisible(true);
        } else {
          setIsFooterVisible(false);
        }
        lastScrollY.current = mainEl.scrollTop;
      }, 100);
      
      mainEl.addEventListener('scroll', handleScroll, { passive: true });

      return () => {
        clearTimeout(timeoutId);
        mainEl.removeEventListener('scroll', handleScroll);
      };
    } else {
      setIsActionBarVisible(false);
      setIsFooterVisible(false);
    }
  }, [phase, mainEl]);

  if (!session && !isGuest) {
    if (authMode === 'signup') {
      return <SignUp onSwitchToLogin={() => setAuthMode('login')} />;
    }
    return <Login onLogin={handleLoginAsGuest} onSwitchToSignUp={() => setAuthMode('signup')} />;
  }

  const SettingsModal = () => (
    isSettingsOpen && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setIsSettingsOpen(false)}>
        <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <CardHeader>
            <h3 className="text-lg font-semibold">Nastavení</h3>
            <p className="text-sm text-muted-foreground">Správa vašich dat a předvoleb.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={() => window.location.href = `/api/export-data?userId=${encodeURIComponent(user!.id)}`}
            >
              <Download size={16} />
              Stáhnout moje data (JSON)
            </Button>
            <Button 
              variant="destructive" 
              className="w-full justify-start gap-2"
              onClick={async () => {
                if (confirm("Opravdu si přejete trvale smazat veškerá vaše analytická data? Tato akce je nevratná.")) {
                  try {
                    const response = await fetch('/api/reset-analysis', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: user!.id }),
                    });
                    if (!response.ok) throw new Error('Server error');
                    alert('Vaše data byla úspěšně smazána.');
                    // Reset local state
                    setAnalysisData([]);
                          setUnlockedBadges([]);
                          setSummaryData({});
                          setStats(DEFAULT_STATS); // Reset stats to default
                          setIsSettingsOpen(false);
                        } catch (error) {
                    alert('Došlo k chybě při mazání dat. Zkuste to prosím znovu.');
                    console.error('Failed to delete analysis data:', error);
                  }
                }
              }}
            >
              <Trash2 size={16} />
              Vymazat analytická data
            </Button>
            <div className="flex items-center justify-between pt-4 border-t">
              <label
                htmlFor="ai-tutor-exam"
                className="text-sm font-medium leading-none"
              >
                AI lektor v ostrém testu
              </label>
              <Switch
                id="ai-tutor-exam"
                checked={showAiTutorInExam}
                onCheckedChange={(checked: boolean) => setShowAiTutorInExam(checked)}
              />
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <label
                htmlFor="auto-advance"
                className="text-sm font-medium leading-none"
              >
                Automatický přechod na další otázku (v ostrém testu)
              </label>
              <Switch
                id="auto-advance"
                checked={autoAdvance}
                onCheckedChange={(checked: boolean) => setAutoAdvance(checked)}
              />
            </div>
            <Button variant="secondary" className="w-full mt-4" onClick={() => setIsSettingsOpen(false)}>
              Zavřít
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  );

  if (phase === "intro") {
    if (!currentUser) return null; // Or a loading spinner
    return (
      <>
        <TopNav 
          label={<span className="hidden md:inline">Vítejte</span>}
          onHome={() => setPhase("intro")}
          currentUser={currentUser}
          onSetCurrentUser={handleLogout}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6 space-y-6 flex flex-col min-h-[calc(100vh-61px)]">
          <div className="flex-grow">
            <SettingsModal />
            <div className="text-center py-10 md:py-12">
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
              Otestujte si své znalosti
            </h1>
            <p className="mt-4 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
              Připravte se na zkoušky v autoškole.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Button size="lg" className="w-full h-auto py-8 text-lg flex-col bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg" onClick={() => { setMode('exam'); setPhase("setup"); }}>
              <div className="flex items-center">
                <span className="text-2xl mr-3">⏱️</span>
                <span className="font-bold">Ostrý test</span>
              </div>
              <span className="font-normal text-sm text-primary-foreground/80 mt-1.5">Časomíra, 25 otázek, 50 bodů</span>
            </Button>
            <Button size="lg" variant="outline" className="w-full h-auto py-8 text-lg flex-col border-2" onClick={() => { setMode('practice'); setPhase("setup"); }}>
               <div className="flex items-center">
                <span className="text-2xl mr-3">📚</span>
                <span className="font-semibold">Procvičování</span>
              </div>
              <span className="font-normal text-sm text-muted-foreground mt-1.5">Vlastní výběr okruhů</span>
            </Button>
            <div className="md:col-span-2">
              <Button size="lg" variant="secondary" className="w-full h-auto py-6 text-base flex-col" onClick={() => { setPhase("browse"); setBrowseState("groups"); }}>
                  <div className="flex items-center">
                      <Library className="mr-2 h-5 w-5" />
                      <span className="font-semibold">Prohlížení otázek</span>
                  </div>
                  <span className="font-normal text-sm text-muted-foreground mt-1">Zobrazit všechny otázky podle okruhů</span>
              </Button>
            </div>
            <div className="md:col-span-2 relative overflow-hidden">
                {currentUser === "Host" && (
                    <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
                        <p className="text-6xl font-black text-blue-500/10 dark:text-blue-400/10 transform -rotate-12 select-none">Test funkcí</p>
                    </div>
                )}
              <Button size="lg" variant="secondary" className="w-full h-auto py-6 text-base flex-col" onClick={() => { setPhase("analysis"); }}>
                  <div className="flex items-center">
                      <FileText className="mr-2 h-5 w-5" />
                      <span className="font-semibold">Podrobná analýza</span>
                  </div>
                  <span className="font-normal text-sm text-muted-foreground mt-1">Zjistěte, kde děláte nejvíce chyb</span>
              </Button>
            </div>
          </div>

          {/* Spaced Repetition a Slabá místa */}
          <div className="mt-8 max-w-2xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="relative overflow-hidden">
                  {currentUser === "Host" && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-5xl font-black text-blue-500/10 dark:text-blue-400/10 transform -rotate-12 select-none">Test funkcí</p>
                    </div>
                  )}
                  <CardHeader>
                      <h3 className="font-semibold">Balíček na dnes <span className="text-xs font-normal text-muted-foreground">(Mimo provoz)</span></h3>
                  </CardHeader>
                  <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                          Tato funkce se připravuje. Brzy zde najdete automaticky vybrané otázky k opakování.
                      </p>
                      <Button className="w-full" disabled={true}>
                          Spustit opakování
                      </Button>
                  </CardContent>
              </Card>
              <div className="relative overflow-hidden">
                {currentUser === "Host" && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-5xl font-black text-blue-500/10 dark:text-blue-400/10 transform -rotate-12 select-none">Test funkcí</p>
                    </div>
                )}
                <WeakestTopics 
                  summaryData={summaryData} 
                  onPracticeTopic={async (groupId: number) => {
                    setIsLoading(true);
                    await initiateTest('practice', [groupId]);
                    setIsLoading(false);
                  }} 
                />
              </div>
          </div>

          <div className="mt-16">
            <h3 className="text-xl font-bold text-center mb-6 flex items-center justify-center gap-2">
              <BarChart2 size={24} className="text-primary" />
              Dnešní pokrok
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <h4 className="font-semibold text-lg">Ostré testy (dnes)</h4>
                </CardHeader>
                <CardContent>
                  {stats.today.examTaken === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Dnes jste ještě nezkoušeli žádný ostrý test.</p>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 mt-2">
                      <CircularProgress value={(stats.today.examPassed / stats.today.examTaken) * 100} size={100} strokeWidth={10} />
                      <p className="text-sm text-muted-foreground mt-2">
                        Úspěšnost dnes: {stats.today.examPassed} / {stats.today.examTaken}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <h4 className="font-semibold text-lg">Procvičování (dnes)</h4>
                </CardHeader>
                <CardContent>
                  {stats.today.practiceAnswered === 0 ? (
                     <p className="text-sm text-muted-foreground text-center py-4">Dnes jste ještě nic neprocvičovali.</p>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 mt-2">
                      <CircularProgress value={(stats.today.practiceCorrect / stats.today.practiceAnswered) * 100} size={100} strokeWidth={10} />
                      <p className="text-sm text-muted-foreground mt-2">
                        Správnost dnes: {stats.today.practiceCorrect} / {stats.today.practiceAnswered}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="mt-12 text-left bg-muted/50">
              <CardHeader><h3 className="font-semibold">Celkové statistiky</h3></CardHeader>
              <CardContent className="text-sm space-y-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                <div>
                  <h4 className="font-medium text-xs text-muted-foreground uppercase">Ostré testy (celkem)</h4>
                  <p>Absolvováno: <span className="font-medium">{stats.total.examTaken}</span></p>
                  <p>Úspěšně složeno: <span className="font-medium">{stats.total.examPassed}</span></p>
                  <p>Průměrné skóre: <span className="font-medium">{stats.examAvgScore > 0 ? stats.examAvgScore.toFixed(1) : "0.0"} / 50</span></p>
                  <p>Průměrný čas: <span className="font-medium">{stats.examAvgTime > 0 ? `${Math.floor(stats.examAvgTime / 60)}m ${Math.round(stats.examAvgTime % 60)}s` : "0m 0s"}</span></p>
                </div>
                <div>
                  <h4 className="font-medium text-xs text-muted-foreground uppercase">Procvičování (celkem)</h4>
                  <p>Zodpovězeno otázek: <span className="font-medium">{stats.total.practiceAnswered}</span></p>
                  <p>Správně na 1. pokus: <span className="font-medium">{stats.total.practiceCorrect}</span></p>
                  {stats.total.practiceAnswered > 0 && (
                    <p>Celková úspěšnost: <span className="font-medium">{((stats.total.practiceCorrect / stats.total.practiceAnswered) * 100).toFixed(1)}%</span></p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <div className="relative overflow-hidden">
              {currentUser === "Host" && unlockedBadges.length > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-6xl font-black text-blue-500/10 dark:text-blue-400/10 transform -rotate-12 select-none">Test funkcí</p>
                  </div>
              )}
              <BadgesDisplay unlockedBadges={unlockedBadges} />
            </div>
            {currentUser === "Host" && (
              <div className="mt-8 text-center">
                <Button variant="outline" onClick={async () => {
                  const sessionId = getGuestSessionId();
                  const res = await fetch('/api/generate-transfer-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId }),
                  });
                  const { token } = await res.json();
                  setTransferToken(token);
                }}>
                  Přihlásit se a přenést data
                </Button>
              </div>
            )}
            </div>
        </div>
          {transferToken && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-8 rounded-lg text-center">
                <h3 className="text-lg font-bold mb-4">Naskenujte pro přenos dat</h3>
                <QRCodeCanvas value={transferToken} size={256} />
                <Button variant="outline" className="mt-4" onClick={() => setTransferToken(null)}>Zavřít</Button>
              </div>
            </div>
          )}
          <Footer />
        </div>
      </>
    );
  }

  if (phase === "analysis") {
    if (!currentUser) return null; // Or a loading spinner
    const getSuccessRateColor = (rate: number) => {
      if (rate >= 90) return "bg-green-500";
      if (rate >= 60) return "bg-yellow-400";
      return "bg-red-500";
    };

    const userAnalysisData = analysisData.filter(entry => entry.user === (user ? user.id : "Host"));

    return (
      <div className="flex flex-col h-screen bg-background overflow-y-hidden">
        <SettingsModal />
        <TopNav 
          label="Podrobná analýza" 
          onHome={() => setPhase("intro")}
          currentUser={currentUser}
          onSetCurrentUser={handleLogout}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
            <div className="max-w-4xl mx-auto mb-4">
              <Button variant="outline" onClick={() => setPhase("intro")}>
                  &larr; Zpět na hlavní stránku
              </Button>
            </div>
            <h2 className="text-2xl font-semibold mb-6 text-center">Podrobná analýza úspěšnosti</h2>
            {summaryValues.length === 0 ? (
              <Card className="max-w-3xl mx-auto text-center p-8">
                <CardHeader><h3 className="font-semibold text-lg">Zatím zde nic není</h3></CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Absolvujte test nebo procvičování, abychom mohli začít sbírat data pro analýzu vašeho pokroku.</p>
                  <Button className="mt-6" onClick={() => setPhase("intro")}>Zpět na hlavní stránku</Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="max-w-4xl mx-auto">
                <CardHeader>
                  <h3 className="font-semibold text-lg">Přehled podle okruhů</h3>
                  <p className="text-sm text-muted-foreground">Údaje jsou založeny na správnosti vaší první odpovědi.</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-3 font-medium">Okruh</th>
                          <th className="p-3 font-medium text-center">Úspěšnost</th>
                          <th className="p-3 font-medium text-center">Průměrný čas</th>
                          <th className="p-3 font-medium text-center">Počet odpovědí</th>
                          <th className="p-3 font-medium text-center"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysisByGroup.map(group => (
                          <tr key={group.id} className="border-b">
                            <td className="p-3 font-medium flex items-center gap-2">
                              <group.Icon size={16} className="text-muted-foreground" />
                              {group.name}
                            </td>
                            {group.total > 0 ? (
                              <>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <Progress 
                                      value={group.successRate} 
                                      className="h-3 w-16" 
                                      indicatorClassName={getSuccessRateColor(group.successRate)} 
                                    />
                                    <span>{group.successRate.toFixed(1)}%</span>
                                  </div>
                                </td>
                                <td className="p-3 text-center">{`${group.avgTime.toFixed(1)}s`}</td>
                                <td className="p-3 text-center">{group.total}</td>
                              </>
                            ) : (
                              <td colSpan={3} className="p-3 text-center text-sm text-muted-foreground italic">
                                Zatím bez odpovědí. Začněte procvičovat!
                              </td>
                            )}
                            <td className="p-3 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                onClick={async () => {
                                  await initiateTest('practice', [group.id], undefined);
                                }}
                                disabled={isLoading}
                                isLoading={isLoading}
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

            {testSessions.length > 0 && (
              <Collapsible open={isTestsOpen} onOpenChange={setIsTestsOpen} className="max-w-4xl mx-auto mt-8">
                <Card>
                  <CardHeader>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-3 cursor-pointer">
                        <h3 className="font-semibold text-lg">Přehled testů</h3>
                        <ChevronsUpDown size={18} className="text-muted-foreground transition-transform data-[state=open]:-rotate-180" />
                      </div>
                    </CollapsibleTrigger>
                    <p className="text-sm text-muted-foreground mt-1">Historie vašich pokusů v ostrém testu.</p>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="p-3 font-medium">Kdy</th>
                            <th className="p-3 font-medium text-center">Výsledek</th>
                            <th className="p-3 font-medium">Úspěšnost</th>
                            <th className="p-3 font-medium text-center">Celkový čas</th>
                            <th className="p-3 font-medium text-center">Akce</th>
                          </tr>
                        </thead>
                        <tbody>
                          {testSessions.map((session: TestSession, index: number) => (
                            <tr key={index} className="border-b">
                              <td className="p-3">
                                {new Date(session.date).toLocaleDateString('cs-CZ', {
                                  day: 'numeric', month: 'long', year: 'numeric'
                                })}
                                <span className="text-muted-foreground text-xs block">
                                  {new Date(session.date).toLocaleTimeString('cs-CZ', {
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                {session.passed ? (
                                  <span className="font-semibold text-green-600">SPLNĚNO</span>
                                ) : (
                                  <span className="font-semibold text-red-600">NESPLNĚNO</span>
                                )}
                              </td>
                              <td className="p-3">
                                <span className="font-mono">{session.score} bodů = {session.totalPoints > 0 ? Math.round((session.score / session.totalPoints) * 100) : 0}%</span>
                                <span className="text-muted-foreground text-xs block">({session.correctAnswers} z {session.totalQuestions})</span>
                              </td>
                              <td className="p-3 text-center font-mono">
                                {typeof session.timeSpentSeconds === 'number' ? (
                                  <span>{Math.floor(session.timeSpentSeconds / 60)}m {session.timeSpentSeconds % 60}s</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  disabled={isLoading}
                                  isLoading={isLoading}
                                  onClick={async () => {
                                    setIsLoading(true);
                                    // 1. Načteme všechny otázky, abychom měli kompletní data
                                    const allQuestionsPromises = GROUPS.map(g => fetchGroup(g.id));
                                    const allQuestionsArrays = await Promise.all(allQuestionsPromises);
                                    const allQuestionsMap = new Map(allQuestionsArrays.flat().map(q => [q.id, q]));

                                    // 2. Sestavíme pole otázek pro danou session s kompletními daty
                                    // Použijeme `session.questionIds`, pokud existuje, jinak fallback na starou metodu
                                    const questionIdList = (session.questionIds && session.questionIds.length > 0)
                                      ? session.questionIds
                                      : (session.entries || []).map(e => e.questionId);

                                    const questionsForSession = questionIdList
                                      .map(id => allQuestionsMap.get(id))
                                      .filter((q): q is Question => q !== undefined);

                                    if (questionsForSession.length !== questionIdList.length) {
                                      console.error("Některé otázky ze session se nepodařilo najít v aktuálních datech!", {
                                        expected: questionIdList.length,
                                        found: questionsForSession.length,
                                      });
                                      // I přesto pokračujeme s tím, co máme
                                    }

                                    setQuestions(questionsForSession);

                                    // 3. Sestavíme odpovědi pro danou session
                                    const sessionResponses = (session.entries || []).reduce((acc, e) => {
                                      // Zajistíme, že ukládáme číslo, nikoliv potenciální string z DB
                                      if (e.questionId && e.answerIndex !== undefined) {
                                        acc[e.questionId] = Number(e.answerIndex);
                                      }
                                      return acc;
                                    }, {} as Record<string, number>);
                                    setResponses(sessionResponses);
                                    
                                    // 4. Uložíme si data o prohlížené session a přepneme na obrazovku s výsledky
                                    setViewedSession(session);
                                    setOriginPhase("analysis");
                                    setMode('exam');
                                    setPhase('done');
                                    setIsLoading(false);
                                  }}
                                >
                                  Vyhodnocení
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            <MistakesOverview
              summaryData={summaryData}
              allQuestions={allQuestions}
              onStartPractice={startPracticeFromMistakeIds}
              isLoading={isLoading}
            />
          </div>
        </main>
      </div>
    );
  }

  if (phase === "browse") {
    if (!currentUser) return null; // Or a loading spinner
    const groupName = browseState === 'questions' && questions.length > 0
        ? GROUPS.find(g => g.id === questions[0].groupId)?.name
        : "okruh";

    return (
        <>
            <SettingsModal />
            <TopNav 
                label={browseState === 'groups' ? "Prohlížení: Výběr okruhu" : `Prohlížení: ${groupName}`}
                onHome={() => setPhase("intro")}
                currentUser={currentUser}
                onSetCurrentUser={handleLogout}
                onOpenSettings={() => setIsSettingsOpen(true)}
            />
            <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
                {isLoading ? (
                    <div className="text-center p-10">
                        <RefreshCcw size={32} className="text-primary animate-spin mx-auto" />
                        <p className="mt-4 text-muted-foreground">Načítám...</p>
                    </div>
                ) : browseState === 'groups' ? (
                    <>
                        <div className="max-w-3xl mx-auto mb-4">
                            <Button variant="outline" onClick={() => setPhase("intro")}>
                                &larr; Zpět na hlavní stránku
                            </Button>
                        </div>
                        <h2 className="text-2xl font-semibold mb-6 text-center">Vyberte okruh k prohlížení</h2>
                        <div className="mb-6 space-y-3 max-w-2xl mx-auto">
                            {GROUPS.map((g) => (
                                <div 
                                    key={g.id} 
                                    role="button"
                                    tabIndex={0}
                                    className="flex items-center space-x-2 p-3 border rounded-md hover:bg-muted/50 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                                    onKeyDown={async (e: React.KeyboardEvent) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setIsLoading(true);
                                        const qs = await fetchGroup(g.id);
                                        setQuestions(qs.sort((a, b) => {
                                          const idA = parseInt(a.id.replace(/\D/g, ''), 10);
                                          const idB = parseInt(b.id.replace(/\D/g, ''), 10);
                                          return idA - idB;
                                        }));
                                        setBrowseState("questions");
                                        setIsLoading(false);
                                      }
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
                                    role="button"
                                    tabIndex={0}
                                    className="p-3 border rounded-md hover:bg-muted/50 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    onClick={() => {
                                        setCurrent(index);
                                        setMode('practice'); // Use practice UI
                                        setResponses({});
                                        setOriginPhase("browse"); // Remember where we came from
                                        setTimeLeft(null); // Vynulovat časovač pro prohlížení
                                        setPhase("test");
                                    }}
                                    onKeyDown={(e: React.KeyboardEvent) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setCurrent(index);
                                        setMode('practice'); // Use practice UI
                                        setResponses({});
                                        setOriginPhase("browse"); // Remember where we came from
                                        setTimeLeft(null); // Vynulovat časovač pro prohlížení
                                        setPhase("test");
                                      }
                                    }}
                                >
                                    <p className="font-mono text-xs text-muted-foreground">ID: {q.id}</p>
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
    if (!currentUser) return null; // Or a loading spinner
    return (
      <>
        <SettingsModal />
        <TopNav 
          label={mode === 'exam' ? "Příprava na ostrý test" : "Nastavení procvičování"} 
          onHome={() => setPhase("intro")}
          currentUser={currentUser}
          onSetCurrentUser={handleLogout}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
          <div className="max-w-3xl mx-auto mb-4">
              <Button variant="outline" onClick={() => setPhase("intro")}>
                  &larr; Zpět na hlavní stránku
              </Button>
          </div>
          <h2 className="text-2xl font-semibold mb-6 text-center">{mode === 'exam' ? "Ostrý test" : "Procvičování"}</h2>
          {mode === 'practice' && (
            <div className="mb-6 space-y-3">
              <h3 className="font-medium mb-2">Vyberte okruhy otázek:</h3>
              {GROUPS.map((g) => (
                <div key={g.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-muted/50">
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
          {mode === 'exam' && (
            <p className="text-center mb-6">Test obsahuje 25 náhodně vybraných otázek ze všech okruhů. Časový limit je 30 minut. Pro úspěšné složení je potřeba získat alespoň 43 bodů z 50.</p>
          )}
          <Button 
            size="lg" 
            className="w-full mt-6" 
            onClick={startTest} 
            disabled={(mode === 'practice' && selectedGroups.length === 0) || isLoading}
            isLoading={isLoading}
          >
            {isLoading ? "Načítám otázky..." : (mode === 'exam' ? "Spustit ostrý test" : "Spustit procvičování")}
          </Button>
        </div>
      </>
    );
  }

  if (phase === "test" && q) {
    if (!currentUser) return null; // Or a loading spinner
    const answeredCount = Object.keys(responses).length;
    const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
    const isTutorVisible = mode === 'practice' || showAiTutorInExam;
    
    return (
      <div className="flex flex-col h-screen">
        <SettingsModal />
        <TopNav
          label={mode === 'exam' ? "Ostrý test" : (originPhase === 'browse' ? 'Prohlížení otázky' : 'Procvičování')}
          timeLeft={timeLeft}
          currentUser={currentUser}
          onSetCurrentUser={handleLogout}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isTestView={true}
          onHome={() => {
            if (mode === 'exam') {
              if (confirm("Opravdu chcete opustit test? Váš postup nebude uložen.")) {
                setPhase("intro");
              }
            } else {
              endPracticeAndGoHome();
            }
          }}
        />
        <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
          <div className="mb-4">
            <Button
              variant="outline"
              onClick={() => {
                if (originPhase === 'browse') {
                  setPhase('browse');
                  setBrowseState('questions');
                  return;
                }
                if (mode === 'exam') {
                  if (confirm("Opravdu chcete opustit test? Váš postup nebude uložen.")) {
                    setPhase("intro");
                  }
                } else {
                  endPracticeAndGoHome();
                }
              }}>
              &larr; {originPhase === 'browse' ? 'Zpět na výběr otázek' : 'Zpět na hlavní stránku'}
            </Button>
          </div>
          <section className={clsx(
            "grid gap-8 transition-all duration-300",
            !isTutorVisible
              ? "lg:grid-cols-1"
              : isAiTutorCollapsed
              ? "lg:grid-cols-[1fr_auto]"
              : "lg:grid-cols-[minmax(0,1fr)_320px]"
          )}>
            <main className="space-y-6 lg:pb-24">
              <div className="mx-auto w-full max-w-screen-md">
                {mode === 'exam' && (
                  <header className="space-y-3">
                  <ul className="flex flex-wrap gap-1 sm:gap-2 justify-center">
                    {questions.map((questionItem, idx) => {
                      const isAnswered = responses.hasOwnProperty(questionItem.id);
                      const isCurrent = idx === current;
                      return (
                        <Button
                          key={`nav-${idx}`}
                          variant={isCurrent ? "default" : isAnswered ? "secondary" : "outline"}
                          size="sm"
                          className={clsx(
                            "h-7 w-7 rounded-full text-xs font-medium border",
                            {
                              "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-secondary-foreground border-slate-300 dark:border-slate-600": isAnswered && !isCurrent,
                              "border-primary ring-2 ring-primary ring-offset-background": isCurrent,
                              "bg-background hover:bg-muted text-foreground": !isAnswered && !isCurrent,
                            }
                          )}
                          onClick={() => setCurrent(idx)}
                        >
                          {idx + 1}
                        </Button>
                      );
                    })}
                  </ul>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {answeredCount} / {questions.length} hotovo
                  </p>
                </header>
              )}
              {mode === 'practice' && <Progress value={progress} className="mb-4 h-2" />}

              <Card className="w-full rounded-xl p-5 sm:p-6 space-y-6">
                <CardHeader className="p-0">
                  <div className="text-sm text-muted-foreground">
                    Otázka {current + 1} / {questions.length}
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold mt-1" style={{ lineHeight: '1.4' }}>
                    {q.otazka}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({q.points} {q.points === 1 ? "bod" : q.points <= 4 ? "body" : "bodů"}){" "}
                      {GROUPS.find((g) => g.id === q.groupId)?.name}
                    </span>
                  </h3>
                </CardHeader>
                <CardContent className="p-0">
                  {q.obrazek && (
                    q.obrazek.endsWith('.mp4')
                      ? <video src={q.obrazek} autoPlay loop muted playsInline controls className="my-3 rounded max-h-64 md:max-h-80 lg:max-h-[45vh] mx-auto shadow-md" />
                      : <QuestionImage src={q.obrazek} />
                  )}
                  <RadioGroup
                    key={q.id}
                    value={responses[q.id]?.toString() ?? ''}
                    onValueChange={async (valStr) => {
                      const val = parseInt(valStr);
                      const isCorrect = val === q.spravna;
                      const isFirstAnswer = responses[q.id] === undefined;
                      const timeToAnswer = Date.now() - questionStartTime;

                      // Vždy aktualizovat finální odpověď v lokálním stavu
                      setResponses(prev => ({ ...prev, [q.id]: val }));

                      if (mode === 'practice') {
                        // V režimu procvičování okamžitě zaznamenáme odpověď
                        const entry: AnalysisEntry = {
                          user: currentUser!,
                          questionId: q.id,
                          questionText: q.otazka,
                          groupId: q.groupId,
                          answeredAt: new Date().toISOString(),
                          timeToAnswer,
                          isFirstAttemptCorrect: isCorrect,
                          isCorrect,
                          answerIndex: val,
                          selectedAnswer: val,
                          mode: 'practice',
                        };
                        
                        await appendAnalysisData([entry], user);
                        
                        // A okamžitě aktualizujeme statistiky, aby se změna projevila
                        const data = await loadUserData(currentUser);
                        setSummaryData(data.summaryData);
                        setStats(data.stats);

                      } else { // Režim 'exam'
                        // Jen si poznamenáme data pro pozdější hromadné uložení
                        if (!sessionAnalysis[q.id]) {
                          setSessionAnalysis(prev => ({
                            ...prev,
                            [q.id]: { timeToAnswer, firstAttemptCorrect: isCorrect }
                          }));
                        }
                      }

                      // Automatický přechod na další otázku POUZE při první odpovědi v ostrém testu
                      if (isFirstAnswer && phase === 'test' && autoAdvance && mode === 'exam') {
                        if (current < questions.length - 1) {
                          setTimeout(() => {
                            setCurrent(c => c + 1);
                          }, 700);
                        }
                      }
                    }}
                    className="mt-4 flex flex-col gap-4"
                  >
                    {q.moznosti.map((opt, idx) => {
                      const isSelected = responses[q.id] === idx;
                      const isCorrect = idx === q.spravna;
                      const anAnswerIsSelectedForThisQuestion = responses[q.id] !== undefined;

                      let itemSpecificClasses = "";
                      let radioItemClasses = "";
                      if (mode === 'practice' && anAnswerIsSelectedForThisQuestion) {
                        if (isCorrect) {
                          itemSpecificClasses = "bg-green-100 border-green-400 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300";
                          radioItemClasses = "text-green-600 dark:text-green-400";
                        }
                        if (isSelected && !isCorrect) {
                          itemSpecificClasses = "bg-red-100 border-red-400 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300";
                          radioItemClasses = "text-red-600 dark:text-red-400";
                        }
                      }

                      return (
                        <label
                          key={idx}
                          className={clsx(
                            "flex items-start gap-3 p-4 sm:p-3 border rounded-xl transition-colors cursor-pointer active:scale-[.98]",
                            itemSpecificClasses,
                            !itemSpecificClasses && "bg-card hover:bg-muted/50 border-border"
                          )}
                        >
                          <RadioGroupItem value={idx.toString()} id={`opt-${q.id}-${idx}`} className={clsx("mt-1 accent-indigo-500", radioItemClasses)} />
                          <div className="flex-1 text-sm leading-snug flex items-center justify-between w-full">
                            {/\.(jpeg|jpg|gif|png)$/i.test(opt)
                              ? <img src={opt} alt={`Možnost ${idx + 1}`} className="my-2 rounded max-h-32 md:max-h-48 shadow"/>
                              : <span className="text-sm leading-snug">{opt}</span>
                            }
                            {mode === 'practice' && anAnswerIsSelectedForThisQuestion && isSelected && (
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
                          </div>
                        </label>
                      );
                    })}
                  </RadioGroup>
                </CardContent>
              </Card>
              </div>
              {/* Desktop Navigation */}
              <div className="mt-6 hidden md:grid grid-cols-3 items-center gap-2">
                <div />
                <div className="flex justify-center items-center gap-2">
                  <Button variant="outline" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>
                    Předchozí
                  </Button>
                  {current < questions.length - 1 ? (
                    <Button onClick={() => setCurrent(c => c + 1)}>Další</Button>
                  ) : (
                    originPhase !== 'browse' && (
                      mode === 'exam' ? (
                        <Button onClick={() => {
                          if (confirm("Opravdu si přejete dokončit a vyhodnotit test?")) {
                            finishExam('manual');
                          }
                        }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                          Dokončit test
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => {
                            if (confirm("Opravdu si přejete dokončit a vyhodnotit procvičování?")) {
                              finishExam('manual');
                            }
                          }} 
                          className="text-primary-foreground bg-primary hover:bg-primary/90"
                        >
                          Vyhodnotit procvičování
                        </Button>
                      )
                    )
                  )}
                </div>
                <div className="flex justify-end">
                  {mode === 'practice' && (
                     <Button
                      variant="destructive"
                      onClick={endPracticeAndGoHome}>
                      Ukončit
                    </Button>
                  )}
                </div>
              </div>
            </main>

            {isTutorVisible && (
              <aside className={clsx(
                "flex flex-col rounded-lg border bg-muted/40 h-fit lg:sticky lg:top-28 transition-all duration-300 ease-in-out",
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
                    <div key={i} className={clsx("p-2.5 rounded-lg shadow-sm max-w-[90%]", msg.role === "assistant" ? "bg-accent text-accent-foreground self-start" : "bg-blue-500 text-white dark:bg-blue-600 self-end ml-auto")}>
                      {msg.text.split('\n').map((line: string, j: number) => {
                        const isImageUrl = /\.(jpeg|jpg|gif|png)$/i.test(line.trim());
                        if (isImageUrl && msg.role === "assistant") { 
                          return <img key={j} src={line.trim()} alt="Odpověď AI" className="my-2 rounded max-h-48 md:max-h-60 mx-auto shadow"/>;
                        }
                        return <p key={j} className="break-words">{line}</p>;
                      })}
                    </div>
                  ))}
                  {aiLoading && <div className="p-2.5 rounded-lg shadow-sm max-w-[90%] bg-accent text-accent-foreground self-start opacity-70">Přemýšlím...</div>}
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
            )}
          </section>
        </div>

        {/* Mobile Sticky Navigation */}
        <div className="md:hidden fixed inset-x-0 bottom-0 bg-background/80 backdrop-blur-md px-4 py-3 flex justify-between items-center gap-2 border-t border-border">
          <Button variant="outline" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>
            Předchozí
          </Button>
          
          <div className="flex-shrink-0">
            {current < questions.length - 1 ? (
              <Button onClick={() => setCurrent(c => c + 1)}>Další</Button>
            ) : (
              originPhase !== 'browse' && (
                mode === 'exam' ? (
                  <Button onClick={() => {
                    if (confirm("Opravdu si přejete dokončit a vyhodnotit test?")) {
                      finishExam('manual');
                    }
                  }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    Dokončit test
                  </Button>
                ) : (
                  <Button 
                    onClick={() => {
                      if (confirm("Opravdu si přejete dokončit a vyhodnotit procvičování?")) {
                        finishExam('manual');
                      }
                    }} 
                    className="text-primary-foreground bg-primary hover:bg-primary/90"
                  >
                    Vyhodnotit
                  </Button>
                )
              )
            )}
          </div>

          <div className="flex-shrink-0">
            {mode === 'practice' ? (
              <Button
                variant="destructive"
                size="icon"
                onClick={endPracticeAndGoHome}>
                <LogOut size={16} />
              </Button>
            ) : <div style={{ width: '40px' }} /> /* Placeholder to balance layout */}
          </div>
        </div>

        {fullscreenImage && (
          <div 
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] cursor-zoom-out"
            onClick={() => setFullscreenImage(null)}
          >
            <img 
              src={fullscreenImage} 
              alt="Fullscreen" 
              className="max-w-[95vw] max-h-[95vh] object-contain"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4 text-white hover:text-white/80"
              onClick={(e) => {
                e.stopPropagation();
                setFullscreenImage(null);
              }}
            >
              <XCircle size={32} />
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (phase === "done") {
    if (!currentUser) return null; // Or a loading spinner
    
    const cameFromAnalysis = originPhase === 'analysis';
    const backButtonText = cameFromAnalysis ? "Zpět na přehled testů" : "Zpět na hlavní stránku";
    const backButtonAction = () => {
        if (cameFromAnalysis) {
            setPhase("analysis");
        } else {
            setPhase("intro");
        }
    };

    // Pokud prohlížíme historickou session, použijeme její data. Jinak počítáme z aktuálního stavu.
    const score = viewedSession ? viewedSession.score : (mode === 'exam' ? questions.reduce((acc, qq) => (responses[qq.id] === qq.spravna ? acc + qq.points : acc), 0) : 0);
    const totalPoints = viewedSession ? viewedSession.totalPoints : (mode === 'exam' ? 50 : questions.reduce((acc, qq) => acc + qq.points, 0));
    const passed = viewedSession ? viewedSession.passed : (mode === 'exam' && score >= 43);

    const resultsByGroup = GROUPS.map(group => {
      const groupQuestions = questions.filter(q => q.groupId === group.id);
      if (groupQuestions.length === 0) {
        return null;
      }

      const answeredQuestions = groupQuestions.map(q => {
        const userAnswer = responses[q.id];
        const isAnswered = userAnswer !== undefined;
        const isCorrect = isAnswered && userAnswer === q.spravna;
        const questionIndex = questions.findIndex(qs => qs.id === q.id);
        return {
          id: q.id,
          index: questionIndex + 1,
          isCorrect,
          isAnswered,
          points: q.points,
          userAnswer,
        };
      });

      const totalPointsInGroup = groupQuestions.reduce((sum, q) => sum + q.points, 0);
      const scoredPointsInGroup = answeredQuestions.reduce((sum, aq) => (aq.isCorrect ? sum + aq.points : sum), 0);

      return {
        ...group,
        questions: answeredQuestions,
        totalPoints: totalPointsInGroup,
        scoredPoints: scoredPointsInGroup,
      };
    }).filter((g): g is NonNullable<typeof g> => g !== null);

    // Pro zobrazení výsledků aktuálního kola procvičování použijeme `sessionAnalysis`
    let answeredInCurrentPracticeSession = 0;
    let correctInCurrentPracticeSession = 0;
    if (mode === 'practice') {
        const attemptedQuestionIdsInSession = Object.keys(responses);
        answeredInCurrentPracticeSession = attemptedQuestionIdsInSession.length;
        attemptedQuestionIdsInSession.forEach(id => {
            const question = questions.find(q => q.id === id);
            if (question && responses[id] === question.spravna) {
                correctInCurrentPracticeSession++;
            }
        });
    }

    return (
      <div className="flex flex-col h-screen bg-background overflow-y-hidden">
        <SettingsModal />
        {passed && <Confetti recycle={false} />}
        <TopNav 
          label="Výsledky testu" 
          onHome={() => setPhase("intro")}
          currentUser={currentUser}
          onSetCurrentUser={handleLogout}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        <main ref={setMainEl} className="flex-1 overflow-y-auto">
          <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6 text-center">
            <div className="max-w-4xl mx-auto mb-4 text-left">
                <Button variant="outline" onClick={backButtonAction}>
                    &larr; {backButtonText}
                </Button>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              {mode === 'exam' ? (passed ? "Gratulujeme, uspěli jste!" : "Bohužel, neuspěli jste.") : "Procvičování dokončeno"}
            </h2>
            {mode === 'exam' && (
              <>
                <div className="text-lg md:text-xl mb-2">
                  Získali jste <span className="font-bold">{score}</span> z {totalPoints > 0 ? totalPoints : 50} bodů. (Minimum pro úspěch: 43 bodů)
                </div>
              </>
            )}
            {mode === 'practice' && (
              <div className="text-lg md:text-xl mb-6">
                V tomto kole procvičování jste odpověděli na {answeredInCurrentPracticeSession} otázek, z toho {correctInCurrentPracticeSession} správně na první pokus.
                {answeredInCurrentPracticeSession > 0 && (
                  <span> (Úspěšnost na první pokus: {((correctInCurrentPracticeSession / answeredInCurrentPracticeSession) * 100).toFixed(1)}%)</span>
                )}
              </div>
            )}

            {mode === 'exam' && (
              <div className="my-8 text-left">
                <div className="relative pt-5 pb-8 mb-4">
                  <div className="flex justify-between text-sm text-muted-foreground mb-1 absolute w-full -top-0 px-1">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                  <div className="relative">
                    <Progress
                      value={(score / (totalPoints > 0 ? totalPoints : 50)) * 100}
                      className="h-6 border-2 border-border bg-muted"
                      indicatorClassName={passed ? "bg-green-500" : "bg-destructive"}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-bold text-sm text-foreground">
                        {((score / (totalPoints > 0 ? totalPoints : 50)) * 100).toFixed(0)}% ({score} bodů)
                      </span>
                    </div>
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-foreground/80"
                      style={{ left: `86%` }}
                      title="Minimální hranice pro úspěch (86%)"
                    >
                      <div
                        className="absolute -bottom-6 text-xs text-foreground/80 font-semibold"
                        style={{ transform: 'translateX(-50%)' }}
                      >
                        86%
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-4">Přehled podle okruhů</h3>
                <div className="space-y-3">
                  {resultsByGroup.map(group => (
                    <div key={group.id} className="bg-card border p-4 rounded-lg shadow-sm flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex-none flex items-center gap-3 w-full sm:w-48">
                        <group.Icon size={24} className="text-muted-foreground" />
                        <p className="font-semibold text-card-foreground leading-tight">{group.name}</p>
                      </div>
                      <div className="flex-1 w-full">
                        <div className="flex flex-wrap gap-1.5">
                          {group.questions.map(q => (
                            <div
                              key={q.id}
                              title={`Otázka ${q.index}`}
                              className={`w-7 h-7 flex items-center justify-center rounded-full font-bold text-xs text-white ${
                                q.isAnswered ? (q.isCorrect ? 'bg-green-500' : 'bg-destructive') : 'bg-muted-foreground'
                              }`}
                            >
                              {q.index}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex-none w-full sm:w-24 text-left sm:text-right mt-3 sm:mt-0">
                        <span className="text-2xl font-bold text-card-foreground">{group.scoredPoints}</span>
                        <span className="text-muted-foreground"> / {group.totalPoints} b.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="text-left">
              <h3 className="text-lg font-semibold mt-8 mb-4">Detailní přehled odpovědí:</h3>
              <div className="space-y-3 text-left border p-3 md:p-4 rounded-md shadow bg-card">
                {questions.map((q_item, index) => {
                  const userAnswer = responses[q_item.id];
                  const isCorrect = userAnswer === q_item.spravna;
                  const isAnswered = userAnswer !== undefined;
                  return (
                    <div key={q_item.id} className={clsx("p-3 border rounded-md text-sm", {
                      "bg-green-100 border-green-400 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300": isAnswered && isCorrect,
                      "bg-red-100 border-red-400 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300": isAnswered && !isCorrect,
                      "bg-muted/50 border-border": !isAnswered,
                    })}>
                      <p className="font-medium">{index + 1}. {q_item.otazka}</p>
                      {q_item.obrazek && (
                        q_item.obrazek.endsWith('.mp4')
                          ? <video src={q_item.obrazek} autoPlay loop muted playsInline controls className="my-2 rounded max-h-64 md:max-h-80 lg:max-h-[45vh] mx-auto shadow" />
                          : <img src={q_item.obrazek} alt={`Otázka ${index + 1}`} className="my-2 rounded max-h-64 md:max-h-80 lg:max-h-[45vh] mx-auto shadow"/>
                      )}
                      <p className="mt-1"><span className="font-normal">Správná odpověď:</span> {
                        /\.(jpeg|jpg|gif|png)$/i.test(q_item.moznosti[q_item.spravna])
                        ? <img src={q_item.moznosti[q_item.spravna]} alt="Správná odpověď" className="my-2 rounded max-h-32 md:max-h-48 shadow"/>
                        : <span className="font-semibold">{q_item.moznosti[q_item.spravna]}</span>
                      }</p>
                      {isAnswered ? (
                        <p className="mt-0.5"><span className="font-normal">Vaše odpověď:</span> {
                          /\.(jpeg|jpg|gif|png)$/i.test(q_item.moznosti[userAnswer])
                          ? <img src={q_item.moznosti[userAnswer]} alt="Vaše odpověď" className="my-2 rounded max-h-32 md:max-h-48 shadow"/>
                          : <span className="font-semibold">{q_item.moznosti[userAnswer]}</span>
                        } {isCorrect ? <CheckCircle2 className="inline-block ml-1 text-green-500" size={16} /> : <XCircle className="inline-block ml-1 text-red-500" size={16} />}</p>
                      ) : (
                        <p className="mt-0.5 text-muted-foreground">Bez odpovědi</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="h-16" /> {/* Spacer for action bar */}
          </div>
        </main>
        <div id="actionBar" className={clsx("action-bar", { "action-bar--visible": isActionBarVisible && !isFooterVisible })}>
            <Button size="lg" className="w-full" onClick={backButtonAction}>
                {backButtonText}
            </Button>
        </div>
      </div>
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
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-background">
      <RefreshCcw size={48} className="text-primary animate-spin mb-4" />
      <p className="text-xl text-foreground mb-2">Načítám aplikaci...</p>
      <p className="text-sm text-muted-foreground mb-6">Pokud načítání trvá příliš dlouho, zkuste obnovit stránku.</p>
      <Button onClick={() => setPhase("intro")} variant="outline">
        Zkusit znovu / Přejít na úvod
      </Button>
    </div>
  );
}
