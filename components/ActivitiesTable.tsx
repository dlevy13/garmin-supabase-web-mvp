"use client";

import { useMemo, useState } from "react";

type ActivityRow = {
  activity_id: string;
  date: string;
  title: string | null;
  activity_type: string | null;
  duration_hours: number | null;
  distance_km: number | null;
  avg_hr: number | null;
  tss_original: number | null;
  tss_final: number | null;
  tss_source: string | null;
  season: number;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

function formatHours(value: number | null) {
  if (value == null) return "—";

  const totalMinutes = Math.round(value * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours} h ${String(minutes).padStart(2, "0")}`;
}

function formatNumber(value: number | null, suffix = "", digits = 0) {
  if (value == null) return "—";
  return `${Number(value).toFixed(digits)}${suffix}`;
}

export function ActivitiesTable({ activities }: { activities: ActivityRow[] }) {
  const [query, setQuery] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const seasons = useMemo(
    () => Array.from(new Set(activities.map((activity) => String(activity.season)))).sort().reverse(),
    [activities]
  );

  const types = useMemo(
    () =>
      Array.from(
        new Set(
          activities
            .map((activity) => activity.activity_type?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [activities]
  );

  const sources = useMemo(
    () =>
      Array.from(
        new Set(
          activities
            .map((activity) => activity.tss_source?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [activities]
  );

  const filteredActivities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return activities.filter((activity) => {
      if (seasonFilter !== "all" && String(activity.season) !== seasonFilter) return false;
      if (typeFilter !== "all" && (activity.activity_type ?? "") !== typeFilter) return false;
      if (sourceFilter !== "all" && (activity.tss_source ?? "") !== sourceFilter) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        activity.title ?? "",
        activity.activity_type ?? "",
        activity.tss_source ?? "",
        activity.date,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [activities, query, seasonFilter, sourceFilter, typeFilter]);

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Consultation des activités</h1>
          <p className="mt-2 text-sm text-gray-600">
            Audit des calculs TSS, des sources et des données importées.
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {filteredActivities.length} activité{filteredActivities.length > 1 ? "s" : ""}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Recherche titre, type, source..."
          className="rounded-2xl border border-gray-200 px-4 py-3 outline-none ring-0 placeholder:text-gray-400 focus:border-gray-400"
        />

        <select
          value={seasonFilter}
          onChange={(event) => setSeasonFilter(event.target.value)}
          className="rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-gray-400"
        >
          <option value="all">Toutes les saisons</option>
          {seasons.map((season) => (
            <option key={season} value={season}>
              Saison {season}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-gray-400"
        >
          <option value="all">Tous les types</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={sourceFilter}
          onChange={(event) => setSourceFilter(event.target.value)}
          className="rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-gray-400"
        >
          <option value="all">Toutes les sources TSS</option>
          {sources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-gray-500">
            <tr className="border-b border-gray-200">
              <th className="px-3 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">Titre</th>
              <th className="px-3 py-3 font-medium">Type</th>
              <th className="px-3 py-3 font-medium">Durée</th>
              <th className="px-3 py-3 font-medium">Distance</th>
              <th className="px-3 py-3 font-medium">FC moyenne</th>
              <th className="px-3 py-3 font-medium">TSS Garmin</th>
              <th className="px-3 py-3 font-medium">TSS final</th>
              <th className="px-3 py-3 font-medium">Source TSS</th>
            </tr>
          </thead>
          <tbody>
            {filteredActivities.map((activity) => (
              <tr key={activity.activity_id} className="border-b border-gray-100 align-top last:border-b-0">
                <td className="px-3 py-4 whitespace-nowrap">{formatDate(activity.date)}</td>
                <td className="px-3 py-4 font-medium text-gray-900">{activity.title || "—"}</td>
                <td className="px-3 py-4">{activity.activity_type || "—"}</td>
                <td className="px-3 py-4 whitespace-nowrap">{formatHours(activity.duration_hours)}</td>
                <td className="px-3 py-4 whitespace-nowrap">{formatNumber(activity.distance_km, " km", 1)}</td>
                <td className="px-3 py-4 whitespace-nowrap">{formatNumber(activity.avg_hr, " bpm")}</td>
                <td className="px-3 py-4 whitespace-nowrap">{formatNumber(activity.tss_original, "", 1)}</td>
                <td className="px-3 py-4 whitespace-nowrap">{formatNumber(activity.tss_final, "", 1)}</td>
                <td className="px-3 py-4">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    {activity.tss_source || "—"}
                  </span>
                </td>
              </tr>
            ))}
            {filteredActivities.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                  Aucune activité ne correspond aux filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
