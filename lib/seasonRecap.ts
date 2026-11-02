import { seasonFields, seasonEnd } from "./season";

export function completedSeasons(rows: { date: string }[], now: Date): number[] {
  return Array.from(new Set(rows.map((row) => seasonFields(new Date(row.date)).season)))
    .filter((season): season is number => season !== null && seasonEnd(season).getTime() < now.getTime())
    .sort((a, b) => b - a);
}

// Later imports must never change an archived season's totals or comparison.
export function recapRows<T extends { season: number }>(rows: T[], season?: number): T[] {
  return season === undefined ? rows : rows.filter((row) => row.season <= season);
}
