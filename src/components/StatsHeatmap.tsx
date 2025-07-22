import React, { useEffect, useState } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
const today = new Date();

type HeatmapValue = {
  date: string;
  accuracy: number | null;
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
      <CalendarHeatmap
        startDate={shiftDate(today, -365)}
        endDate={today}
        values={values}
        classForValue={(value) => {
          if (!value || value.accuracy === null) {
            return 'color-empty';
          }
          const accuracy = value.accuracy * 100;
          if (accuracy <= 50) return 'color-scale-red';
          if (accuracy <= 80) return 'color-scale-yellow';
          if (accuracy <= 95) return 'color-scale-light-green';
          return 'color-scale-dark-green';
        }}
        titleForValue={(value: any) => {
          if (!value || !value.date) {
            return 'Žádná aktivita';
          }
          return `${new Date(value.date).toLocaleDateString('cs-CZ')}: ${
            value.accuracy !== null ? `${Math.round(value.accuracy * 100)}% úspěšnost` : 'Žádná aktivita'
          }`;
        }}
      />
    </div>
  );
};

function shiftDate(date: Date, numDays: number): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + numDays);
  return newDate;
}

export default StatsHeatmap;
