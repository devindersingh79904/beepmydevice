/**
 * The seven-day alert chart.
 *
 * Hand-drawn rather than charted by a library. The design is seven flat
 * columns on a shared baseline: every charting library ships rounded caps, its
 * own type stack and a categorical palette this system does not have, so using
 * one would mean fighting it back to plain rectangles — 200 KB to draw a div.
 *
 * The bars carry no information the text does not: each column prints its
 * count above it and its weekday below, so the chart is readable at a glance
 * and still exact.
 */

import type {ReactElement} from 'react';

import type {ActivityDay} from '@/services/alert.service';

export function ActivityChart({days}: {days: ActivityDay[]}): ReactElement {
  // Scale to the busiest day, with a floor of 1 so an all-zero week renders as
  // seven baseline stubs rather than dividing by zero.
  const peak = Math.max(1, ...days.map(day => day.count));

  return (
    <div
      className="chart"
      role="img"
      aria-label={`Alerts per day over the last ${days.length} days: ${days
        .map(day => `${day.date.toLocaleDateString(undefined, {weekday: 'short'})} ${day.count}`)
        .join(', ')}`}
    >
      {days.map(day => (
        <div className="chart-col" key={day.date.toISOString()}>
          <span className="chart-value">{day.count}</span>
          <div
            className={day.count === 0 ? 'chart-bar is-empty' : 'chart-bar'}
            style={{height: `${(day.count / peak) * 100}%`}}
          />
          <span className="chart-label">{day.label}</span>
        </div>
      ))}
    </div>
  );
}
