export type PlanDay = {
  date: string;
  phase: string;
  week_type: string;
  duration_hours: number | null;
  tss_target: number | null;
};
export type ActualActivity = {
  date: string;
  title?: string | null;
  duration_hours: number | string | null;
  moving_hours?: number | string | null;
  tss_final: number | string | null;
  tss_source?: string | null;
};

export const dayKey = (date: Date) => date.toISOString().slice(0, 10);
export function monday(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return dayKey(d);
}
export function addDays(date: string, count: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + count);
  return dayKey(d);
}

export function comparePlan(plan: PlanDay[], activities: ActualActivity[], cutoff: string) {
  if (!plan.length) return [];
  const targets = new Map(plan.map((day) => [day.date, day]));
  const actual = new Map<string, ActualActivity[]>();
  for (const activity of activities) {
    const date = dayKey(new Date(activity.date));
    if (date > cutoff) continue;
    actual.set(date, [...(actual.get(date) ?? []), activity]);
  }
  const ordered = [...plan].sort((a, b) => a.date.localeCompare(b.date));
  const days = [];
  for (let date = ordered[0].date; date <= ordered.at(-1)!.date; date = addDays(date, 1)) {
    const target = targets.get(date);
    const rows = actual.get(date) ?? [];
    const elapsed = date <= cutoff;
    days.push({
      date, target, activities: rows, elapsed,
      hours: elapsed ? rows.reduce((sum, row) => sum + Number(row.duration_hours ?? row.moving_hours ?? 0), 0) : null,
      tss: elapsed ? rows.reduce((sum, row) => sum + Number(row.tss_final ?? 0), 0) : null,
      missingHours: rows.filter((row) => row.duration_hours == null && row.moving_hours == null).length,
      missingTss: rows.filter((row) => row.tss_final == null).length,
      estimated: rows.filter((row) => row.tss_source?.startsWith("estimated")).length,
    });
  }
  return days;
}

export function weeklyComparison(days: ReturnType<typeof comparePlan>) {
  const groups = new Map<string, typeof days>();
  for (const day of days) {
    const week = monday(day.date);
    groups.set(week, [...(groups.get(week) ?? []), day]);
  }
  return [...groups].map(([date, rows]) => {
    const metric = (key: "duration_hours" | "tss_target", actualKey: "hours" | "tss") => {
      // A weekly target is unknown if any day is absent or unfilled.
      const complete = rows.length === 7 && rows.every((row) => row.target?.[key] != null);
      const elapsed = rows.filter((row) => row.elapsed);
      const dueComplete = rows[0].date === date && elapsed.length > 0 && elapsed.every((row) => row.target?.[key] != null);
      return {
        planned: complete ? rows.reduce((sum, row) => sum + row.target![key]!, 0) : null,
        due: dueComplete ? elapsed.reduce((sum, row) => sum + row.target![key]!, 0) : null,
        actual: elapsed.length ? elapsed.reduce((sum, row) => sum + (row[actualKey] ?? 0), 0) : null,
      };
    };
    return { date, days: rows, phase: [...new Set(rows.map((row) => row.target?.phase).filter(Boolean))].join(" / "), weekType: [...new Set(rows.map((row) => row.target?.week_type).filter(Boolean))].join(" / "), hours: metric("duration_hours", "hours"), tss: metric("tss_target", "tss") };
  });
}
