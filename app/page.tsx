import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen p-10">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-10 shadow-sm">
        <h1 className="text-4xl font-semibold">Garmin Season Analyzer</h1>
        <p className="mt-4 text-gray-600">
          Upload Garmin CSV, Supabase, TSS, CTL, ATL, TSB.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Les pages d&apos;analyse et d&apos;import demandent une connexion.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login?returnTo=%2Fupload" className="rounded-full bg-black px-5 py-3 text-white">
            Se connecter pour importer
          </Link>
          <Link href="/login?returnTo=%2Fdashboard" className="rounded-full bg-gray-100 px-5 py-3">
            Dashboard
          </Link>
          <Link href="/login?returnTo=%2Factivities" className="rounded-full bg-gray-100 px-5 py-3">
            Activités
          </Link>
          <Link href="/login?returnTo=%2Fimports" className="rounded-full bg-gray-100 px-5 py-3">
            Imports
          </Link>
        </div>
      </div>
    </main>
  );
}
