import { seasonContext } from "@/lib/season";
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
    .select("date")
    .order("date", { ascending: false })
    .limit(1);

  const latestActivity = latestActivities?.[0] as { date?: string } | undefined;
  const { currentSeason, currentWeek, isTransition } = seasonContext(new Date(latestActivity?.date ?? Date.now()));

  return (
    <AppShell activeItem="upload" currentSeason={currentSeason} currentWeek={currentWeek} isTransition={isTransition}>
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-gray-500">← Retour</Link>
        <div className="mt-6 rounded-3xl bg-white p-10 shadow-sm">
          <h1 className="text-3xl font-semibold">Importer un export Garmin</h1>
          <p className="mt-3 text-gray-600">Le fichier CSV est traite mais pas stocke.</p>
          <UploadForm />
          <Link href="/plan" className="mt-6 inline-block text-sm text-indigo-600 underline">Importer ou mettre à jour le plan d’entraînement →</Link>
        </div>
      </div>
    </AppShell>
  );
}
