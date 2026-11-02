import { fetchAllRows, parseView } from "@/lib/dashboardData";
import { seasonContext } from "@/lib/season";
import { AppShell, type DashboardView, type ShellActiveItem } from "@/components/AppShell";
import { DashboardChartsClient } from "@/components/DashboardChartsClient";
import { requireAuthenticatedUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string | string[] }> | { view?: string | string[] };
}) {
  await requireAuthenticatedUser("/dashboard");

  const resolvedSearchParams = await searchParams;
  const selectedView = parseView(resolvedSearchParams?.view);

  const [activities, pmc] = await Promise.all([
    fetchAllRows("activities"),
    fetchAllRows("pmc_daily"),
  ]);

  const { data: imports } = await supabaseAdmin
    .from("imports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  const latestActivity = (activities ?? []).at(-1) as { date?: string } | undefined;
  const { currentSeason, currentWeek, isTransition } = seasonContext(new Date(latestActivity?.date ?? Date.now()));
  const activeItem: ShellActiveItem = selectedView === "synthese" || selectedView == null ? "dashboard" : selectedView;

  return (
    <AppShell activeItem={activeItem} currentSeason={currentSeason} currentWeek={currentWeek} isTransition={isTransition}>
      <DashboardChartsClient
        activities={(activities ?? []) as any}
        pmc={(pmc ?? []) as any}
        imports={(imports ?? []) as any}
        initialView={selectedView ?? "synthese"}
      />
    </AppShell>
  );
}
