import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { DashboardChartsClient } from "@/components/DashboardChartsClient";
import { requireAuthenticatedUser } from "@/lib/auth";
import { fetchAllRows, parseView } from "@/lib/dashboardData";
import { completedSeasons } from "@/lib/seasonRecap";
import { seasonContext, seasonEnd, seasonStart } from "@/lib/season";

export const dynamic = "force-dynamic";

const VIEWS = [
  ["synthese", "Synthèse"], ["hebdo", "Hebdomadaire"], ["mensuel", "Mensuel"],
  ["cumule", "Cumulé"], ["pmc", "PMC"], ["records", "Records"],
] as const;

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

export default async function SeasonsPage({ searchParams }: {
  searchParams?: Promise<{ season?: string | string[]; view?: string | string[] }>;
}) {
  await requireAuthenticatedUser("/seasons");
  const params = await searchParams;
  const [activities, pmc] = await Promise.all([fetchAllRows("activities"), fetchAllRows("pmc_daily")]);
  const now = new Date();
  const seasons = completedSeasons(activities, now);
  const requestedSeason = Number(Array.isArray(params?.season) ? params.season[0] : params?.season);
  const selectedSeason = seasons.includes(requestedSeason) ? requestedSeason : seasons[0];
  const view = parseView(params?.view) ?? "synthese";
  const latestDate = activities.at(-1)?.date;
  const context = seasonContext(new Date(latestDate ?? now));

  return (
    <AppShell activeItem="seasons" {...context} archiveSeason={selectedSeason}>
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Récap des saisons</h1>
            <p className="mt-2 text-sm text-slate-500">Retrouvez les graphiques des saisons terminées sur leurs 52 semaines complètes.</p>
          </div>
          <Link href="/dashboard" className="text-sm font-medium text-indigo-600">Saison en cours →</Link>
        </div>
        {selectedSeason !== undefined ? (
          <>
            <form action="/seasons" method="get" className="mt-5 flex flex-wrap items-end gap-3">
              <input type="hidden" name="view" value={view} />
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Saison terminée
                <select name="season" defaultValue={selectedSeason} key={selectedSeason} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  {seasons.map((season) => <option key={season} value={season}>{season - 1} / {season}</option>)}
                </select>
              </label>
              <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white">Afficher</button>
            </form>
            <p className="mt-3 text-sm text-slate-500">Du {formatDate(seasonStart(selectedSeason))} au {formatDate(seasonEnd(selectedSeason))} · semaines 1 à 52 · hors transition.</p>
            <nav aria-label="Graphiques de la saison terminée" className="mt-5 flex flex-wrap gap-2 lg:hidden">
              {VIEWS.map(([key, label]) => (
                <Link key={key} href={`/seasons?season=${selectedSeason}&view=${key}`} aria-current={view === key ? "page" : undefined}
                  className={`rounded-xl px-3 py-2 text-sm ${view === key ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>{label}</Link>
              ))}
            </nav>
          </>
        ) : <p className="mt-5 text-sm text-slate-500">Aucune saison terminée avec des activités importées pour le moment.</p>}
      </div>
      {selectedSeason !== undefined && (
        <DashboardChartsClient key={selectedSeason} activities={activities} pmc={pmc} initialView={view} recapSeason={selectedSeason} />
      )}
    </AppShell>
  );
}
