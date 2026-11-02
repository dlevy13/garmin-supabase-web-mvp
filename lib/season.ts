const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// A season is named after its ending year. Calendar arithmetic uses UTC
// throughout imports and PMC, so daylight saving changes cannot shift weeks.
export function seasonStart(season: number): Date {
  const novemberFirst = new Date(Date.UTC(season - 1, 10, 1));
  novemberFirst.setUTCDate(1 + (8 - novemberFirst.getUTCDay()) % 7);
  return novemberFirst;
}

// Inclusive end of exactly 52 weeks. Any following gap is outside the season.
export function seasonEnd(season: number): Date {
  return new Date(seasonStart(season).getTime() + 52 * WEEK_MS - 1);
}

export function seasonWeekCount(_season: number): number {
  return 52;
}

// Calendar cycle includes a possible transition after the 52-week season.
function cycleForDate(date: Date): number {
  const year = date.getUTCFullYear();
  return date.getTime() >= seasonStart(year + 1).getTime() ? year + 1 : year;
}

export function seasonForDate(date: Date): number | null {
  const season = cycleForDate(date);
  return date.getTime() <= seasonEnd(season).getTime() ? season : null;
}

export function weekInSeason(date: Date, season = seasonForDate(date)): number | null {
  if (season === null) return null;
  const week = Math.floor((date.getTime() - seasonStart(season).getTime()) / WEEK_MS) + 1;
  return week >= 1 && week <= 52 ? week : null;
}

export type SeasonFields = {
  season: number | null;
  week_in_season: number | null;
  month_in_season: number | null;
};

export function isInSeason<T extends SeasonFields>(row: T): row is T & {
  season: number; week_in_season: number; month_in_season: number;
} {
  return row.season !== null && row.week_in_season !== null && row.month_in_season !== null;
}

export function seasonFields(date: Date): SeasonFields {
  const season = seasonForDate(date);
  if (season === null) return { season: null, week_in_season: null, month_in_season: null };
  const month = date.getUTCMonth();
  const monthInSeason = month === 10 && season === date.getUTCFullYear()
    ? 12
    : (month + 2) % 12 + 1;
  return { season, week_in_season: weekInSeason(date, season), month_in_season: monthInSeason };
}

// Navigation keeps showing the completed season during the transition.
export function seasonContext(date: Date) {
  const fields = seasonFields(date);
  return {
    currentSeason: fields.season ?? cycleForDate(date),
    currentWeek: fields.week_in_season ?? 52,
    isTransition: fields.season === null,
  };
}
