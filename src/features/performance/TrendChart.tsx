import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Trend, TrendResult } from "@/domain/analytics/trend";
import styles from "./TrendChart.module.css";

export interface TrendChartPoint {
  label: string;
  value: number;
}

export interface TrendChartProps {
  title: string;
  data: TrendChartPoint[];
  trend: TrendResult;
  color: string;
  /** Shown instead of the chart when there are fewer than 2 points —
   * a single number can't be a line, and a chart drawn from one point
   * would misleadingly look like a flat trend. */
  emptyMessage: string;
}

const TREND_LABEL: Record<Trend, string> = {
  improving: "Improving",
  declining: "Declining",
  stable: "Stable",
  "insufficient-data": "Not enough history yet for a trend",
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * A small, honest line chart (Stage 4): never rendered from fewer than 2
 * points, never labeled with a trend classification until the domain
 * layer's own threshold is met (`trend.trend !== "insufficient-data"`),
 * and always paired with a plain-text summary of the same numbers a
 * screen reader (or anyone skimming) can read without touching the SVG —
 * chart + text state the same fact two ways, neither is tooltip-only.
 */
export function TrendChart({ title, data, trend, color, emptyMessage }: TrendChartProps) {
  const latest = data.at(-1);

  if (data.length < 2) {
    return (
      <div className={styles.chart}>
        <p className={styles.title}>{title}</p>
        <p className={styles.emptyMessage}>{emptyMessage}</p>
      </div>
    );
  }

  const summary =
    trend.trend === "insufficient-data"
      ? `Latest: ${round1(latest!.value)}%. ${TREND_LABEL[trend.trend]}.`
      : `Latest: ${round1(latest!.value)}%. ${TREND_LABEL[trend.trend]} (${trend.delta! >= 0 ? "+" : ""}${round1(trend.delta!)} points recently vs. earlier).`;

  return (
    <div className={styles.chart}>
      <p className={styles.title}>{title}</p>
      <div
        role="img"
        aria-label={`${title} over time. ${data.map((p) => `${p.label}: ${round1(p.value)}%`).join(", ")}.`}
        className={styles.plot}
      >
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
              axisLine={{ stroke: "var(--color-border-default)" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              formatter={(value) => [`${round1(Number(value))}%`, title]}
              contentStyle={{
                background: "var(--color-bg-surface-raised)",
                border: "1px solid var(--color-border-default)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className={styles.summary}>{summary}</p>
    </div>
  );
}
