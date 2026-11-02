"use client";
import dynamic from "next/dynamic";

export const PlanTrackingClient = dynamic(() => import("./PlanTracking").then((module) => module.PlanTracking), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-slate-500">Chargement du suivi…</p>,
});
