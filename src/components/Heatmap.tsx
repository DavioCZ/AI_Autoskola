import React, { useState, useEffect } from 'react';
import ActivityCalendar, { type Activity, type BlockElement } from 'react-activity-calendar';
import Tooltip from 'react-tooltip'; // Změna na default import

// Rozšíření typu Activity o vlastní data
type CustomActivity = Activity & {
  total: number;
  correct: number;
};

interface HeatmapData {
  date: string;
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
        const response = await fetch(`/api/heatmap?userId=${userId}`);
        if (!response.ok) {
          throw new Error('Nepodařilo se načíst data pro heatmapu.');
        }
        const apiResponse: ApiResponse = await response.json();
        
        const transformedData: CustomActivity[] = apiResponse.data.map(item => ({
          date: item.date,
          count: item.level,
          level: item.level,
          total: item.total,
          correct: item.correct,
        }));

        setData(transformedData);
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

  const theme = {
    light: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
    dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Přehled aktivity</h2>
        <ActivityCalendar
            data={data}
            theme={theme}
            showWeekdayLabels
            renderBlock={(block: BlockElement, activity: Activity) => {
                const customActivity = activity as CustomActivity;
                const successRate = customActivity.total > 0 ? (customActivity.correct / customActivity.total) * 100 : 0;
                let color = '';

                if (customActivity.level > 0) {
                    if (successRate >= 90) color = 'hsl(120, 70%, 40%)'; // Green
                    else if (successRate >= 60) color = 'hsl(45, 80%, 50%)'; // Yellow
                    else color = 'hsl(0, 70%, 50%)'; // Red
                } else {
                    const themeColor = document.documentElement.classList.contains('dark')
                        ? theme.dark[0]
                        : theme.light[0];
                    color = themeColor;
                }

                const opacity = 0.4 + (customActivity.level * 0.15);

                const style = {
                    ...block.props.style,
                    backgroundColor: color,
                    opacity: customActivity.level > 0 ? opacity : 1,
                };

                const tooltipContent = `<strong>${new Date(customActivity.date).toLocaleDateString('cs-CZ')}</strong><br />Otázek: ${customActivity.total}<br />Správně: ${customActivity.correct} (${Math.round(successRate)}%)`;

                return (
                    <div
                        data-tip={tooltipContent}
                        data-for="heatmap-tooltip"
                    >
                        {React.cloneElement(block, { style })}
                    </div>
                );
            }}
        />
        <Tooltip id="heatmap-tooltip" html={true} />
    </div>
  );
};

export default Heatmap;
