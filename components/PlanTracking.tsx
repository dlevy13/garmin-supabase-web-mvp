"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { addDays, comparePlan, monday, weeklyComparison, type ActualActivity, type PlanDay } from "@/lib/trainingPlan";
import { seasonForDate } from "@/lib/season";

const format = (value: number | null | undefined) => value == null ? "—" : value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
const label = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC", day: "2-digit", month: "2-digit" });
const delta = (actual: number | null, planned: number | null) => actual == null || planned == null ? "—" : `${actual - planned > 0 ? "+" : ""}${format(actual - planned)}`;
const rate = (actual: number | null, planned: number | null) => actual == null || planned == null || planned === 0 ? "—" : `${Math.round(actual / planned * 100)} %`;

export function PlanTracking({ plan, activities, today, lastImport }: { plan: PlanDay[]; activities: ActualActivity[]; today: string; lastImport: string | null }) {
  const [cutoff, setCutoff] = useState(today);
  const [season, setSeason] = useState("all");
  const seasons = [...new Set(plan.map((day) => seasonForDate(new Date(`${day.date}T00:00:00Z`))).filter((value) => value !== null))].sort((a, b) => b - a);
  const selectedPlan = useMemo(() => plan.filter((day) => season === "all" || String(seasonForDate(new Date(`${day.date}T00:00:00Z`))) === season), [plan, season]);
  const days = useMemo(() => comparePlan(selectedPlan, activities, cutoff), [selectedPlan, activities, cutoff]);
  const weeks = useMemo(() => weeklyComparison(days), [days]);
  const current = weeks.find((week) => week.date === monday(cutoff));
  const dueDays = days.filter((day) => day.elapsed);
  const estimated = dueDays.reduce((sum, day) => sum + day.estimated, 0);
  const missing = dueDays.reduce((sum, day) => sum + day.missingTss, 0);
  const missingHours = dueDays.reduce((sum, day) => sum + day.missingHours, 0);
  const incomplete = days.some((day) => day.target?.duration_hours == null || day.target?.tss_target == null);
  const weeklyData = weeks.map((week) => ({ label: label(week.date), phase: week.phase, type: week.weekType, hoursPlan: week.hours.planned, hoursActual: week.hours.actual, tssPlan: week.tss.planned, tssActual: week.tss.actual }));
  let hoursPlan = 0, hoursActual = 0, tssPlan = 0, tssActual = 0;
  let knownHours = true, knownTss = true;
  const cumulativeData = days.map((day) => {
    knownHours = knownHours && day.target?.duration_hours != null;
    knownTss = knownTss && day.target?.tss_target != null;
    hoursPlan += day.target?.duration_hours ?? 0;
    tssPlan += day.target?.tss_target ?? 0;
    hoursActual += day.hours ?? 0;
    tssActual += day.tss ?? 0;
    return { label: label(day.date), hoursPlan: knownHours ? hoursPlan : null, hoursActual: day.elapsed ? hoursActual : null, tssPlan: knownTss ? tssPlan : null, tssActual: day.elapsed ? tssActual : null };
  });

  if (!plan.length) return <p className="rounded-3xl bg-white p-6 text-slate-600">Importe ton premier CSV pour afficher le suivi prévu / réalisé.</p>;

  return <div className="space-y-6">
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm">Période<select className="mt-1 block rounded-xl border border-slate-200 p-2" value={season} onChange={(event) => setSeason(event.target.value)}><option value="all">Tout le plan (transitions incluses)</option>{seasons.map((year) => <option key={year} value={year}>Saison {year - 1} / {year}</option>)}</select></label>
        <label className="text-sm">Comparer jusqu’au (inclus)<input className="mt-1 block rounded-xl border border-slate-200 p-2" type="date" value={cutoff} max={today} onChange={(event) => { if (event.target.value && event.target.value <= today) setCutoff(event.target.value); }} /></label>
      </div>
      <p className="mt-3 text-sm text-slate-500">Dernier import Garmin : {lastImport ? new Date(lastImport).toLocaleString("fr-FR") : "aucun"}. Sans activité importée, le réalisé est affiché à 0 : vérifie que tes imports sont à jour. Journées calculées en UTC, comme le dashboard.</p>
      {(estimated > 0 || missing > 0 || missingHours > 0) && <p className="mt-2 text-sm text-amber-700">{estimated} activité(s) avec TSS estimé, {missing} sans TSS et {missingHours} sans durée sur la période écoulée. Les données manquantes ne contribuent pas aux totaux réels.</p>}
      {incomplete && <p className="mt-2 text-sm text-amber-700">Le plan contient des jours ou des objectifs non renseignés. « — » indique une cible inconnue ; les courbes cumulées prévues s’arrêtent au premier manque.</p>}
    </section>

    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Semaine du {label(monday(cutoff))}</h2>
      {current ? <>
        <p className="mt-1 text-sm text-slate-500">{current.phase} · {current.weekType}</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Indicateur</th><th className="p-3">Prévu à date</th><th className="p-3">Réalisé</th><th className="p-3">Écart</th><th className="p-3">Réalisation</th><th className="p-3">Cible semaine entière</th></tr></thead><tbody>{(["hours", "tss"] as const).map((metric) => <tr key={metric}><td className="p-3">{metric === "hours" ? "Heures" : "TSS"}</td><td className="p-3">{format(current[metric].due)}</td><td className="p-3">{format(current[metric].actual)}</td><td className="p-3">{delta(current[metric].actual, current[metric].due)}</td><td className="p-3">{rate(current[metric].actual, current[metric].due)}</td><td className="p-3">{format(current[metric].planned)}</td></tr>)}</tbody></table></div>
      </> : <p className="mt-3 text-sm text-slate-500">Aucune semaine du plan ne couvre cette date.</p>}
    </section>

    <div className="grid gap-6 xl:grid-cols-2">{(["hours", "tss"] as const).map((metric) => <section key={metric} className="min-w-0 rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">{metric === "hours" ? "Heures" : "TSS"} par semaine</h2>
      <ResponsiveContainer width="100%" height={280}><BarChart data={weeklyData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis /><Tooltip labelFormatter={(value, payload) => `${value} · ${payload?.[0]?.payload.phase ?? ""} · ${payload?.[0]?.payload.type ?? ""}`} /><Legend /><Bar dataKey={`${metric}Plan`} name="Prévu semaine entière" fill="#a5b4fc" radius={[4, 4, 0, 0]} /><Bar dataKey={`${metric}Actual`} name="Réalisé à date" fill="#4f46e5" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
    </section>)}</div>
    <div className="grid gap-6 xl:grid-cols-2">{(["hours", "tss"] as const).map((metric) => <section key={metric} className="min-w-0 rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">{metric === "hours" ? "Heures" : "TSS"} cumulés</h2>
      <ResponsiveContainer width="100%" height={280}><LineChart data={cumulativeData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Legend /><Line dataKey={`${metric}Plan`} name="Prévu" stroke="#a5b4fc" dot={false} strokeWidth={2} /><Line dataKey={`${metric}Actual`} name="Réalisé" stroke="#4f46e5" dot={false} strokeWidth={2} /></LineChart></ResponsiveContainer>
    </section>)}</div>

    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Détail des semaines</h2>
      <p className="mt-2 text-sm text-slate-500">Les écarts comparent le réalisé aux cibles jusqu’à la date sélectionnée. Ouvre une semaine pour retrouver les journées et activités.</p>
      <div className="mt-4 space-y-3">{weeks.map((week) => <details key={week.date} className="rounded-2xl border border-slate-200 p-4">
        <summary className="cursor-pointer text-sm"><strong>{label(week.date)} – {label(addDays(week.date, 6))}</strong> · {week.phase} · {week.weekType}<span className="mt-2 block text-slate-600">Heures : {format(week.hours.actual)} / {format(week.hours.due)} à date (écart {delta(week.hours.actual, week.hours.due)} h) · TSS : {format(week.tss.actual)} / {format(week.tss.due)} à date (écart {delta(week.tss.actual, week.tss.due)}) · Cible complète : {format(week.hours.planned)} h / {format(week.tss.planned)} TSS</span></summary>
        <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-2">Date</th><th className="p-2">Phase / semaine</th><th className="p-2">Heures prévues / réelles</th><th className="p-2">TSS prévus / réels</th><th className="p-2">Activités</th></tr></thead><tbody>{week.days.map((day) => <tr key={day.date} className="border-b border-slate-100"><td className="whitespace-nowrap p-2">{label(day.date)}</td><td className="p-2">{day.target ? `${day.target.phase} / ${day.target.week_type}` : "Non renseigné"}</td><td className="p-2">{format(day.target?.duration_hours)} / {format(day.hours)}</td><td className="p-2">{format(day.target?.tss_target)} / {format(day.tss)}</td><td className="p-2">{day.activities.map((activity, index) => <div key={index}>{activity.title ?? "Activité"} · {format(activity.tss_final == null ? null : Number(activity.tss_final))} TSS{activity.tss_source?.startsWith("estimated") ? " (estimé)" : ""}</div>)}{day.elapsed && !day.activities.length ? "Aucune activité importée" : ""}</td></tr>)}</tbody></table></div>
      </details>)}</div>
    </section>
  </div>;
}
