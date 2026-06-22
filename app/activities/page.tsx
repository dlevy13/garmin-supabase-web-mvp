import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ActivitiesTable } from "@/components/ActivitiesTable";
import { requireAuthenticatedUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  await requireAuthenticatedUser("/activities");

  const { data: activities } = await supabaseAdmin
    .from("activities")
    .select(
      "activity_id,date,title,activity_type,duration_hours,distance_km,avg_hr,tss_original,tss_final,tss_source,season,week_in_season"
    )
    .order("date", { ascending: false });

  const latestActivity = (activities ?? [])[0] as { season?: number; week_in_season?: number } | undefined;
  const currentSeason = Number(latestActivity?.season ?? new Date().getFullYear());
  const currentWeek = Number(latestActivity?.week_in_season ?? 1);

  return (
    <AppShell activeItem="activities" currentSeason={currentSeason} currentWeek={currentWeek}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/dashboard" className="text-sm text-gray-500">
            ← Retour au dashboard
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link href="/imports" className="rounded-full bg-white px-5 py-3">
              Historique imports
            </Link>
            <Link href="/upload" className="rounded-full bg-black px-5 py-3 text-white">
              Importer un CSV
            </Link>
          </div>
        </div>

        <ActivitiesTable activities={(activities ?? []) as any} />
      </div>
    </AppShell>
  );
}
