import { supabaseAdmin } from "./supabaseAdmin";
import { sportConfig } from "./garmin";
import { seasonFields } from "./season";

function key(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function recomputePmc() {
  const { data, error } = await supabaseAdmin.from("activities").select("date,tss_final").order("date");
  if (error) throw new Error(error.message);

  if (!data || data.length === 0) {
    await supabaseAdmin.from("pmc_daily").delete().neq("date_day", "1900-01-01");
    return { days: 0 };
  }

  const byDay = new Map<string, number>();
  for (const a of data) {
    const d = new Date(a.date);
    const k = key(d);
    byDay.set(k, (byDay.get(k) ?? 0) + Number(a.tss_final ?? 0));
  }

  const dates = Array.from(byDay.keys()).sort();
  const start = new Date(`${dates[0]}T00:00:00.000Z`);
  const end = new Date(`${dates[dates.length - 1]}T00:00:00.000Z`);

  let ctl = 0;
  let atl = 0;
  const rows = [];

  for (let d = new Date(start); d.getTime() <= end.getTime(); d.setUTCDate(d.getUTCDate() + 1)) {
    const tss = byDay.get(key(d)) ?? 0;
    ctl = ctl + (tss - ctl) / sportConfig.ctlDays;
    atl = atl + (tss - atl) / sportConfig.atlDays;

    rows.push({
      date_day: key(d),
      ...seasonFields(d),
      tss,
      ctl,
      atl,
      tsb: ctl - atl,
      updated_at: new Date().toISOString()
    });
  }

  await supabaseAdmin.from("pmc_daily").delete().neq("date_day", "1900-01-01");

  for (let i = 0; i < rows.length; i += 500) {
    const { error: upsertError } = await supabaseAdmin.from("pmc_daily").upsert(rows.slice(i, i + 500), { onConflict: "date_day" });
    if (upsertError) throw new Error(upsertError.message);
  }

  return { days: rows.length };
}
