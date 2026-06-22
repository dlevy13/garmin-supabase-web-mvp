"use client";

import { useState } from "react";

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function upload() {
    if (!file) {
      setStatus("Choisis un fichier CSV.");
      return;
    }

    setLoading(true);
    setStatus("Import en cours...");

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/import-garmin", { method: "POST", body: formData });
    const result = await response.json();

    if (!response.ok) {
      setStatus(`Erreur : ${result.error}`);
      setLoading(false);
      return;
    }

    const sources = result.tssSources
      ? Object.entries(result.tssSources)
          .map(([source, count]) => `${source}: ${count}`)
          .join(", ")
      : "";

    setStatus(
      `Import termine : ${result.activities} activites importees, ${result.duplicatesIgnored} doublons ignores, PMC recalcule sur ${result.pmcDays} jours.${sources ? ` TSS: ${sources}.` : ""}${result.parserVersion ? ` Parser: ${result.parserVersion}.` : ""}`
    );
    setLoading(false);
  }

  return (
    <>
      <div className="mt-8 rounded-2xl border border-dashed border-gray-300 p-8">
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button onClick={upload} disabled={loading} className="mt-6 rounded-full bg-black px-5 py-3 text-white disabled:opacity-50">
          {loading ? "Import..." : "Importer"}
        </button>
      </div>
      {status && <p className="mt-6 rounded-2xl bg-gray-100 p-4 text-sm">{status}</p>}
    </>
  );
}
