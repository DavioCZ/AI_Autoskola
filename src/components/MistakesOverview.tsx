import { useMemo, useState, useRef, useEffect } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, CheckCircle2, RefreshCcw } from "lucide-react";
import clsx from "clsx";
import type { SummaryData, Question } from "../DrivingTestApp"; // Import typu
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type MistakesOverviewProps = {
  summaryData: SummaryData;
  allQuestions: Question[];
  onStartPractice: (questionIds: string[]) => void;
  isLoading: boolean;
};

export function MistakesOverview({ summaryData, allQuestions, onStartPractice, isLoading }: MistakesOverviewProps) {
  const [isMistakesOpen, setIsMistakesOpen] = useState(true);
  const [mistakesFilter, setMistakesFilter] = useState<'all' | 'uncorrected'>('all');
  const [isActionBarVisible, setIsActionBarVisible] = useState(false);
  const [isComponentInView, setIsComponentInView] = useState(false);
  const lastScrollY = useRef(0);
  const componentRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
        ([entry]) => setIsComponentInView(entry.isIntersecting),
        { threshold: 0.1 }
    );
    const currentRef = componentRootRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => {
        if (currentRef) observer.unobserve(currentRef);
    };
  }, []);

  useEffect(() => {
    if (!isComponentInView) {
        setIsActionBarVisible(false);
        return;
    }

    const scrollContainer = componentRootRef.current?.closest('main.overflow-y-auto');
    if (!scrollContainer) return;

    const handleScroll = () => {
        const { scrollTop } = scrollContainer;
        // Zobrazíme tlačítko, když uživatel posouvá dolů
        if (scrollTop > lastScrollY.current && scrollTop > 50) {
            setIsActionBarVisible(true); 
        // Skryjeme ho, když posouvá nahoru
        } else if (scrollTop < lastScrollY.current) {
            setIsActionBarVisible(false); 
        }
        lastScrollY.current = scrollTop <= 0 ? 0 : scrollTop;
    };
    
    setIsActionBarVisible(true);
    lastScrollY.current = scrollContainer.scrollTop;
    
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [isComponentInView]);

  const summaryValues = Object.values(summaryData);

  const processedMistakes = useMemo(() => {
    const mistakesByQuestion = summaryValues.reduce((acc, summary) => {
      if (!summary.questionId) return acc;
      acc[summary.questionId] = {
        text: summary.questionText,
        groupId: summary.groupId,
        history: (summary.history || []).map(h => ({ isCorrect: h.isCorrect, answeredAt: h.answeredAt })),
      };
      return acc;
    }, {} as Record<string, { text: string; groupId: number; history: { isCorrect: boolean; answeredAt: string }[] }>);

    return Object.entries(mistakesByQuestion)
      .map(([questionId, data]) => {
        const incorrectCount = data.history.filter(h => !h.isCorrect).length;
        const lastAttempt = data.history.length > 0 ? data.history[data.history.length - 1] : null;
        const isCorrected = lastAttempt ? lastAttempt.isCorrect : false;
        return {
          questionId,
          text: data.text,
          groupId: data.groupId,
          incorrectCount,
          isCorrected,
        };
      })
      .filter(item => {
        if (item.incorrectCount === 0) return false;
        if (mistakesFilter === 'uncorrected') {
          return !item.isCorrected;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.isCorrected !== b.isCorrected) {
          return a.isCorrected ? 1 : -1;
        }
        return b.incorrectCount - a.incorrectCount;
      });
  }, [summaryValues, mistakesFilter]);

  const uncorrectedMistakes = processedMistakes.filter(m => !m.isCorrected);

  if (summaryValues.length === 0 || summaryValues.every(s => s.history.every(h => h.isCorrect))) {
    return null; // Nezobrazovat nic, pokud nejsou žádná data nebo žádné chyby
  }

  // Zobrazit loading stav, pokud nejsou načteny všechny otázky, ale jsou chyby k zobrazení
  if (allQuestions.length === 0 && processedMistakes.length > 0) {
    return (
      <div className="max-w-4xl mx-auto mt-8">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-lg">Přehled chybovosti</h3>
          </CardHeader>
          <CardContent className="text-center py-8 text-muted-foreground">
            <p>Načítám data otázek...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={componentRootRef}>
      <Collapsible open={isMistakesOpen} onOpenChange={setIsMistakesOpen} className="max-w-4xl mx-auto mt-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-3 cursor-pointer flex-1">
                  <h3 className="font-semibold text-lg">Přehled chybovosti</h3>
                  <ChevronsUpDown size={18} className="text-muted-foreground transition-transform data-[state=open]:-rotate-180" />
                </div>
              </CollapsibleTrigger>
              <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
                <Button
                  variant={mistakesFilter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setMistakesFilter('all')}
                  className="text-xs h-7"
                >
                  Všechny
                </Button>
                <Button
                  variant={mistakesFilter === 'uncorrected' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setMistakesFilter('uncorrected')}
                  className="text-xs h-7"
                >
                  Neopravené
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Otázky, ve kterých jste v minulosti chybovali.</p>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {processedMistakes.length > 0 ? (
                <div className="space-y-4">
                  {processedMistakes.map(({ questionId, text, incorrectCount, isCorrected, groupId }) => (
                    <Popover key={questionId}>
                      <PopoverTrigger asChild>
                        <div className={clsx("p-3 border rounded-md cursor-pointer hover:bg-muted/50", {
                          "bg-red-50/50 border-red-200 dark:bg-red-900/20 dark:border-red-800": !isCorrected,
                          "bg-green-50/50 border-green-200 dark:bg-green-900/20 dark:border-green-800": isCorrected,
                        })}>
                          <div className="flex justify-between items-center">
                            <p className={clsx("font-semibold", {
                              "text-red-800 dark:text-red-300": !isCorrected,
                              "text-green-800 dark:text-green-300": isCorrected,
                            })}>
                              {incorrectCount}x nesprávně
                            </p>
                            {isCorrected && (
                              <span className="text-xs font-medium text-white bg-green-600 px-2 py-1 rounded-full">
                                OPRAVENO
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground/90 mt-1">{text}</p>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <CorrectAnswerDisplay
                          questionId={questionId}
                          groupId={groupId}
                          allQuestions={allQuestions}
                        />
                      </PopoverContent>
                    </Popover>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Žádné chyby k zobrazení v tomto filtru.</p>
                  {mistakesFilter === 'uncorrected' && <p className="text-xs mt-1">Zkuste změnit filtr na "Všechny".</p>}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      
      <div className="h-24" /> {/* Spacer for floating action bar */}

      <div className={clsx("action-bar", { "action-bar--visible": isActionBarVisible && isComponentInView })}>
        {uncorrectedMistakes.length > 0 ? (
          <Button 
            size="lg" 
            onClick={() => onStartPractice(uncorrectedMistakes.map(m => m.questionId))}
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <RefreshCcw className="mr-2 h-5 w-5" />
            {isLoading ? "Připravuji otázky..." : `Opravit ${uncorrectedMistakes.length} chyb`}
          </Button>
        ) : (
          <div className="text-center text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg flex items-center justify-center gap-3 text-sm">
            <CheckCircle2 size={20} />
            <p className="font-semibold">
              Všechny chyby opraveny!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Nová sub-komponenta pro zobrazení správné odpovědi
function CorrectAnswerDisplay({ questionId, groupId, allQuestions }: { questionId: string; groupId: number; allQuestions: Question[] }) {
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const findAnswer = async () => {
      setIsLoading(true);
      // 1. Pokus najít v již načtených otázkách
      const questionFromProp = allQuestions.find(q => q.id === questionId);
      if (questionFromProp) {
        setCorrectAnswer(questionFromProp.moznosti[questionFromProp.spravna]);
        setIsLoading(false);
        return;
      }

      // 2. Pokud se nenajde, načíst data z příslušného JSON souboru
      if (groupId > 0) {
        try {
          const res = await fetch(`/okruh${groupId}.json`);
          if (!res.ok) throw new Error(`Failed to fetch okruh${groupId}.json`);
          const questions: Question[] = await res.json();
          const questionData = questions.find(q => String(q.id) === questionId);
          if (questionData) {
            setCorrectAnswer(questionData.moznosti[questionData.spravna]);
          } else {
            setCorrectAnswer("Odpověď nenalezena.");
          }
        } catch (error) {
          console.error("Error fetching correct answer:", error);
          setCorrectAnswer("Chyba při načítání odpovědi.");
        }
      } else {
        setCorrectAnswer("Neznámý okruh otázky.");
      }
      
      setIsLoading(false);
    };

    findAnswer();
  }, [questionId, groupId, allQuestions]);

  return (
    <div className="space-y-2">
      <h4 className="font-medium leading-none">Správná odpověď</h4>
      <p className="text-sm text-muted-foreground">
        {isLoading ? "Načítám..." : correctAnswer}
      </p>
    </div>
  );
}
