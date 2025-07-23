// src/components/dashboard/Heatmap.tsx
import ActivityCalendar from 'react-activity-calendar';

export type HeatDay = {
  date: string;   // "YYYY-MM-DD"
  count: number;  // počet otázek => POVINNÉ
  level: number;  // 0-4 (kvantil aktivity) – volitelné
};

export type HeatPayload = { data: HeatDay[] };

interface Props {
  payload: HeatPayload;   // přichází z GET /api/heatmap
}

export const Heatmap: React.FC<Props> = ({ payload }) => {
  const data = payload.data.map((d) => ({
    date:  d.date,
    count: Number(d.count ?? 0),   // knihovna vyžaduje number
    level: d.level,
  }));

  return (
    <ActivityCalendar
      data={data}
      labels={{
        totalCount: '{{count}} otázek v {{year}}',
        legend: { less: 'Méně', more: 'Více' },
      }}
      theme={{
        light: ['#e5e7eb', '#166534', '#22c55e', '#4ade80', '#86efac'],
        dark:  ['#374151', '#166534', '#22c55e', '#4ade80', '#86efac'],
      }}
      hideColorLegend={false}
    />
  );
};
