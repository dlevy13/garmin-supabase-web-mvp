"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function PlanUploadForm() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = new FormData(form);
    setLoading(true);
    setStatus("Import en cours…");
    try {
      const response = await fetch("/api/import-plan", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Import impossible.");
      setStatus(`Import terminé : ${result.added} journées ajoutées, ${result.updated} mises à jour, ${result.unchanged} inchangées. Les autres dates sont conservées.`);
      form.reset();
      router.refresh();
    } catch (error) { setStatus(`Erreur : ${error instanceof Error ? error.message : "Connexion impossible."}`); }
    finally { setLoading(false); }
  }
  return <section className="rounded-3xl bg-white p-6 shadow-sm">
    <h2 className="text-xl font-semibold">Importer ou compléter le plan</h2>
    <p className="mt-2 text-sm text-slate-600">Une ligne par date. Chaque date présente remplace ses objectifs ; les dates absentes restent intactes. Tu peux importer trois mois aujourd’hui, puis un fichier plus complet plus tard.</p>
    <p className="mt-2 text-sm text-slate-600">Dates JJ/MM/AAAA ou AAAA-MM-JJ. Séparateur ; ou virgule. Heures décimales (1,5 = 1 h 30). Cellule vide : objectif non renseigné ; 0 : repos prévu. Une cellule vide remplace aussi l’ancienne valeur à cette date.</p>
    <a className="mt-3 inline-block text-sm text-indigo-600 underline" href="/plan-exemple.csv" download>Télécharger le modèle CSV</a>
    <form onSubmit={submit} className="mt-4 flex flex-wrap items-center gap-4">
      <label className="min-w-0 text-sm">Fichier du plan <input className="mt-2 block w-full" type="file" name="file" accept=".csv,text/csv" required disabled={loading} /></label>
      <button className="rounded-full bg-indigo-600 px-5 py-3 text-sm text-white disabled:opacity-50" disabled={loading}>{loading ? "Import…" : "Importer / mettre à jour"}</button>
    </form>
    <p role="status" aria-live="polite" className="mt-4 text-sm">{status}</p>
  </section>;
}
