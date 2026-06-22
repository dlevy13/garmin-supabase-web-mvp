import { loginAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?:
    | Promise<{ returnTo?: string | string[]; error?: string | string[] }>
    | { returnTo?: string | string[]; error?: string | string[] };
}) {
  const resolvedSearchParams = await searchParams;
  const returnToValue = Array.isArray(resolvedSearchParams?.returnTo)
    ? resolvedSearchParams?.returnTo[0]
    : resolvedSearchParams?.returnTo;
  const returnTo = returnToValue && returnToValue.startsWith("/") ? returnToValue : "/dashboard";
  const errorValue = Array.isArray(resolvedSearchParams?.error)
    ? resolvedSearchParams?.error[0]
    : resolvedSearchParams?.error;

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-6 md:p-10">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-sm md:p-10">
        <h1 className="text-3xl font-semibold text-slate-950">Connexion</h1>
        <p className="mt-3 text-sm text-slate-600">
          Acces reserve aux pages d&apos;analyse et d&apos;import.
        </p>
        <form action={loginAction} className="mt-8 space-y-4">
          <input type="hidden" name="returnTo" value={returnTo} />

          <div>
            <label htmlFor="email" className="mb-2 block text-sm text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-gray-400"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm text-gray-700">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-gray-400"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="w-full rounded-2xl bg-black px-5 py-3 text-white">
            Se connecter
          </button>

          {errorValue ? (
            <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{errorValue}</p>
          ) : null}
        </form>
      </div>
    </main>
  );
}
