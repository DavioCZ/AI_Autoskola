import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Car, TrafficCone, Shield, GitFork, Wrench, HeartPulse, FileText, LucideProps } from "lucide-react";
import { ForwardRefExoticComponent, RefAttributes } from "react";

const ICONS: { [key: number]: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>> } = {
  1: Car,
  2: TrafficCone,
  3: Shield,
  4: GitFork,
  5: Wrench,
  6: FileText,
  7: HeartPulse,
};

type SummaryData = Record<string, {
    groupId: number;
    attempts: number;
    correct: number;
}>;

type WeakestTopicsProps = {
  summaryData: SummaryData;
  onPracticeTopic: (groupId: number) => void;
};

const WeakestTopics = ({ summaryData, onPracticeTopic }: WeakestTopicsProps) => {
  const topicsStats = Object.values(summaryData)
    .filter(item => item.groupId !== -1) // Ignorovat speciální záznamy
    .reduce((acc, item) => {
    const groupId = item.groupId;
    if (!acc[groupId]) {
      acc[groupId] = { totalAttempts: 0, totalCorrect: 0 };
    }
    acc[groupId].totalAttempts += item.attempts;
    acc[groupId].totalCorrect += item.correct;
    return acc;
  }, {} as Record<number, { totalAttempts: number; totalCorrect: number }>);

  const topics = Object.entries(topicsStats)
    .map(([groupId, data]) => ({
      groupId: parseInt(groupId),
      avgSuccess: data.totalAttempts > 0 ? (data.totalCorrect / data.totalAttempts) * 100 : 0,
    }))
    .filter(topic => topic.avgSuccess < 80)
    .sort((a, b) => a.avgSuccess - b.avgSuccess)
    .slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold">Slabá místa</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        {topics.length > 0 ? (
          topics.map(({ groupId, avgSuccess }) => {
            const Icon = ICONS[groupId];
            return (
              <div key={groupId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {Icon && <Icon size={16} className="text-muted-foreground" />}
                  <span className="text-sm font-medium">Okruh {groupId}</span>
                </div>
                <div className="flex items-center gap-2 w-1/2">
                  <Progress value={avgSuccess} className="h-2" />
                  <span className="text-xs text-muted-foreground">{avgSuccess.toFixed(0)}%</span>
                  <Button size="sm" variant="ghost" onClick={() => onPracticeTopic(groupId)}>Procvičit</Button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Zatím nemáte žádná slabá místa. Jen tak dál!
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default WeakestTopics;
