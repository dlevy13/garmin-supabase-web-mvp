"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm({ returnTo = "/dashboard" }: { returnTo?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createSupabaseBrowserClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setError("Connexion etablie sans session exploitable.");
      setLoading(false);
      return;
    }

    window.location.assign(returnTo);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div>
        <label className="mb-2 block text-sm text-gray-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-gray-400"
          autoComplete="email"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-gray-700">Mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-gray-400"
          autoComplete="current-password"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-black px-5 py-3 text-white disabled:opacity-50"
      >
        {loading ? "Connexion..." : "Se connecter"}
      </button>

      {error ? <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
