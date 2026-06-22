import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { requireAuthenticatedUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

export default async function ImportsPage() {
  await requireAuthenticatedUser("/imports");

  const { data: imports } = await supabaseAdmin
    .from("imports")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: latestActivities } = await supabaseAdmin
    .from("activities")
    .select("season,week_in_season")
    .order("date", { ascending: false })
    .limit(1);

  const latestActivity = latestActivities?.[0] as { season?: number; week_in_season?: number } | undefined;
  const currentSeason = Number(latestActivity?.season ?? new Date().getFullYear());
  const currentWeek = Number(latestActivity?.week_in_season ?? 1);

  return (
    <AppShell activeItem="imports" currentSeason={currentSeason} currentWeek={currentWeek}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="text-sm text-gray-500">
            ← Retour au dashboard
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link href="/upload" className="rounded-full bg-black px-5 py-3 text-white">
              Importer un CSV
            </Link>
            <Link href="/activities" className="rounded-full bg-white px-5 py-3">
              Voir les activités
            </Link>
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-3xl font-semibold">Historique des imports</h1>
          <p className="mt-2 text-sm text-gray-600">
            Suivi des fichiers importés, doublons ignorés et statut du recalcul PMC.
          </p>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500">
                <tr className="border-b border-gray-200">
                  <th className="px-3 py-3 font-medium">Date import</th>
                  <th className="px-3 py-3 font-medium">Fichier</th>
                  <th className="px-3 py-3 font-medium">Activités importées</th>
                  <th className="px-3 py-3 font-medium">Doublons ignorés</th>
                  <th className="px-3 py-3 font-medium">Statut recalcul PMC</th>
                </tr>
              </thead>
              <tbody>
                {(imports ?? []).map((item: any) => (
                  <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-3 py-4">{formatDate(item.created_at)}</td>
                    <td className="px-3 py-4 font-medium text-gray-900">
                      {item.file_name || "—"}
                    </td>
                    <td className="px-3 py-4">{Number(item.activities_upserted ?? 0)}</td>
                    <td className="px-3 py-4">{Number(item.duplicates_ignored ?? 0)}</td>
                    <td className="px-3 py-4">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {item.pmc_status || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!imports || imports.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                      Aucun import pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
