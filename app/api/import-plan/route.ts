import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { parsePlanCsv } from "@/lib/trainingPlanCsv";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choisis un fichier CSV." }, { status: 400 });
    if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Le fichier dépasse 2 Mo." }, { status: 400 });
    let entries;
    try { entries = parsePlanCsv(await file.text()); }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "CSV invalide." }, { status: 400 }); }
    const { data, error } = await supabaseAdmin.rpc("import_training_plan", {
      p_user_id: user.id, p_file_name: file.name, p_entries: entries,
    });
    if (error) {
      console.error("Import training plan:", error);
      return NextResponse.json({ error: "Import impossible. Vérifie que la migration du plan a été exécutée dans Supabase." }, { status: 500 });
    }
    return NextResponse.json({ ...data, start: entries[0].date, end: entries.at(-1)!.date });
  } catch {
    return NextResponse.json({ error: "L’import a échoué. Réessaie dans quelques instants." }, { status: 500 });
  }
}
