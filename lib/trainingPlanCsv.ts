import { parse } from "csv-parse/sync";
import type { PlanDay } from "./trainingPlan";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const columns = ["date", "phase", "typesemaine", "dureeh", "tsscible"];

export function parsePlanCsv(text: string): PlanDay[] {
  // Try each separator with the CSV parser so quoted commas remain intact.
  let records: string[][] | undefined;
  for (const delimiter of [";", ",", "\t"]) {
    try {
      const candidate = parse(text, { delimiter, bom: true, skip_empty_lines: true, trim: true }) as string[][];
      if (candidate[0]?.length === 5 && columns.every((column) => candidate[0].map(normalize).includes(column))) {
        records = candidate;
        break;
      }
    } catch { /* Another separator may match. */ }
  }
  if (!records) throw new Error("CSV invalide. Colonnes attendues : date, phase, type semaine, durée (h), Tss cible. Vérifie aussi les séparateurs et les guillemets.");
  const headers = records[0].map(normalize);
  const dates = new Set<string>();
  const rows = records.slice(1).map((cells, index) => {
    const get = (key: string) => cells[headers.indexOf(key)];
    const fail = (message: string): never => { throw new Error(`Ligne ${index + 2} : ${message}`); };
    const rawDate = get("date");
    const fr = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const date = fr ? `${fr[3]}-${fr[2]}-${fr[1]}` : rawDate;
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || +date.slice(0, 4) < 1900 || +date.slice(0, 4) > 2200) fail("date invalide (JJ/MM/AAAA ou AAAA-MM-JJ).");
    if (dates.has(date)) fail(`date ${date} présente plusieurs fois. Une seule ligne par jour est autorisée.`);
    dates.add(date);
    const number = (key: string) => {
      const raw = get(key);
      if (raw === "") return null;
      if (!/^\d+(?:[.,]\d+)?$/.test(raw)) return fail(`valeur invalide pour ${key}. Utilise un nombre positif ou zéro.`);
      const value = Number(raw.replace(",", "."));
      if (!Number.isFinite(value) || (key === "dureeh" && value > 24) || value > 100000) return fail(`valeur hors limites pour ${key}.`);
      return value;
    };
    if (!get("phase") || !get("typesemaine")) fail("phase et type semaine sont obligatoires.");
    if (get("phase").length > 200 || get("typesemaine").length > 200) fail("phase ou type semaine trop long (200 caractères maximum).");
    return { date, phase: get("phase"), week_type: get("typesemaine"), duration_hours: number("dureeh"), tss_target: number("tsscible") };
  });
  if (!rows.length) throw new Error("Le CSV ne contient aucune journée.");
  if (rows.length > 4000) throw new Error("Maximum 4 000 journées par import.");
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

