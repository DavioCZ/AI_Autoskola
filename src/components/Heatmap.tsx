import React, { useState, useEffect } from 'react';
import ActivityCalendar, { type Activity, type ThemeInput } from 'react-activity-calendar';

// Rozšíření typu Activity o vlastní data
type CustomActivity = Activity & {
  total: number;
  correct: number;
};

interface HeatmapData {
  date: string;
  count: number; // Přidáno pro kompatibilitu
  total: number;
  correct: number;
  level: number;
}

interface ApiResponse {
  data: HeatmapData[];
  thresholds: {
    q1: number;
    q2: number;
    q3: number;
  };
}

interface HeatmapProps {
  userId: string | null;
}

const Heatmap: React.FC<HeatmapProps> = ({ userId }) => {
  const [data, setData] = useState<CustomActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchHeatmapData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/heatmap?userId=${userId.toLowerCase()}`);
        if (!response.ok) {
          throw new Error('Nepodařilo se načíst data pro heatmapu.');
        }
        const apiResponse: ApiResponse = await response.json();
        
        const transformedData = apiResponse.data.map(d => ({
          date: d.date,
          count: d.count,     // POVINNÉ
          level: d.level,     // 0-4, volitelné
          total: d.total,     // Vlastní data pro tooltip
          correct: d.correct, // Vlastní data pro tooltip
        }));

        setData(transformedData as CustomActivity[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Neznámá chyba');
      } finally {
        setLoading(false);
      }
    };

    fetchHeatmapData();
  }, [userId]);

  if (loading) {
    return <div>Načítání heatmapy...</div>;
  }

  if (error) {
    return <div className="text-red-500">Chyba: {error}</div>;
  }

  if (data.length === 0) {
    return <div>Zatím žádná aktivita pro zobrazení v heatmapě.</div>;
  }

  const myTheme: ThemeInput = {
    light: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
    dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Přehled aktivity</h2>
        <ActivityCalendar
          data={data}
          labels={{
            legend: { less: 'Méně', more: 'Více' },
            totalCount: '{{count}} otázek v roce {{year}}'
          }}
          theme={myTheme}
          showWeekdayLabels
        />
    </div>
  );
};

export default Heatmap;
