import { RollingNumber } from '../motion.jsx';
import { Card, Skeleton } from '../ui/primitives.jsx';

// A tiny line chart of one value per clinic hour. Decorative: the number
// beside it carries the meaning.
function Sparkline({ values }) {
  const width = 96;
  const height = 28;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((value, index) => `${(index * step).toFixed(1)},${(height - 3 - (value / max) * (height - 6)).toFixed(1)}`);

  return (
    <svg aria-hidden="true" viewBox={`0 0 ${width} ${height}`} className="h-7 w-12 shrink text-primary sm:w-20 xl:w-12 2xl:w-20">
      <polygon points={`0,${height} ${points.join(' ')} ${width},${height}`} fill="currentColor" opacity="0.12" />
      <polyline points={points.join(' ')} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ITEMS = [
  { key: 'total', label: 'Appointments today' },
  { key: 'waiting', label: 'Waiting now' },
  { key: 'averageWaitMinutes', label: 'Average wait', suffix: ' min' },
  { key: 'completed', label: 'Completed' },
  { key: 'noShows', label: 'Not arrived' },
  { key: 'emergencies', label: 'Emergencies' },
];

// The day's headline numbers, each with its hour-by-hour trend.
export default function KpiStrip({ kpis }) {
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {ITEMS.map((item) => {
        const kpi = kpis?.[item.key];
        return (
          <Card key={item.key} className="p-4">
            <dt className="text-xs font-medium text-muted">{item.label}</dt>
            <dd className="mt-1 flex items-end justify-between gap-2">
              {kpi ? (
                <>
                  <span className="font-display text-3xl leading-none whitespace-nowrap">
                    {kpi.value === null ? '–' : <RollingNumber value={kpi.value} />}
                    {kpi.value !== null && item.suffix && <span className="font-sans text-sm text-muted">{item.suffix}</span>}
                  </span>
                  <Sparkline values={kpi.series} />
                </>
              ) : (
                <Skeleton className="h-8 w-full" />
              )}
            </dd>
          </Card>
        );
      })}
    </dl>
  );
}
