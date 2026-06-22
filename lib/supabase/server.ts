import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublishableKey, supabaseUrl } from "@/lib/supabase/public";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      } catch {
        // Server Components can't always write cookies. Middleware handles refresh.
      }
    },
  };

  return createServerClient(supabaseUrl, getSupabasePublishableKey(), {
    cookies: cookieMethods,
  });
}
