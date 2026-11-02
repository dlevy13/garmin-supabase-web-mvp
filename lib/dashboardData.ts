import type { DashboardView } from "@/components/AppShell";
import { supabaseAdmin } from "./supabaseAdmin";

const PAGE_SIZE = 1000;

const DASHBOARD_VIEWS: DashboardView[] = ["synthese", "hebdo", "mensuel", "cumule", "pmc", "donnees", "records", "projections"];

export function parseView(value: string | string[] | undefined): DashboardView | null {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (rawValue && DASHBOARD_VIEWS.includes(rawValue as DashboardView)) return rawValue as DashboardView;
  return null;
}

export async function fetchAllRows(table: "activities" | "pmc_daily") {
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
