const supabaseUrlValue = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseUrlValue) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

export const supabaseUrl = supabaseUrlValue;
export function getSupabasePublishableKey(): string {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!value) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return value;
}
