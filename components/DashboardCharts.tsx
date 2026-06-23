"use client";

import Link from "next/link";
import type { DashboardView } from "@/components/AppShell";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const MONTH_LABELS = ["Nov", "Dec", "Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aout", "Sep", "Oct"];
const CURRENT_SEASON_COLOR = "#7c3aed";
const SEASON_COLORS = ["#3b82f6", "#cbd5e1", "#ef4444", "#22c55e", "#f59e0b"] as const;

type Activity = {
  date: string;
  season: number;
  week_in_season: number;
  month_in_season: number;
  title: string | null;
  duration_hours: number | null;
  distance_km: number | null;
  elevation_m: number | null;
  tss_final: number | null;
  tss_source?: string | null;
};

type Pmc = {
  date_day: string;
  season: number;
  week_in_season: number;
  month_in_season: number;
  ctl: number;
  atl: number;
  tsb: number;
};

type ImportRow = {
  id: string | number;
  created_at: string | null;
  file_name: string | null;
  activities_upserted: number | null;
  duplicates_ignored: number | null;
  pmc_status: string | null;
};

type MetricRow = {
  season: number;
  period: number;
  label: string;
  tss?: number;
  hours?: number;
  distance?: number;
  elevation?: number;
  ctl?: number;
  atl?: number;
  tsb?: number;
};

function weekToMonthLabel(week: number) {
  return MONTH_LABELS[Math.min(11, Math.floor((week - 1) / 4.35))];
}

function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeZone: "Europe/Paris",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(new Date(value));
}

function formatValue(value: number | null | undefined, unit = "", digits = 0) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Number(value).toFixed(digits)}${unit}`;
}

function formatDelta(current: number, previous: number) {
  if (!Number.isFinite(previous) || previous === 0) return null;
  const delta = ((current - previous) / previous) * 100;
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}

function sourceLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "Inconnu";

  switch (normalized) {
    case "garmin":
      return "Garmin";
    case "estimated_hr":
      return "Estime FC";
    case "estimated_power":
      return "Estime puissance";
    case "missing_duration":
      return "Sans duree";
    case "missing_power_hr":
      return "Sans FC/puissance";
    default:
      return normalized;
  }
}

function sourceTone(index: number) {
  const tones = [
    "bg-violet-100 text-violet-700",
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-orange-100 text-orange-700",
  ];
  return tones[index % tones.length];
}

function latestSeason(activities: Activity[]) {
  return Math.max(...activities.map((activity) => Number(activity.season)));
}

function latestWeek(activities: Activity[], season: number) {
  return Math.max(
    ...activities
      .filter((activity) => Number(activity.season) === season)
      .map((activity) => Number(activity.week_in_season))
  );
}

function latestPmcSeason(pmc: Pmc[]) {
  return Math.max(...pmc.map((row) => Number(row.season)));
}

function latestPmcWeek(pmc: Pmc[], season: number) {
  return Math.max(
    ...pmc
      .filter((row) => Number(row.season) === season)
      .map((row) => Number(row.week_in_season))
  );
}

function seasonColor(season: number, seasons: number[], currentSeason: number) {
  if (season === currentSeason) return CURRENT_SEASON_COLOR;
  const otherSeasons = seasons.filter((value) => value !== currentSeason).sort((a, b) => b - a);
  const index = Math.max(0, otherSeasons.indexOf(season));
  return SEASON_COLORS[index % SEASON_COLORS.length];
}

function sum(rows: Activity[], key: keyof Activity) {
  return rows.reduce((acc, row) => acc + Number(row[key] ?? 0), 0);
}

function groupActivitiesByPeriod(
  activities: Activity[],
  periodKey: "week_in_season" | "month_in_season",
  maxPeriod: number
) {
  const map = new Map<string, MetricRow>();

  for (const activity of activities) {
    const period = Number(activity[periodKey]);
    if (!Number.isFinite(period) || period > maxPeriod) continue;

    const key = `${activity.season}-${period}`;
    const current = map.get(key) ?? {
      season: Number(activity.season),
      period,
      label: periodKey === "month_in_season" ? MONTH_LABELS[period - 1] : weekToMonthLabel(period),
      tss: 0,
      hours: 0,
      distance: 0,
      elevation: 0,
    };

    current.tss = Number(current.tss ?? 0) + Number(activity.tss_final ?? 0);
    current.hours = Number(current.hours ?? 0) + Number(activity.duration_hours ?? 0);
    current.distance = Number(current.distance ?? 0) + Number(activity.distance_km ?? 0);
    current.elevation = Number(current.elevation ?? 0) + Number(activity.elevation_m ?? 0);

    map.set(key, current);
  }

  return Array.from(map.values()).sort((a, b) => a.period - b.period);
}

function groupPmcByWeek(pmc: Pmc[], maxWeek: number) {
  const map = new Map<string, { season: number; period: number; label: string; ctlTotal: number; atlTotal: number; tsbTotal: number; count: number }>();

  for (const row of pmc) {
    const period = Number(row.week_in_season);
    if (!Number.isFinite(period) || period > maxWeek) continue;

    const key = `${row.season}-${period}`;
    const current = map.get(key) ?? {
      season: Number(row.season),
      period,
      label: weekToMonthLabel(period),
      ctlTotal: 0,
      atlTotal: 0,
      tsbTotal: 0,
      count: 0,
    };

    current.ctlTotal += Number(row.ctl ?? 0);
    current.atlTotal += Number(row.atl ?? 0);
    current.tsbTotal += Number(row.tsb ?? 0);
    current.count += 1;
    map.set(key, current);
  }

  return Array.from(map.values())
    .map((row) => ({
      season: row.season,
      period: row.period,
      label: row.label,
      ctl: row.count ? row.ctlTotal / row.count : 0,
      atl: row.count ? row.atlTotal / row.count : 0,
      tsb: row.count ? row.tsbTotal / row.count : 0,
    }))
    .sort((a, b) => a.period - b.period);
}

function cumulative(rows: MetricRow[], metric: "tss" | "hours" | "distance" | "elevation") {
  const bySeason = new Map<number, MetricRow[]>();

  for (const row of rows) {
    const season = Number(row.season);
    const list = bySeason.get(season) ?? [];
    list.push(row);
    bySeason.set(season, list);
  }

  const output: MetricRow[] = [];

  for (const [season, list] of bySeason.entries()) {
    let total = 0;
    for (const row of list.sort((a, b) => a.period - b.period)) {
      total += Number(row[metric] ?? 0);
      output.push({ ...row, season, [metric]: total });
    }
  }

  return output;
}

function pivotBySeason(
  rows: MetricRow[],
  metric: keyof MetricRow,
  seasons: number[],
  maxPeriod: number,
  mode: "weekly" | "monthly"
) {
  return Array.from({ length: maxPeriod }, (_, index) => {
    const period = index + 1;
    const row: Record<string, string | number | null> = {
      period,
      label: mode === "monthly" ? MONTH_LABELS[period - 1] : weekToMonthLabel(period),
    };

    for (const season of seasons) {
      const match = rows.find((item) => Number(item.season) === season && Number(item.period) === period);
      row[`Saison ${season}`] = match ? Number(match[metric] ?? 0) : null;
    }

    return row;
  });
}

function movingAverage(data: Record<string, string | number | null>[], seasons: number[], window = 4) {
  return data.map((row, index) => {
    const nextRow = { ...row };

    for (const season of seasons) {
      const key = `Saison ${season}`;
      const slice = data.slice(Math.max(0, index - window + 1), index + 1);
      const values = slice
        .map((item) => Number(item[key] ?? NaN))
        .filter((value) => Number.isFinite(value) && value > 0);

      nextRow[key] = values.length
        ? Math.round((values.reduce((acc, value) => acc + value, 0) / values.length) * 10) / 10
        : null;
    }

    return nextRow;
  });
}

function fillForwardBySeason(data: Record<string, string | number | null>[], seasons: number[]) {
  const lastValues = new Map<number, number>();

  return data.map((row) => {
    const nextRow = { ...row };

    for (const season of seasons) {
      const key = `Saison ${season}`;
      const value = nextRow[key];

      if (value == null) {
        nextRow[key] = lastValues.has(season) ? lastValues.get(season) ?? null : null;
      } else {
        lastValues.set(season, Number(value));
      }
    }

    return nextRow;
  });
}

function getSeasonSeries(data: Record<string, string | number | null>[], season: number) {
  const key = `Saison ${season}`;
  return data
    .map((row) => Number(row[key] ?? NaN))
    .filter((value) => Number.isFinite(value)) as number[];
}

function sparklinePoints(values: number[]) {
  if (!values.length) return "";

  const width = 180;
  const height = 48;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");
}

function getWeeklyTicks(maxWeek: number) {
  const ticks: number[] = [];
  for (let week = 1; week <= maxWeek; week += 8) ticks.push(week);
  if (ticks.at(-1) !== maxWeek) ticks.push(maxWeek);
  return ticks;
}

function getSeasonProgress(week: number) {
  return Math.min(100, Math.round((week / 52) * 100));
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values.length) {
    return <div className="mt-4 h-12 rounded-xl bg-slate-50" />;
  }

  return (
    <svg viewBox="0 0 180 48" className="mt-4 h-12 w-full overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2.4" points={sparklinePoints(values)} />
    </svg>
  );
}

function HeaderAction({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-sm text-slate-600">{value}</div>
    </div>
  );
}

function KpiCard({
  iconBg,
  icon,
  title,
  value,
  delta,
  comparisonLabel,
  sparkline,
  sparklineColor,
}: {
  iconBg: string;
  icon: string;
  title: string;
  value: string;
  delta?: string | null;
  comparisonLabel: string;
  sparkline: number[];
  sparklineColor: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold text-white ${iconBg}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
          <div className="mt-1 text-[2rem] font-semibold leading-none text-slate-950">{value}</div>
          {delta && (
            <div className={`mt-2 text-sm ${delta.startsWith("+") ? "text-emerald-600" : "text-rose-500"}`}>
              {delta} {comparisonLabel}
            </div>
          )}
        </div>
      </div>
      <Sparkline values={sparkline} color={sparklineColor} />
    </div>
  );
}

function CurrentFormCard({
  ctl,
  atl,
  tsb,
  ctlDelta,
  atlDelta,
  tsbDelta,
  comparisonLabel,
}: {
  ctl: number;
  atl: number;
  tsb: number;
  ctlDelta?: string | null;
  atlDelta?: string | null;
  tsbDelta?: string | null;
  comparisonLabel: string;
}) {
  const items = [
    { label: "CTL actuel", value: ctl, delta: ctlDelta, color: "text-slate-900" },
    { label: "ATL actuel", value: atl, delta: atlDelta, color: "text-rose-500" },
    { label: "TSB actuel", value: tsb, delta: tsbDelta, color: "text-slate-900" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Forme actuelle</div>
      <div className="mt-6 grid grid-cols-3 divide-x divide-slate-200">
        {items.map((item) => (
          <div key={item.label} className="px-4 first:pl-0 last:pr-0">
            <div className={`text-sm font-medium ${item.label.startsWith("ATL") ? "text-rose-500" : "text-slate-500"}`}>
              {item.label}
            </div>
            <div className={`mt-2 text-[2rem] font-semibold leading-none ${item.color}`}>{formatValue(item.value, "", 1)}</div>
            {item.delta && (
              <div className={`mt-2 text-sm ${item.delta.startsWith("+") ? "text-emerald-600" : "text-rose-500"}`}>
                {item.delta}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 text-xs text-slate-400">{comparisonLabel}</div>
    </div>
  );
}

function LegendRow({ seasons, currentSeason }: { seasons: number[]; currentSeason: number }) {
  return (
    <div className="flex flex-wrap items-center gap-6 text-sm">
      {[...seasons].sort((a, b) => b - a).map((season) => (
        <span
          key={season}
          className={season === currentSeason ? "font-bold" : "font-medium"}
          style={{ color: seasonColor(season, seasons, currentSeason) }}
        >
          {season}
        </span>
      ))}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
  digits,
  currentSeason,
}: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
      <div className="text-sm font-medium text-slate-900">{label}</div>
      <div className="mt-2 space-y-1">
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-sm">
            <span
              className={entry.dataKey === `Saison ${currentSeason}` ? "font-semibold" : "font-medium"}
              style={{ color: entry.color }}
            >
              {String(entry.dataKey).replace("Saison ", "")}
            </span>
            <span className="tabular-nums text-slate-900">{formatValue(Number(entry.value), unit, digits)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  data,
  seasons,
  currentSeason,
  unit = "",
  digits = 0,
  mode = "weekly",
}: {
  title: string;
  data: Record<string, string | number | null>[];
  seasons: number[];
  currentSeason: number;
  unit?: string;
  digits?: number;
  mode?: "weekly" | "monthly" | "pmc";
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 180 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const update = () => {
      const width = Math.max(250, Math.round(element.clientWidth));
      const height = Math.max(180, Math.round(element.clientHeight || 180));
      setChartSize((current) => (current.width === width && current.height === height ? current : { width, height }));
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const xTicks = mode === "monthly" ? undefined : getWeeklyTicks(Number(data.at(-1)?.period ?? 1));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="text-[15px] font-medium text-slate-900">{title}</div>
      <div ref={containerRef} className="mt-3 h-44 w-full">
        {chartSize.width > 0 ? (
          <LineChart width={chartSize.width} height={chartSize.height} data={data} margin={{ top: 6, right: 8, bottom: 0, left: -10 }}>
            <CartesianGrid vertical={false} stroke="#eef2f7" />
            {mode === "monthly" ? (
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            ) : (
              <XAxis
                dataKey="period"
                type="number"
                domain={["dataMin", "dataMax"]}
                ticks={xTicks}
                tickFormatter={(value) => weekToMonthLabel(Number(value))}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
            )}
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={36} />
            <Tooltip content={<ChartTooltip unit={unit} digits={digits} currentSeason={currentSeason} />} />
            {seasons.map((season) => (
              <Line
                key={season}
                type="monotone"
                dataKey={`Saison ${season}`}
                stroke={seasonColor(season, seasons, currentSeason)}
                strokeWidth={season === currentSeason ? 2.7 : 1.8}
                strokeOpacity={season === currentSeason ? 1 : 0.9}
                dot={false}
                connectNulls={false}
              />
            ))}
          </LineChart>
        ) : (
          <div className="h-full rounded-2xl bg-slate-50" />
        )}
      </div>
    </div>
  );
}

function EquivalentDateCard({
  seasonRange,
  currentWeek,
}: {
  seasonRange: string;
  currentWeek: number;
}) {
  const progress = getSeasonProgress(currentWeek);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">A date equivalente</div>
      <div className="mt-4 text-slate-500">Comparaison jusqu&apos;a la semaine</div>
      <div className="mt-1 text-4xl font-semibold text-slate-950">{currentWeek}</div>

      <div className="mt-8 text-sm text-slate-400">Saison en cours</div>
      <div className="mt-2 flex items-end justify-between gap-4">
        <div className="text-2xl font-semibold text-slate-950">{seasonRange}</div>
        <div className="text-xl font-semibold text-slate-950">{progress}%</div>
      </div>
      <div className="mt-1 text-right text-sm text-slate-400">de la saison ecoulee</div>

      <div className="mt-4 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
	  );
	}

function MobileKpiCard({
  title,
  value,
  delta,
  comparisonLabel,
}: {
  title: string;
  value: string;
  delta?: string | null;
  comparisonLabel: string;
}) {
  return (
    <div className="min-w-[168px] rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</div>
      <div className="mt-2 text-[1.6rem] font-semibold leading-none text-slate-950">{value}</div>
      <div className={`mt-2 text-sm ${delta?.startsWith("+") ? "text-emerald-600" : "text-slate-500"}`}>
        {delta ?? "—"}
      </div>
      <div className="mt-1 text-[0.72rem] text-slate-400">{comparisonLabel}</div>
    </div>
  );
}

function MobileSectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
    </div>
  );
}

function MobileMetricSelector<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { key: T; label: string }[];
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${
            value === option.key ? "bg-indigo-600 font-semibold text-white" : "bg-white text-slate-600 shadow-[0_4px_12px_rgba(15,23,42,0.05)]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function MobileSummaryCard({
  seasonRange,
  currentWeek,
  tssDelta,
  hoursDelta,
  tsb,
}: {
  seasonRange: string;
  currentWeek: number;
  tssDelta?: string | null;
  hoursDelta?: string | null;
  tsb: number;
}) {
  const tssSentence = tssDelta
    ? tssDelta.startsWith("+")
      ? `Le TSS est en hausse de ${tssDelta.replace("+", "")} vs la saison precedente.`
      : `Le TSS est en retrait de ${tssDelta.replace("-", "")} vs la saison precedente.`
    : "Le TSS est stable vs la saison precedente.";

  const hoursSentence = hoursDelta
    ? hoursDelta.startsWith("+")
      ? `Le volume horaire est en hausse de ${hoursDelta.replace("+", "")}.`
      : `Le volume horaire est en retrait de ${hoursDelta.replace("-", "")}.`
    : "Le volume horaire est stable.";

  const tsbSentence =
    tsb <= -10
      ? `La fatigue recente est elevee avec un TSB de ${formatValue(tsb, "", 1)}.`
      : tsb >= 5
        ? `La fraicheur est bonne avec un TSB de ${formatValue(tsb, "", 1)}.`
        : `Le TSB reste equilibre a ${formatValue(tsb, "", 1)}.`;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="text-sm font-semibold text-slate-950">Saison {seasonRange}</div>
      <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
        <p>Tu es a la semaine {currentWeek}.</p>
        <p>{tssSentence}</p>
        <p>{hoursSentence}</p>
        <p>{tsbSentence}</p>
      </div>
    </div>
  );
}

function MobileActivityCard({ activity }: { activity: Activity }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-950">{formatDate(activity.date)}</div>
          <div className="mt-1 truncate text-sm text-slate-600">{activity.title || "Activite sans titre"}</div>
        </div>
        <div className="shrink-0 rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-700">
          {formatValue(activity.tss_final)}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
        <span>{formatValue(activity.duration_hours, " h", 1)}</span>
        <span>{formatValue(activity.distance_km, " km", 1)}</span>
        <span>{sourceLabel(activity.tss_source as any)}</span>
      </div>
    </div>
  );
}

function MobileImportCard({ item }: { item: ImportRow }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-950">{item.file_name || "Import CSV"}</div>
          <div className="mt-1 text-xs text-slate-400">{formatDate(item.created_at, true)}</div>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {item.pmc_status || "—"}
        </span>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-slate-500">
        <span>{Number(item.activities_upserted ?? 0)} act.</span>
        <span>{Number(item.duplicates_ignored ?? 0)} doublons</span>
      </div>
    </div>
  );
}

function SourceSummaryCard({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</div>
      <div className="mt-3 text-2xl font-semibold text-slate-950">{count}</div>
      <div className="mt-1 text-xs text-slate-400">activites</div>
    </div>
  );
}

function RecordsView({
  bestWeeks,
  bestMonths,
  biggestActivities,
}: {
  bestWeeks: MetricRow[];
  bestMonths: MetricRow[];
  biggestActivities: Activity[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="text-[15px] font-medium text-slate-900">Meilleures semaines</div>
        <div className="mt-4 space-y-3">
          {bestWeeks.map((row) => (
            <div key={`${row.season}-${row.period}`} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
              <div>
                <div className="text-sm font-medium text-slate-900">S{row.period} - {row.season}</div>
                <div className="text-xs text-slate-400">{formatValue(row.hours, " h", 1)} · {formatValue(row.distance, " km", 1)}</div>
              </div>
              <div className="text-right text-lg font-semibold text-slate-950">{formatValue(row.tss)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="text-[15px] font-medium text-slate-900">Meilleurs mois</div>
        <div className="mt-4 space-y-3">
          {bestMonths.map((row) => (
            <div key={`${row.season}-${row.period}`} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
              <div>
                <div className="text-sm font-medium text-slate-900">{row.label} {row.season}</div>
                <div className="text-xs text-slate-400">{formatValue(row.hours, " h", 1)} · {formatValue(row.distance, " km", 1)}</div>
              </div>
              <div className="text-right text-lg font-semibold text-slate-950">{formatValue(row.tss)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="text-[15px] font-medium text-slate-900">Plus grosses sorties</div>
        <div className="mt-4 space-y-3">
          {biggestActivities.map((activity) => (
            <div key={`${activity.date}-${activity.title ?? ""}`} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900">{activity.title || "Sortie sans titre"}</div>
                  <div className="text-xs text-slate-400">{formatDate(activity.date)} · saison {activity.season}</div>
                </div>
                <div className="shrink-0 text-lg font-semibold text-slate-950">{formatValue(activity.tss_final)}</div>
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {formatValue(activity.duration_hours, " h", 1)} · {formatValue(activity.distance_km, " km", 1)} · {formatValue(activity.elevation_m, " m")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProjectionsView({
  projections,
  currentWeek,
  previousSeason,
}: {
  projections: { label: string; current: number; pace: number; projected: number; previousFull: number; unit: string; digits: number }[];
  currentWeek: number;
  previousSeason: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
      {projections.map((projection) => {
        const delta = formatDelta(projection.projected, projection.previousFull);

        return (
          <div key={projection.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{projection.label}</div>
            <div className="mt-4 text-sm text-slate-400">Projection fin de saison</div>
            <div className="mt-1 text-3xl font-semibold text-slate-950">
              {formatValue(projection.projected, projection.unit, projection.digits)}
            </div>
            {delta && (
              <div className={`mt-2 text-sm ${delta.startsWith("+") ? "text-emerald-600" : "text-rose-500"}`}>
                {delta} vs saison {previousSeason}
              </div>
            )}
            <div className="mt-6 space-y-2 text-sm text-slate-500">
              <div className="flex justify-between gap-4">
                <span>Actuel S{currentWeek}</span>
                <span className="font-medium text-slate-900">{formatValue(projection.current, projection.unit, projection.digits)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Rythme / sem.</span>
                <span className="font-medium text-slate-900">{formatValue(projection.pace, projection.unit, projection.digits)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Saison {previousSeason}</span>
                <span className="font-medium text-slate-900">{formatValue(projection.previousFull, projection.unit, projection.digits)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardCharts({
  activities = [],
  pmc = [],
  imports = [],
  initialView = "synthese",
}: {
  activities?: Activity[];
  pmc?: Pmc[];
  imports?: ImportRow[];
  initialView?: DashboardView;
}) {
  const [tab, setTab] = useState<DashboardView>(initialView);
  const [mobileWeeklyMetric, setMobileWeeklyMetric] = useState<"tss" | "hours" | "distance" | "elevation">("tss");
  const [mobileMonthlyMetric, setMobileMonthlyMetric] = useState<"tss" | "hours" | "distance" | "elevation">("tss");
  const [mobileCumulativeMetric, setMobileCumulativeMetric] = useState<"tss" | "hours" | "distance" | "elevation">("tss");
  const [mobilePmcMetric, setMobilePmcMetric] = useState<"ctl" | "atl" | "tsb">("tsb");

  useEffect(() => {
    setTab(initialView);
  }, [initialView]);

  const data = useMemo(() => {
    if (!activities.length) return null;

    const latestActivitySeason = latestSeason(activities);
    const latestComputedPmcSeason = pmc.length ? latestPmcSeason(pmc) : latestActivitySeason;
    const currentSeason = Math.max(latestActivitySeason, latestComputedPmcSeason);
    const latestActivityWeek = activities.some((activity) => Number(activity.season) === currentSeason)
      ? latestWeek(activities, currentSeason)
      : 0;
    const latestComputedPmcWeek = pmc.some((row) => Number(row.season) === currentSeason)
      ? latestPmcWeek(pmc, currentSeason)
      : 0;
    const currentWeek = Math.max(latestActivityWeek, latestComputedPmcWeek);
    const previousSeason = currentSeason - 1;
    const seasons = Array.from(new Set(activities.filter((activity) => Number(activity.week_in_season) <= currentWeek).map((activity) => Number(activity.season)))).sort((a, b) => a - b);

    const scopedActivities = activities.filter((activity) => Number(activity.week_in_season) <= currentWeek);
    const scopedPmc = pmc.filter((row) => Number(row.week_in_season) <= currentWeek);
    const currentActivities = activities.filter((activity) => Number(activity.season) === currentSeason && Number(activity.week_in_season) <= currentWeek);
    const previousActivities = activities.filter((activity) => Number(activity.season) === previousSeason && Number(activity.week_in_season) <= currentWeek);
    const previousFullActivities = activities.filter((activity) => Number(activity.season) === previousSeason);
    const recentActivities = [...currentActivities]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
    const recentImports = [...imports]
      .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
      .slice(0, 4);

    const weekly = groupActivitiesByPeriod(scopedActivities, "week_in_season", currentWeek);
    const monthly = groupActivitiesByPeriod(scopedActivities, "month_in_season", 12);
    const cumulativeWeekly = cumulative(weekly, "tss");
    const cumulativeHours = cumulative(weekly, "hours");
    const cumulativeDistance = cumulative(weekly, "distance");
    const cumulativeElevation = cumulative(weekly, "elevation");
    const pmcWeekly = groupPmcByWeek(scopedPmc, currentWeek);

    const latestPmcOverall = [...pmc]
      .sort((a, b) => new Date(a.date_day).getTime() - new Date(b.date_day).getTime())
      .at(-1);

    const currentPmc = pmc
      .filter((row) => Number(row.season) === currentSeason)
      .sort((a, b) => new Date(a.date_day).getTime() - new Date(b.date_day).getTime())
      .at(-1) ?? latestPmcOverall;

    const previousPmcSameWeek = pmc
      .filter((row) => Number(row.season) === previousSeason && Number(row.week_in_season) === currentWeek)
      .sort((a, b) => new Date(a.date_day).getTime() - new Date(b.date_day).getTime())
      .at(-1) ??
      pmc
        .filter((row) => Number(row.season) === previousSeason)
        .sort((a, b) => new Date(a.date_day).getTime() - new Date(b.date_day).getTime())
        .at(-1);

    const weeklyTss = movingAverage(pivotBySeason(weekly, "tss", seasons, currentWeek, "weekly"), seasons);
    const weeklyHours = movingAverage(pivotBySeason(weekly, "hours", seasons, currentWeek, "weekly"), seasons);
    const weeklyDistance = movingAverage(pivotBySeason(weekly, "distance", seasons, currentWeek, "weekly"), seasons);
    const weeklyElevation = movingAverage(pivotBySeason(weekly, "elevation", seasons, currentWeek, "weekly"), seasons);
    const tssSourceCounts = Array.from(
      currentActivities.reduce((map, activity) => {
        const key = String(activity.tss_source ?? "unknown");
        map.set(key, (map.get(key) ?? 0) + 1);
        return map;
      }, new Map<string, number>())
    )
      .map(([key, count]) => ({ key, label: sourceLabel(key), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    return {
      currentSeason,
      currentWeek,
      seasonRange: `${currentSeason - 1} / ${currentSeason}`,
      seasons,
      lastSync: currentPmc?.date_day ?? activities.at(-1)?.date ?? null,
      kpis: {
        tss: sum(currentActivities, "tss_final"),
        hours: sum(currentActivities, "duration_hours"),
        distance: sum(currentActivities, "distance_km"),
        elevation: sum(currentActivities, "elevation_m"),
      },
      previousKpis: {
        tss: sum(previousActivities, "tss_final"),
        hours: sum(previousActivities, "duration_hours"),
        distance: sum(previousActivities, "distance_km"),
        elevation: sum(previousActivities, "elevation_m"),
      },
      previousSeason,
      comparisonLabel: `vs meme semaine saison ${previousSeason}`,
      currentPmc,
      previousPmcSameWeek,
      records: {
        bestWeeks: [...weekly].sort((a, b) => Number(b.tss ?? 0) - Number(a.tss ?? 0)).slice(0, 6),
        bestMonths: [...monthly].sort((a, b) => Number(b.tss ?? 0) - Number(a.tss ?? 0)).slice(0, 6),
        biggestActivities: [...scopedActivities].sort((a, b) => Number(b.tss_final ?? 0) - Number(a.tss_final ?? 0)).slice(0, 6),
      },
      mobileData: {
        recentActivities,
        recentImports,
        tssSourceCounts,
      },
      projections: [
        {
          label: "TSS saison",
          current: sum(currentActivities, "tss_final"),
          pace: sum(currentActivities, "tss_final") / Math.max(1, currentWeek),
          projected: (sum(currentActivities, "tss_final") / Math.max(1, currentWeek)) * 52,
          previousFull: sum(previousFullActivities, "tss_final"),
          unit: "",
          digits: 0,
        },
        {
          label: "Heures",
          current: sum(currentActivities, "duration_hours"),
          pace: sum(currentActivities, "duration_hours") / Math.max(1, currentWeek),
          projected: (sum(currentActivities, "duration_hours") / Math.max(1, currentWeek)) * 52,
          previousFull: sum(previousFullActivities, "duration_hours"),
          unit: " h",
          digits: 1,
        },
        {
          label: "Distance",
          current: sum(currentActivities, "distance_km"),
          pace: sum(currentActivities, "distance_km") / Math.max(1, currentWeek),
          projected: (sum(currentActivities, "distance_km") / Math.max(1, currentWeek)) * 52,
          previousFull: sum(previousFullActivities, "distance_km"),
          unit: " km",
          digits: 1,
        },
        {
          label: "D+",
          current: sum(currentActivities, "elevation_m"),
          pace: sum(currentActivities, "elevation_m") / Math.max(1, currentWeek),
          projected: (sum(currentActivities, "elevation_m") / Math.max(1, currentWeek)) * 52,
          previousFull: sum(previousFullActivities, "elevation_m"),
          unit: " m",
          digits: 0,
        },
      ],
      topCharts: {
        weeklyTss,
        weeklyHours,
        weeklyDistance,
        weeklyElevation,
        monthlyTss: pivotBySeason(monthly, "tss", seasons, 12, "monthly"),
        monthlyHours: pivotBySeason(monthly, "hours", seasons, 12, "monthly"),
        monthlyDistance: pivotBySeason(monthly, "distance", seasons, 12, "monthly"),
        monthlyElevation: pivotBySeason(monthly, "elevation", seasons, 12, "monthly"),
        cumulativeTss: fillForwardBySeason(pivotBySeason(cumulativeWeekly, "tss", seasons, currentWeek, "weekly"), seasons),
        cumulativeHours: fillForwardBySeason(pivotBySeason(cumulativeHours, "hours", seasons, currentWeek, "weekly"), seasons),
        cumulativeDistance: fillForwardBySeason(pivotBySeason(cumulativeDistance, "distance", seasons, currentWeek, "weekly"), seasons),
        cumulativeElevation: fillForwardBySeason(pivotBySeason(cumulativeElevation, "elevation", seasons, currentWeek, "weekly"), seasons),
        pmcCtl: pivotBySeason(pmcWeekly, "ctl", seasons, currentWeek, "weekly"),
        pmcAtl: pivotBySeason(pmcWeekly, "atl", seasons, currentWeek, "weekly"),
        pmcTsb: pivotBySeason(pmcWeekly, "tsb", seasons, currentWeek, "weekly"),
      },
    };
  }, [activities, imports, pmc]);

  if (!data) {
    return <div className="rounded-3xl bg-white p-8">Aucune donnée pour le moment.</div>;
  }

  const currentSeasonSeries = {
    tss: getSeasonSeries(data.topCharts.cumulativeTss, data.currentSeason),
    hours: getSeasonSeries(data.topCharts.cumulativeHours, data.currentSeason),
    distance: getSeasonSeries(data.topCharts.cumulativeDistance, data.currentSeason),
    elevation: getSeasonSeries(data.topCharts.cumulativeElevation, data.currentSeason),
  };

  const topChartRows =
    tab === "mensuel"
      ? [
          { title: "TSS mensuel", data: data.topCharts.monthlyTss, unit: "", digits: 0, mode: "monthly" as const },
          { title: "Heures mensuelles", data: data.topCharts.monthlyHours, unit: " h", digits: 1, mode: "monthly" as const },
          { title: "Distance mensuelle", data: data.topCharts.monthlyDistance, unit: " km", digits: 1, mode: "monthly" as const },
          { title: "D+ mensuel", data: data.topCharts.monthlyElevation, unit: " m", digits: 0, mode: "monthly" as const },
        ]
      : tab === "cumule"
        ? [
            { title: "TSS cumule", data: data.topCharts.cumulativeTss, unit: "", digits: 0, mode: "weekly" as const },
            { title: "Heures cumulees", data: data.topCharts.cumulativeHours, unit: " h", digits: 1, mode: "weekly" as const },
            { title: "Distance cumulee", data: data.topCharts.cumulativeDistance, unit: " km", digits: 1, mode: "weekly" as const },
            { title: "D+ cumule", data: data.topCharts.cumulativeElevation, unit: " m", digits: 0, mode: "weekly" as const },
          ]
        : tab === "pmc"
          ? [
              { title: "CTL (Fitness)", data: data.topCharts.pmcCtl, unit: "", digits: 1, mode: "pmc" as const },
              { title: "ATL (Fatigue)", data: data.topCharts.pmcAtl, unit: "", digits: 1, mode: "pmc" as const },
              { title: "TSB (Forme)", data: data.topCharts.pmcTsb, unit: "", digits: 1, mode: "pmc" as const },
            ]
          : tab === "records" || tab === "projections" || tab === "donnees"
            ? []
          : [
              { title: "TSS hebdo (moy. 4 sem.)", data: data.topCharts.weeklyTss, unit: "", digits: 0, mode: "weekly" as const },
              { title: "Heures hebdo (moy. 4 sem.)", data: data.topCharts.weeklyHours, unit: " h", digits: 1, mode: "weekly" as const },
              { title: "Distance hebdo (moy. 4 sem.)", data: data.topCharts.weeklyDistance, unit: " km", digits: 1, mode: "weekly" as const },
              { title: "D+ hebdo (moy. 4 sem.)", data: data.topCharts.weeklyElevation, unit: " m", digits: 0, mode: "weekly" as const },
              { title: "TSS cumule", data: data.topCharts.cumulativeTss, unit: "", digits: 0, mode: "weekly" as const },
              { title: "Heures cumulees", data: data.topCharts.cumulativeHours, unit: " h", digits: 1, mode: "weekly" as const },
              { title: "Distance cumulee", data: data.topCharts.cumulativeDistance, unit: " km", digits: 1, mode: "weekly" as const },
              { title: "D+ cumule", data: data.topCharts.cumulativeElevation, unit: " m", digits: 0, mode: "weekly" as const },
            ];

  const mobileWeeklyCharts = {
    tss: { title: "TSS hebdo", data: data.topCharts.weeklyTss, unit: "", digits: 0, mode: "weekly" as const },
    hours: { title: "Heures hebdo", data: data.topCharts.weeklyHours, unit: " h", digits: 1, mode: "weekly" as const },
    distance: { title: "Distance hebdo", data: data.topCharts.weeklyDistance, unit: " km", digits: 1, mode: "weekly" as const },
    elevation: { title: "D+ hebdo", data: data.topCharts.weeklyElevation, unit: " m", digits: 0, mode: "weekly" as const },
  };

  const mobileMonthlyCharts = {
    tss: { title: "TSS mensuel", data: data.topCharts.monthlyTss, unit: "", digits: 0, mode: "monthly" as const },
    hours: { title: "Heures mensuelles", data: data.topCharts.monthlyHours, unit: " h", digits: 1, mode: "monthly" as const },
    distance: { title: "Distance mensuelle", data: data.topCharts.monthlyDistance, unit: " km", digits: 1, mode: "monthly" as const },
    elevation: { title: "D+ mensuel", data: data.topCharts.monthlyElevation, unit: " m", digits: 0, mode: "monthly" as const },
  };

  const mobileCumulativeCharts = {
    tss: { title: "TSS cumule", data: data.topCharts.cumulativeTss, unit: "", digits: 0, mode: "weekly" as const },
    hours: { title: "Heures cumulees", data: data.topCharts.cumulativeHours, unit: " h", digits: 1, mode: "weekly" as const },
    distance: { title: "Distance cumulee", data: data.topCharts.cumulativeDistance, unit: " km", digits: 1, mode: "weekly" as const },
    elevation: { title: "D+ cumule", data: data.topCharts.cumulativeElevation, unit: " m", digits: 0, mode: "weekly" as const },
  };

  const mobilePmcCharts = {
    ctl: { title: "CTL", data: data.topCharts.pmcCtl, unit: "", digits: 1, mode: "pmc" as const },
    atl: { title: "ATL", data: data.topCharts.pmcAtl, unit: "", digits: 1, mode: "pmc" as const },
    tsb: { title: "TSB", data: data.topCharts.pmcTsb, unit: "", digits: 1, mode: "pmc" as const },
  };

  return (
    <div className="space-y-6">
      <div className="space-y-5 lg:hidden">
        {tab === "synthese" && (
          <>
            <MobileSectionTitle
              title={`Saison ${data.seasonRange}`}
              subtitle={`Semaine ${data.currentWeek} · consultation mobile`}
            />

            <div className="-mx-4 overflow-x-auto px-4 pb-1">
              <div className="flex gap-3">
                <MobileKpiCard
                  title="TSS saison"
                  value={formatValue(data.kpis.tss)}
                  delta={formatDelta(data.kpis.tss, data.previousKpis.tss)}
                  comparisonLabel={data.comparisonLabel}
                />
                <MobileKpiCard
                  title="Heures"
                  value={formatValue(data.kpis.hours, " h")}
                  delta={formatDelta(data.kpis.hours, data.previousKpis.hours)}
                  comparisonLabel={data.comparisonLabel}
                />
                <MobileKpiCard
                  title="Distance"
                  value={formatValue(data.kpis.distance, " km")}
                  delta={formatDelta(data.kpis.distance, data.previousKpis.distance)}
                  comparisonLabel={data.comparisonLabel}
                />
                <MobileKpiCard
                  title="D+"
                  value={formatValue(data.kpis.elevation, " m")}
                  delta={formatDelta(data.kpis.elevation, data.previousKpis.elevation)}
                  comparisonLabel={data.comparisonLabel}
                />
                <MobileKpiCard
                  title="CTL"
                  value={formatValue(Number(data.currentPmc?.ctl ?? 0), "", 1)}
                  delta={formatDelta(Number(data.currentPmc?.ctl ?? 0), Number(data.previousPmcSameWeek?.ctl ?? 0))}
                  comparisonLabel={data.comparisonLabel}
                />
                <MobileKpiCard
                  title="ATL"
                  value={formatValue(Number(data.currentPmc?.atl ?? 0), "", 1)}
                  delta={formatDelta(Number(data.currentPmc?.atl ?? 0), Number(data.previousPmcSameWeek?.atl ?? 0))}
                  comparisonLabel={data.comparisonLabel}
                />
                <MobileKpiCard
                  title="TSB"
                  value={formatValue(Number(data.currentPmc?.tsb ?? 0), "", 1)}
                  delta={formatDelta(Number(data.currentPmc?.tsb ?? 0), Number(data.previousPmcSameWeek?.tsb ?? 0))}
                  comparisonLabel={data.comparisonLabel}
                />
              </div>
            </div>

            <ChartCard
              title="TSS hebdo"
              data={data.topCharts.weeklyTss}
              seasons={data.seasons}
              currentSeason={data.currentSeason}
              unit=""
              digits={0}
              mode="weekly"
            />

            <ChartCard
              title="TSB - forme"
              data={data.topCharts.pmcTsb}
              seasons={data.seasons}
              currentSeason={data.currentSeason}
              digits={1}
              mode="pmc"
            />

            <CurrentFormCard
              ctl={Number(data.currentPmc?.ctl ?? 0)}
              atl={Number(data.currentPmc?.atl ?? 0)}
              tsb={Number(data.currentPmc?.tsb ?? 0)}
              ctlDelta={formatDelta(Number(data.currentPmc?.ctl ?? 0), Number(data.previousPmcSameWeek?.ctl ?? 0))}
              atlDelta={formatDelta(Number(data.currentPmc?.atl ?? 0), Number(data.previousPmcSameWeek?.atl ?? 0))}
              tsbDelta={formatDelta(Number(data.currentPmc?.tsb ?? 0), Number(data.previousPmcSameWeek?.tsb ?? 0))}
              comparisonLabel={data.comparisonLabel}
            />

            <MobileSummaryCard
              seasonRange={data.seasonRange}
              currentWeek={data.currentWeek}
              tssDelta={formatDelta(data.kpis.tss, data.previousKpis.tss)}
              hoursDelta={formatDelta(data.kpis.hours, data.previousKpis.hours)}
              tsb={Number(data.currentPmc?.tsb ?? 0)}
            />
          </>
        )}

        {tab === "hebdo" && (
          <div className="space-y-4">
            <MobileSectionTitle title="Hebdo" subtitle="Une metrique a la fois, semaine par semaine." />
            <MobileMetricSelector
              value={mobileWeeklyMetric}
              onChange={setMobileWeeklyMetric}
              options={[
                { key: "tss", label: "TSS" },
                { key: "hours", label: "Heures" },
                { key: "distance", label: "Distance" },
                { key: "elevation", label: "D+" },
              ]}
            />
            <ChartCard
              title={mobileWeeklyCharts[mobileWeeklyMetric].title}
              data={mobileWeeklyCharts[mobileWeeklyMetric].data}
              seasons={data.seasons}
              currentSeason={data.currentSeason}
              unit={mobileWeeklyCharts[mobileWeeklyMetric].unit}
              digits={mobileWeeklyCharts[mobileWeeklyMetric].digits}
              mode={mobileWeeklyCharts[mobileWeeklyMetric].mode}
            />
          </div>
        )}

        {tab === "mensuel" && (
          <div className="space-y-4">
            <MobileSectionTitle title="Mensuel" subtitle="Lecture mensuelle sur une metrique choisie." />
            <MobileMetricSelector
              value={mobileMonthlyMetric}
              onChange={setMobileMonthlyMetric}
              options={[
                { key: "tss", label: "TSS" },
                { key: "hours", label: "Heures" },
                { key: "distance", label: "Distance" },
                { key: "elevation", label: "D+" },
              ]}
            />
            <ChartCard
              title={mobileMonthlyCharts[mobileMonthlyMetric].title}
              data={mobileMonthlyCharts[mobileMonthlyMetric].data}
              seasons={data.seasons}
              currentSeason={data.currentSeason}
              unit={mobileMonthlyCharts[mobileMonthlyMetric].unit}
              digits={mobileMonthlyCharts[mobileMonthlyMetric].digits}
              mode={mobileMonthlyCharts[mobileMonthlyMetric].mode}
            />
          </div>
        )}

        {tab === "cumule" && (
          <div className="space-y-4">
            <MobileSectionTitle title="Cumule" subtitle="Voir si la saison avance ou retarde." />
            <MobileMetricSelector
              value={mobileCumulativeMetric}
              onChange={setMobileCumulativeMetric}
              options={[
                { key: "tss", label: "TSS" },
                { key: "hours", label: "Heures" },
                { key: "distance", label: "Distance" },
                { key: "elevation", label: "D+" },
              ]}
            />
            <ChartCard
              title={mobileCumulativeCharts[mobileCumulativeMetric].title}
              data={mobileCumulativeCharts[mobileCumulativeMetric].data}
              seasons={data.seasons}
              currentSeason={data.currentSeason}
              unit={mobileCumulativeCharts[mobileCumulativeMetric].unit}
              digits={mobileCumulativeCharts[mobileCumulativeMetric].digits}
              mode={mobileCumulativeCharts[mobileCumulativeMetric].mode}
            />
          </div>
        )}

        {tab === "pmc" && (
          <div className="space-y-4">
            <MobileSectionTitle title="PMC" subtitle="Charge d'entrainement par semaine de saison." />
            <MobileMetricSelector
              value={mobilePmcMetric}
              onChange={setMobilePmcMetric}
              options={[
                { key: "ctl", label: "CTL" },
                { key: "atl", label: "ATL" },
                { key: "tsb", label: "TSB" },
              ]}
            />
            <ChartCard
              title={mobilePmcCharts[mobilePmcMetric].title}
              data={mobilePmcCharts[mobilePmcMetric].data}
              seasons={data.seasons}
              currentSeason={data.currentSeason}
              unit={mobilePmcCharts[mobilePmcMetric].unit}
              digits={mobilePmcCharts[mobilePmcMetric].digits}
              mode={mobilePmcCharts[mobilePmcMetric].mode}
            />
            <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
              CTL = fitness long terme. ATL = fatigue recente. TSB = fraicheur.
            </div>
          </div>
        )}

        {tab === "donnees" && (
          <div className="space-y-5">
            <MobileSectionTitle title="Donnees" subtitle="Activites recentes, imports et sources TSS." />

            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-900">Dernieres activites</div>
              {data.mobileData.recentActivities.map((activity) => (
                <MobileActivityCard key={`${activity.date}-${activity.title ?? ""}`} activity={activity} />
              ))}
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-900">Imports recents</div>
              {data.mobileData.recentImports.length ? (
                data.mobileData.recentImports.map((item) => <MobileImportCard key={item.id} item={item} />)
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                  Aucun import recent.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold text-slate-900">Sources TSS</div>
              <div className="grid grid-cols-2 gap-3">
                {data.mobileData.tssSourceCounts.map((source, index) => (
                  <SourceSummaryCard
                    key={source.key}
                    label={source.label}
                    count={source.count}
                    tone={sourceTone(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "records" && (
          <RecordsView
            bestWeeks={data.records.bestWeeks}
            bestMonths={data.records.bestMonths}
            biggestActivities={data.records.biggestActivities}
          />
        )}

        {tab === "projections" && (
          <ProjectionsView
            projections={data.projections}
            currentWeek={data.currentWeek}
            previousSeason={data.previousSeason}
          />
        )}
      </div>

      <div className="hidden lg:block">
      <div className="flex flex-col gap-4 rounded-[2rem] bg-transparent p-1 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold text-slate-950">Bonjour !</h1>
          <p className="mt-1.5 text-[0.98rem] text-slate-500">
            Voici un apercu de la saison {data.seasonRange} jusqu&apos;a la semaine {data.currentWeek}.
          </p>
        </div>
        <div className="flex items-center gap-5">
          <HeaderAction label="Derniere sync" value={formatDate(data.lastSync, true)} />
          <Link
            href="/upload"
            className="inline-flex items-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(79,70,229,0.28)]"
          >
            Importer un fichier
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_1fr_1fr_1.22fr]">
        <KpiCard
          iconBg="bg-violet-500"
          icon="↯"
          title="TSS saison"
          value={formatValue(data.kpis.tss)}
          delta={formatDelta(data.kpis.tss, data.previousKpis.tss)}
          comparisonLabel={data.comparisonLabel}
          sparkline={currentSeasonSeries.tss}
          sparklineColor={CURRENT_SEASON_COLOR}
        />
        <KpiCard
          iconBg="bg-emerald-500"
          icon="◔"
          title="Heures"
          value={formatValue(data.kpis.hours, " h")}
          delta={formatDelta(data.kpis.hours, data.previousKpis.hours)}
          comparisonLabel={data.comparisonLabel}
          sparkline={currentSeasonSeries.hours}
          sparklineColor="#22c55e"
        />
        <KpiCard
          iconBg="bg-blue-500"
          icon="∕\\"
          title="Distance"
          value={formatValue(data.kpis.distance, " km")}
          delta={formatDelta(data.kpis.distance, data.previousKpis.distance)}
          comparisonLabel={data.comparisonLabel}
          sparkline={currentSeasonSeries.distance}
          sparklineColor="#3b82f6"
        />
        <KpiCard
          iconBg="bg-orange-500"
          icon="△"
          title="D+"
          value={formatValue(data.kpis.elevation, " m")}
          delta={formatDelta(data.kpis.elevation, data.previousKpis.elevation)}
          comparisonLabel={data.comparisonLabel}
          sparkline={currentSeasonSeries.elevation}
          sparklineColor="#f97316"
        />
        <CurrentFormCard
          ctl={Number(data.currentPmc?.ctl ?? 0)}
          atl={Number(data.currentPmc?.atl ?? 0)}
          tsb={Number(data.currentPmc?.tsb ?? 0)}
          ctlDelta={formatDelta(Number(data.currentPmc?.ctl ?? 0), Number(data.previousPmcSameWeek?.ctl ?? 0))}
          atlDelta={formatDelta(Number(data.currentPmc?.atl ?? 0), Number(data.previousPmcSameWeek?.atl ?? 0))}
          tsbDelta={formatDelta(Number(data.currentPmc?.tsb ?? 0), Number(data.previousPmcSameWeek?.tsb ?? 0))}
          comparisonLabel={data.comparisonLabel}
        />
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-6 text-sm font-medium text-slate-500">
            {[
              ["synthese", "Synthese"],
              ["hebdo", "Hebdomadaire"],
              ["mensuel", "Mensuel"],
              ["cumule", "Cumule"],
              ["pmc", "PMC"],
              ["donnees", "Donnees"],
              ["records", "Records"],
              ["projections", "Projections"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  setTab(key as DashboardView);
                  window.history.replaceState(null, "", key === "synthese" ? "/dashboard" : `/dashboard?view=${key}`);
                }}
                className={`relative pb-2 uppercase tracking-wide ${
                  tab === key ? "font-semibold text-violet-600" : "text-slate-500"
                }`}
              >
                {label}
                {tab === key && <span className="absolute inset-x-0 -bottom-4 h-0.5 rounded-full bg-violet-600" />}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <button className="inline-flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
              Comparer les saisons
            </button>
            <LegendRow seasons={data.seasons} currentSeason={data.currentSeason} />
          </div>
        </div>

        <div className="p-4">
          {tab === "records" ? (
            <RecordsView
              bestWeeks={data.records.bestWeeks}
              bestMonths={data.records.bestMonths}
              biggestActivities={data.records.biggestActivities}
            />
          ) : tab === "projections" ? (
            <ProjectionsView
              projections={data.projections}
              currentWeek={data.currentWeek}
              previousSeason={data.previousSeason}
            />
          ) : tab === "donnees" ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr_1fr]">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <div className="text-[15px] font-medium text-slate-900">Dernieres activites</div>
                <div className="mt-4 space-y-3">
                  {data.mobileData.recentActivities.map((activity) => (
                    <div key={`${activity.date}-${activity.title ?? ""}`} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900">{activity.title || "Activite sans titre"}</div>
                          <div className="text-xs text-slate-400">{formatDate(activity.date)} · {sourceLabel(activity.tss_source)}</div>
                        </div>
                        <div className="text-right text-lg font-semibold text-slate-950">{formatValue(activity.tss_final)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <div className="text-[15px] font-medium text-slate-900">Imports recents</div>
                <div className="mt-4 space-y-3">
                  {data.mobileData.recentImports.length ? (
                    data.mobileData.recentImports.map((item) => (
                      <div key={item.id} className="border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                        <div className="truncate text-sm font-medium text-slate-900">{item.file_name || "Import CSV"}</div>
                        <div className="mt-1 text-xs text-slate-400">{formatDate(item.created_at, true)}</div>
                        <div className="mt-2 flex gap-3 text-xs text-slate-500">
                          <span>{Number(item.activities_upserted ?? 0)} act.</span>
                          <span>{Number(item.duplicates_ignored ?? 0)} doublons</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-500">Aucun import recent.</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <div className="text-[15px] font-medium text-slate-900">Sources TSS</div>
                <div className="mt-4 grid grid-cols-1 gap-3">
                  {data.mobileData.tssSourceCounts.map((source, index) => (
                    <SourceSummaryCard
                      key={source.key}
                      label={source.label}
                      count={source.count}
                      tone={sourceTone(index)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {topChartRows.map((chart) => (
                <ChartCard
                  key={chart.title}
                  title={chart.title}
                  data={chart.data}
                  seasons={data.seasons}
                  currentSeason={data.currentSeason}
                  unit={chart.unit}
                  digits={chart.digits}
                  mode={chart.mode}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {tab !== "pmc" && tab !== "records" && tab !== "projections" && tab !== "donnees" && (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
          <h2 className="mb-4 text-xl font-semibold text-slate-950">PMC - Charge d&apos;entrainement</h2>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_1fr_300px]">
            <ChartCard title="CTL (Fitness)" data={data.topCharts.pmcCtl} seasons={data.seasons} currentSeason={data.currentSeason} digits={1} mode="pmc" />
            <ChartCard title="ATL (Fatigue)" data={data.topCharts.pmcAtl} seasons={data.seasons} currentSeason={data.currentSeason} digits={1} mode="pmc" />
            <ChartCard title="TSB (Forme)" data={data.topCharts.pmcTsb} seasons={data.seasons} currentSeason={data.currentSeason} digits={1} mode="pmc" />
            <EquivalentDateCard seasonRange={data.seasonRange} currentWeek={data.currentWeek} />
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
