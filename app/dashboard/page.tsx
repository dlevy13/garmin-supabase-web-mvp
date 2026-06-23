import { AppShell, type DashboardView, type ShellActiveItem } from "@/components/AppShell";
import { DashboardChartsClient } from "@/components/DashboardChartsClient";
import { requireAuthenticatedUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const DASHBOARD_VIEWS: DashboardView[] = ["synthese", "hebdo", "mensuel", "cumule", "pmc", "donnees", "records", "projections"];

function parseView(value: string | string[] | undefined): DashboardView | null {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (rawValue && DASHBOARD_VIEWS.includes(rawValue as DashboardView)) return rawValue as DashboardView;
  return null;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string | string[] }> | { view?: string | string[] };
}) {
  await requireAuthenticatedUser("/dashboard");

  const resolvedSearchParams = await searchParams;
  const selectedView = parseView(resolvedSearchParams?.view);

  const { data: activities } = await supabaseAdmin
    .from("activities")
    .select("*")
    .order("date", { ascending: true });

  const { data: pmc } = await supabaseAdmin
    .from("pmc_daily")
    .select("*")
    .order("date_day", { ascending: true });

  const { data: imports } = await supabaseAdmin
    .from("imports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  const latestActivity = (activities ?? []).at(-1) as { season?: number; week_in_season?: number } | undefined;
  const currentSeason = Number(latestActivity?.season ?? new Date().getFullYear());
  const currentWeek = Number(latestActivity?.week_in_season ?? 1);
  const activeItem: ShellActiveItem = selectedView === "synthese" || selectedView == null ? "dashboard" : selectedView;

  return (
    <AppShell activeItem={activeItem} currentSeason={currentSeason} currentWeek={currentWeek}>
      <DashboardChartsClient
        activities={(activities ?? []) as any}
        pmc={(pmc ?? []) as any}
        imports={(imports ?? []) as any}
        initialView={selectedView ?? "synthese"}
      />
    </AppShell>
  );
}
