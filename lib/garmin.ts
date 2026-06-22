import crypto from "crypto";

const BIKE_KEYWORDS = ["vélo", "cyclisme", "cyclisme sur route", "cyclisme en salle", "vtt", "mountain bike", "road cycling", "indoor cycling", "virtual ride", "bike", "cycling"];

function envNumber(name: string, fallback: number) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) ? v : fallback;
}

export const sportConfig = {
  ftp: envNumber("GARMIN_FTP", 250),
  thresholdHr: envNumber("GARMIN_THRESHOLD_HR", 170),
  seasonStartMonth: envNumber("GARMIN_SEASON_START_MONTH", 11),
  seasonStartDay: envNumber("GARMIN_SEASON_START_DAY", 1),
  ctlDays: envNumber("PMC_CTL_DAYS", 42),
  atlDays: envNumber("PMC_ATL_DAYS", 7)
};

function cleanKey(k: string) {
  return k.replace(/^\uFEFF/, "").trim();
}

function normalizeKey(k: string) {
  return cleanKey(k)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[®™]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase();
}

function cleanCell(value: string) {
  const trimmed = value.trim();
  return /^'[\d.,: -]+$/.test(trimmed) || trimmed === "'--" ? trimmed.slice(1) : trimmed;
}

function getValue(row: Record<string, string>, names: string[]) {
  const map = new Map<string, string>();
  Object.keys(row).forEach((k) => {
    map.set(cleanKey(k).toLowerCase(), row[k]);
    map.set(normalizeKey(k), row[k]);
  });
  for (const n of names) {
    const v = map.get(n.toLowerCase()) ?? map.get(normalizeKey(n));
    if (v !== undefined) return v;
  }
  return undefined;
}

function num(v?: string) {
  if (!v) return null;
  let s = String(v).trim().replace(/^'/, "").replace(/\u00a0/g, "").replace(/ /g, "");
  if (!s || s === "--") return null;

  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, "");
  }

  s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function durationHours(v?: string) {
  if (!v) return null;
  const parts = String(v).trim().split(",")[0].split(":").map(Number);
  if (parts.some((x) => !Number.isFinite(x))) return null;
  if (parts.length === 3) return parts[0] + parts[1] / 60 + parts[2] / 3600;
  if (parts.length === 2) return parts[0] / 60 + parts[1] / 3600;
  return null;
}

function parseDate(v?: string) {
  if (!v) return null;
  const raw = v.trim();
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    const [, dd, mm, yyyy, hh = "0", min = "0"] = m;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function season(d: Date) {
  return d.getMonth() + 1 >= sportConfig.seasonStartMonth ? d.getFullYear() + 1 : d.getFullYear();
}

function weekInSeason(d: Date, s: number) {
  const start = new Date(s - 1, sportConfig.seasonStartMonth - 1, sportConfig.seasonStartDay);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  return Math.floor((day.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1;
}

function monthInSeason(d: Date) {
  const m = d.getMonth() + 1;
  return m >= sportConfig.seasonStartMonth ? m - sportConfig.seasonStartMonth + 1 : m + (12 - sportConfig.seasonStartMonth + 1);
}

function isBike(type: string | null, title: string | null) {
  const text = `${type ?? ""} ${title ?? ""}`.toLowerCase();
  return BIKE_KEYWORDS.some((k) => text.includes(k));
}

function idFor(row: any) {
  const raw = [row.date, row.activity_type ?? "", row.title ?? "", row.duration_hours ?? "", row.distance_km ?? ""].join("|");
  return crypto.createHash("sha1").update(raw).digest("hex").slice(0, 16);
}

function tssFields(row: any) {
  const tssOriginal = row.tss_original;
  const power = row.normalized_power && row.normalized_power > 0 ? row.normalized_power : row.avg_power && row.avg_power > 0 ? row.avg_power : null;
  const intensity = power ? power / sportConfig.ftp : null;

  if (tssOriginal && tssOriginal > 0) {
    return { tss_final: tssOriginal, tss_source: "garmin", ftp_used: null, threshold_hr_used: null, intensity_factor: intensity };
  }

  const duration = row.duration_hours && row.duration_hours > 0 ? row.duration_hours : row.moving_hours && row.moving_hours > 0 ? row.moving_hours : null;
  if (!duration) {
    return { tss_final: null, tss_source: "missing_duration", ftp_used: null, threshold_hr_used: null, intensity_factor: intensity };
  }

  if (power && sportConfig.ftp > 0) {
    const ifactor = power / sportConfig.ftp;
    return { tss_final: duration * ifactor * ifactor * 100, tss_source: "estimated_power", ftp_used: sportConfig.ftp, threshold_hr_used: null, intensity_factor: ifactor };
  }

  if (row.avg_hr && row.avg_hr > 0 && sportConfig.thresholdHr > 0) {
    const hrif = row.avg_hr / sportConfig.thresholdHr;
    return { tss_final: duration * hrif * hrif * 100, tss_source: "estimated_hr", ftp_used: null, threshold_hr_used: sportConfig.thresholdHr, intensity_factor: intensity };
  }

	  return { tss_final: null, tss_source: "missing_power_hr", ftp_used: null, threshold_hr_used: null, intensity_factor: intensity };
	}

function repairCollapsedGarminTitle(partial: any) {
  if (partial.duration_hours || !partial.title) return partial;

  const match = String(partial.title).match(
    /^(.*?),'(-?\d+(?:,\d+)?),'([\d.]+),'(\d{1,2}:\d{2}(?::\d{2})?),'(\d+|--),'(\d+|--),'([\d,]+|--),'?(.+)$/
  );

  if (!match) return partial;

  const [, title, distance, calories, duration, avgHr, maxHr, effort, trailingValue] = match;
  const trailingNumber = num(trailingValue);

  return {
    ...partial,
    title: title.trim(),
    distance_km: partial.distance_km ?? num(distance),
    calories: partial.calories ?? num(calories),
    duration_hours: partial.duration_hours ?? durationHours(duration),
    avg_hr: partial.avg_hr ?? num(avgHr),
    max_hr: partial.max_hr ?? num(maxHr),
    intensity_factor: partial.intensity_factor ?? num(effort),
    tss_original: partial.tss_original ?? trailingNumber,
  };
}

function parseGarminCsvRows(csvText: string): Record<string, string>[] {
  const lines = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter(Boolean);

  function unwrapWrappedLine(line: string) {
    if (!line.startsWith("\"") || !line.endsWith("\"") || !line.includes(",\"\"")) return line;
    return line.slice(1, -1).replace(/""/g, "\"");
  }

  function parseLine(line: string): string[] {
    const cells: string[] = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"') {
        if (!inQuotes && cell === "") {
          inQuotes = true;
          continue;
        }

        if (inQuotes && next === '"') {
          cell += '"';
          i++;
          continue;
        }

        if (inQuotes && (next === "," || next === undefined)) {
          inQuotes = false;
          continue;
        }

        // guillemet parasite dans un titre : apnée"
        cell += "'";
        continue;
      }

      if (
        char === "," &&
        !inQuotes &&
        cell.trim().startsWith("'") &&
        /\d$/.test(cell.trim()) &&
        next !== undefined &&
        /\d/.test(next)
      ) {
        cell += char;
        continue;
      }

      if (char === "," && !inQuotes) {
        cells.push(cell.trim());
        cell = "";
        continue;
      }

      cell += char;
    }

    cells.push(cell.trim());
    return cells;
  }

  const headers = parseLine(lines[0]).map(cleanKey);

  return lines.slice(1).map((line) => {
    const values = parseLine(unwrapWrappedLine(line));
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = cleanCell(values[index] ?? "");
    });

    return row;
  });
}

function sanitizeGarminCsv(csvText: string) {
  return csvText
    .replace(/√©/g, "é")
    .replace(/√®/g, "è")
    .replace(/√™/g, "ê")
    .replace(/√†/g, "à")
    .replace(/√ß/g, "ç")
    .replace(/¬Æ/g, "®")
    .replace(/¬†/g, "\u00a0")
    .replace(/[“”]/g, '"');
}

export function parseGarminCsv(csvText: string) {
  const cleanedCsvText = sanitizeGarminCsv(csvText);

  const rows = parseGarminCsvRows(cleanedCsvText);

  const activities = [];

  for (const r of rows) {
    const dateObj = parseDate(getValue(r, ["Date"]));
    if (!dateObj) continue;

    const activityType = getValue(r, ["Type d'activité", "Activity Type", "Type"]) ?? null;
    const title = getValue(r, ["Titre", "Title"]) ?? null;
    if (!isBike(activityType, title)) continue;

    const s = season(dateObj);
    let partial: any = {
      date: dateObj.toISOString(),
      season: s,
      week_in_season: weekInSeason(dateObj, s),
      month_in_season: monthInSeason(dateObj),
      activity_type: activityType,
      title,
      duration_hours: durationHours(getValue(r, ["Durée", "Duration", "Time"])),
      moving_hours: durationHours(getValue(r, ["Temps de déplacement", "Moving Time"])),
      elapsed_hours: durationHours(getValue(r, ["Temps écoulé", "Elapsed Time"])),
      distance_km: num(getValue(r, ["Distance"])),
      elevation_m: num(getValue(r, ["Ascension totale", "Total Ascent", "Elevation Gain"])),
      descent_m: num(getValue(r, ["Descente totale", "Total Descent"])),
      calories: num(getValue(r, ["Calories"])),
      avg_hr: num(getValue(r, ["Fréquence cardiaque moyenne", "Avg HR", "Average Heart Rate"])),
      max_hr: num(getValue(r, ["Fréquence cardiaque maximale", "Max HR", "Max Heart Rate"])),
      avg_power: num(getValue(r, ["Puissance moyenne", "Avg Power", "Average Power"])),
      normalized_power: num(getValue(r, ["Normalized Power® (NP®)", "Normalized Power (NP)", "Normalized Power"])),
      best_20min_power: num(getValue(r, ["Puissance moyenne maximale (20 min)", "Puissance moyenne maximale (20 min)", "Max Avg Power (20 min)"])),
      max_power: num(getValue(r, ["Puissance max.", "Max Power"])),
      tss_original: num(getValue(r, [
        "Training Stress Score® (TSS®)",
        "Training Stress Score (TSS)",
        "Training Stress Score®",
        "Training Stress Score",
        "TSS®",
        "TSS",
      ]))
    };

    partial = repairCollapsedGarminTitle(partial);

    const tss = tssFields(partial);
    const flag = partial.duration_hours && partial.moving_hours && partial.moving_hours < partial.duration_hours * 0.5 ? "suspicious_moving_time" : null;

    activities.push({
      activity_id: idFor(partial),
      ...partial,
      ...tss,
      data_quality_flag: flag,
      updated_at: new Date().toISOString()
    });
  }

  return activities;
}
