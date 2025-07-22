import React, { useEffect, useState } from 'react';
import HeatMap from 'react-calendar-heatmap';
import AutoSizer from 'react-virtualized-auto-sizer';
import { subDays } from 'date-fns';
import 'react-calendar-heatmap/dist/styles.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DayStat = {
  date: string;
  total: number;
  correct: number;
};

const hue = (rate: number) => {
  if (rate >= 0.7) return "g"; // green
  if (rate >= 0.4) return "y"; // yellow
  return "r"; // red
};

const shade = (total: number) => {
  if (total >= 26) return 4;
  if (total >= 11) return 3;
  if (total >= 3) return 2;
  return 1;
};

const ProgressHeatmap = ({ currentUser }: { currentUser: string | null }) => {
  const [stats, setStats] = useState<DayStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch(`/api/stats/heatmap?userId=${encodeURIComponent(currentUser)}`);
        const data = await res.json();
        if (res.ok) {
          // Assuming the API returns data in DayStat format { date, total, correct }
          setStats(data);
        } else {
          console.error("Failed to fetch heatmap data:", data.error);
          setStats([]);
        }
      } catch (error) {
        console.error("Error fetching heatmap data:", error);
        setStats([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const today = new Date();
  const daysToShow = expanded ? 365 : 28;
  const startDate = subDays(today, daysToShow - 1);

  const slicedStats = stats.filter(d => new Date(d.date) >= startDate);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Heat-mapa úspěšnosti</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">Načítám heat-mapu...</p>
        </CardContent>
      </Card>
    );
  }

  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Heat-mapa úspěšnosti</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">Pro zobrazení heat-mapy zatím není dostatek dat.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Heat-mapa úspěšnosti</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-[120px] md:h-[180px]">
          <AutoSizer>
            {({ width, height }) => (
              <HeatMap
                startDate={startDate}
                endDate={today}
                values={slicedStats}
                gutterSize={1}
                weekdayLabels={expanded ? ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'] : undefined}
                showMonthLabels={expanded}
                classForValue={(value) => {
                  if (!value || value.total === 0) return "empty";
                  const rate = value.correct / value.total;
                  return `${hue(rate)}-${shade(value.total)}`;
                }}
                titleForValue={(value) =>
                  value
                    ? `${new Date(value.date).toLocaleDateString('cs-CZ')}: správně ${value.correct}/${value.total} (${Math.round((value.correct / value.total) * 100)} %)`
                    : "Žádná aktivita"
                }
                horizontal={true}
                showOutOfRangeDays={false}
                transformDayElement={(rect, value, index) => {
                  const daySize = Math.max(Math.floor(width / (expanded ? 53 : 8) - 2), 10);
                  // rect is a plain object with SVG props, not a React element
                  return (
                    <rect
                      {...rect}
                      width={daySize}
                      height={daySize}
                    />
                  );
                }}
              />
            )}
          </AutoSizer>
        </div>
        <button
          className="text-sm text-primary mt-2 hover:underline"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Skrýt historii" : "Zobrazit celou historii"}
        </button>
      </CardContent>
    </Card>
  );
};

export default ProgressHeatmap;
