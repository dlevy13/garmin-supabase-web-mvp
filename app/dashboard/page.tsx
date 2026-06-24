import { AppShell, type DashboardView, type ShellActiveItem } from "@/components/AppShell";
import { DashboardChartsClient } from "@/components/DashboardChartsClient";
import { requireAuthenticatedUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 1000;

const DASHBOARD_VIEWS: DashboardView[] = ["synthese", "hebdo", "mensuel", "cumule", "pmc", "donnees", "records", "projections"];

function parseView(value: string | string[] | undefined): DashboardView | null {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (rawValue && DASHBOARD_VIEWS.includes(rawValue as DashboardView)) return rawValue as DashboardView;
  return null;
}

async function fetchAllRows(table: "activities" | "pmc_daily") {
  const rows: any[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const orderColumn = table === "activities" ? "date" : "date_day";
    const { data, error } = await supabaseAdmin.from(table).select("*").order(orderColumn, { ascending: true }).range(from, to);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  return rows;
}

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
