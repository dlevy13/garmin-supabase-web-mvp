"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function normalizeReturnTo(value: FormDataEntryValue | null): string {
  const rawValue = typeof value === "string" ? value : "";
  return rawValue.startsWith("/") ? rawValue : "/dashboard";
}

export async function loginAction(formData: FormData) {
  const email = typeof formData.get("email") === "string" ? formData.get("email")!.toString().trim() : "";
  const password = typeof formData.get("password") === "string" ? formData.get("password")!.toString() : "";
  const returnTo = normalizeReturnTo(formData.get("returnTo"));

  if (!email || !password) {
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}&error=${encodeURIComponent("Email et mot de passe requis.")}`);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      redirect(`/login?returnTo=${encodeURIComponent(returnTo)}&error=${encodeURIComponent(error.message)}`);
    }

    redirect(returnTo);
  } catch (error) {
    console.error("loginAction failed", error);
    redirect(
      `/login?returnTo=${encodeURIComponent(returnTo)}&error=${encodeURIComponent(
        "Erreur serveur pendant l'authentification.",
      )}`,
    );
  }
}
