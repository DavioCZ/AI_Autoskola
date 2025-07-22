import React, { useEffect, useState } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
const today = new Date();

type HeatmapValue = {
  date: string;
  accuracy: number | null;
  count: number;
};

const StatsHeatmap = ({ currentUser }: { currentUser: string | null }) => {
  const [values, setValues] = useState<HeatmapValue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
          setValues(data);
        } else {
          console.error("Failed to fetch heatmap data:", data.error);
          setValues([]); // Reset to empty on error
        }
      } catch (error) {
        console.error("Error fetching heatmap data:", error);
        setValues([]); // Reset to empty on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="p-4 bg-card text-card-foreground rounded-lg shadow text-center">
        <p className="text-muted-foreground">Načítám heat-mapu...</p>
      </div>
    );
  }
  
  if (values.length === 0) {
     return (
      <div className="p-4 bg-card text-card-foreground rounded-lg shadow text-center">
        <h2 className="text-lg font-semibold mb-4">Heat-mapa úspěšnosti</h2>
        <p className="text-muted-foreground">Pro zobrazení heat-mapy zatím není dostatek dat.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-card text-card-foreground rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Heat-mapa úspěšnosti</h2>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <CalendarHeatmap
          startDate={shiftDate(today, -120)}
          endDate={today}
        values={values}
        classForValue={(value) => {
          if (!value || value.accuracy === null) {
            return 'color-empty';
          }
          
          const accuracy = value.accuracy * 100;
          const count = value.count || 0;
          let intensity = 1;
          if (count > 5) intensity = 2;
          if (count > 10) intensity = 3;
          if (count > 20) intensity = 4;

          if (accuracy <= 75) return `color-scale-red-${intensity}`;
          if (accuracy <= 90) return `color-scale-yellow-${intensity}`;
          return `color-scale-green-${intensity}`;
        }}
        titleForValue={(value: any) => {
          if (!value || !value.date) {
            return 'Žádná aktivita';
          }
          const date = new Date(value.date).toLocaleDateString('cs-CZ');
          if (value.accuracy === null) {
            return `${date}: Žádná aktivita`;
          }
          const accuracyText = `${Math.round(value.accuracy * 100)}% úspěšnost`;
          const countText = `${value.count} ${value.count === 1 ? 'aktivita' : value.count <= 4 ? 'aktivity' : 'aktivit'}`;
          return `${date}: ${accuracyText} (${countText})`;
        }}
        />
      </div>
    </div>
  );
};

function shiftDate(date: Date, numDays: number): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + numDays);
  return newDate;
}

export default StatsHeatmap;
