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

export type AnnualTotal = { season: number; tss: number; hours: number; distance: number; elevation: number };

export function annualSeasonTotals(rows: {
  season: number | null; tss_final: number | null; duration_hours: number | null;
  distance_km: number | null; elevation_m: number | null;
}[], selectedSeason: number): AnnualTotal[] {
  const totals = new Map<number, AnnualTotal>();
  for (const row of rows) {
    if (row.season === null || row.season > selectedSeason) continue;
    const total = totals.get(row.season) ?? { season: row.season, tss: 0, hours: 0, distance: 0, elevation: 0 };
    total.tss += Number(row.tss_final ?? 0);
    total.hours += Number(row.duration_hours ?? 0);
    total.distance += Number(row.distance_km ?? 0);
    total.elevation += Number(row.elevation_m ?? 0);
    totals.set(row.season, total);
  }
  return [...totals.values()].sort((a, b) => b.season - a.season);
}
