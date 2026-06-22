import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ returnTo?: string | string[] }> | { returnTo?: string | string[] };
}) {
  const user = await getAuthenticatedUser();
  const resolvedSearchParams = await searchParams;
  const returnToValue = Array.isArray(resolvedSearchParams?.returnTo)
    ? resolvedSearchParams?.returnTo[0]
    : resolvedSearchParams?.returnTo;
  const returnTo = returnToValue && returnToValue.startsWith("/") ? returnToValue : "/dashboard";

  if (user) {
    redirect(returnTo);
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-6 md:p-10">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-sm md:p-10">
        <h1 className="text-3xl font-semibold text-slate-950">Connexion</h1>
        <p className="mt-3 text-sm text-slate-600">
          Acces reserve aux pages d&apos;analyse et d&apos;import.
        </p>
        <LoginForm returnTo={returnTo} />
      </div>
    </main>
  );
}
