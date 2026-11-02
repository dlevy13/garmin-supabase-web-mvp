import { AppShell } from "@/components/AppShell";
import { PlanUploadForm } from "@/components/PlanUploadForm";
import { PlanTrackingClient } from "@/components/PlanTrackingClient";
import { requireAuthenticatedUser } from "@/lib/auth";
import { fetchAllRows } from "@/lib/dashboardData";
import { seasonContext } from "@/lib/season";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { PlanDay } from "@/lib/trainingPlan";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const user = await requireAuthenticatedUser("/plan");
  const plan: PlanDay[] = [];
  let planError = false;
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin.from("training_plan_days").select("date,phase,week_type,duration_hours,tss_target").eq("user_id", user.id).order("date").range(from, from + 999);
    if (error) { planError = true; break; }
    plan.push(...(data ?? []).map((row) => ({ ...row, duration_hours: row.duration_hours == null ? null : Number(row.duration_hours), tss_target: row.tss_target == null ? null : Number(row.tss_target) })));
    if (!data || data.length < 1000) break;
  }
  const [activities, historyResult, importResult] = await Promise.all([
    fetchAllRows("activities"),
    supabaseAdmin.from("training_plan_imports").select("id,created_at,file_name,rows_count,added_count,updated_count,unchanged_count").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabaseAdmin.from("imports").select("created_at").order("created_at", { ascending: false }).limit(1),
  ]);
  const context = seasonContext(new Date());
  return <AppShell activeItem="plan" {...context}>
    <div className="mx-auto max-w-7xl space-y-6">
      <header><h1 className="text-3xl font-semibold">Suivi du plan</h1><p className="mt-2 text-slate-500">Compare les heures et les TSS prévus avec tes activités Garmin.</p></header>
      <PlanUploadForm />
      {planError ? <p role="alert" className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-900">Le plan n’est pas accessible. Exécute la migration <code>supabase/migrations/20261104_training_plan.sql</code> dans Supabase si elle n’a pas encore été appliquée.</p> : <PlanTrackingClient plan={plan} activities={activities} today={new Date().toISOString().slice(0, 10)} lastImport={importResult.data?.[0]?.created_at ?? null} />}
      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Derniers imports du plan</h2>
        <p className="mt-2 text-sm text-slate-500">Les versions importées sont conservées. Les comparaisons utilisent le dernier objectif enregistré pour chaque date.</p>
        {historyResult.error ? <p className="mt-4 text-sm text-amber-700">Historique indisponible. Vérifie la migration et la connexion Supabase.</p> : !historyResult.data?.length ? <p className="mt-4 text-sm text-slate-500">Aucun import.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b">{["Date", "Fichier", "Journées", "Ajoutées", "Modifiées", "Inchangées"].map((title) => <th key={title} className="p-3">{title}</th>)}</tr></thead><tbody>{historyResult.data.map((row) => <tr key={row.id} className="border-b border-slate-100"><td className="whitespace-nowrap p-3">{new Date(row.created_at).toLocaleString("fr-FR")}</td><td className="p-3">{row.file_name}</td>{[row.rows_count, row.added_count, row.updated_count, row.unchanged_count].map((count, index) => <td key={index} className="p-3">{count}</td>)}</tr>)}</tbody></table></div>}
      </section>
    </div>
  </AppShell>;
}
