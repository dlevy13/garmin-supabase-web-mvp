import { seasonContext, seasonEnd, seasonWeekCount, weekInSeason } from "./season";

// Keep the season's history visible, with room through the following month.
export function seasonChartRange(season: number, today = new Date()) {
  const context = seasonContext(today);
  if (season !== context.currentSeason || context.isTransition) {
    return { months: 12, weeks: seasonWeekCount(season) };
  }

  const currentMonth = today.getUTCMonth() === 10 && today.getUTCFullYear() === season
    ? 12
    : (today.getUTCMonth() + 2) % 12 + 1;
  const months = Math.min(12, currentMonth + 1);
  const monthEnd = new Date(Date.UTC(season - 1, 10 + months, 0, 23, 59, 59, 999));
  const end = new Date(Math.min(monthEnd.getTime(), seasonEnd(season).getTime()));
  return { months, weeks: weekInSeason(end, season) ?? seasonWeekCount(season) };
}
