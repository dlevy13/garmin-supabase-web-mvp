import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublishableKey, supabaseUrl } from "@/lib/supabase/public";

export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, getSupabasePublishableKey());
}
