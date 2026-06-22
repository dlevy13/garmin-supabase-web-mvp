import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { UploadForm } from "@/components/UploadForm";
import { requireAuthenticatedUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  await requireAuthenticatedUser("/upload");

  const { data: latestActivities } = await supabaseAdmin
    .from("activities")
    .select("season,week_in_season")
    .order("date", { ascending: false })
    .limit(1);

  const latestActivity = latestActivities?.[0] as { season?: number; week_in_season?: number } | undefined;
  const currentSeason = Number(latestActivity?.season ?? new Date().getFullYear());
  const currentWeek = Number(latestActivity?.week_in_season ?? 1);

  return (
    <AppShell activeItem="upload" currentSeason={currentSeason} currentWeek={currentWeek}>
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-gray-500">← Retour</Link>
        <div className="mt-6 rounded-3xl bg-white p-10 shadow-sm">
          <h1 className="text-3xl font-semibold">Importer un export Garmin</h1>
          <p className="mt-3 text-gray-600">Le fichier CSV est traite mais pas stocke.</p>
          <UploadForm />
        </div>
      </div>
    </AppShell>
  );
}
