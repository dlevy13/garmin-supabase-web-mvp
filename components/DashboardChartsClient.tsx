"use client";

import dynamic from "next/dynamic";

export const DashboardChartsClient = dynamic(
  () => import("@/components/DashboardCharts").then((mod) => mod.DashboardCharts),
  { ssr: false }
);
