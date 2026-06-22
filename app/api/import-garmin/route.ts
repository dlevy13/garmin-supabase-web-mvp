import { NextResponse } from "next/server";
import { parseGarminCsv } from "@/lib/garmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { recomputePmc } from "@/lib/pmc";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Aucun fichier reçu." }, { status: 400 });
    }

    const csvText = await file.text();

    let activities;

    try {
      activities = parseGarminCsv(csvText);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur CSV inconnue";

      return NextResponse.json(
        {
          error: `Erreur de lecture CSV : ${message}. Essaie de réexporter le fichier Garmin ou corrige la ligne indiquée.`
        },
        { status: 400 }
      );
    }

    if (activities.length === 0) {
      return NextResponse.json({ error: "Aucune activité vélo trouvée dans ce fichier." }, { status: 400 });
    }

    const uniqueActivities = Array.from(
      new Map(activities.map((activity: any) => [activity.activity_id, activity])).values()
    );
    const duplicateRowsInFile = activities.length - uniqueActivities.length;
    const tssSources = uniqueActivities.reduce<Record<string, number>>((acc, activity: any) => {
      const source = String(activity.tss_source ?? "unknown");
      acc[source] = (acc[source] ?? 0) + 1;
      return acc;
    }, {});

    const activityIds = uniqueActivities.map((activity: any) => activity.activity_id);
    const existingIds = new Set<string>();

    for (let i = 0; i < activityIds.length; i += 500) {
      const { data: existingActivities, error: existingError } = await supabaseAdmin
        .from("activities")
        .select("activity_id")
        .in("activity_id", activityIds.slice(i, i + 500));

      if (existingError) {
        return NextResponse.json({ error: existingError.message }, { status: 500 });
      }

      for (const existingActivity of existingActivities ?? []) {
        existingIds.add(String(existingActivity.activity_id));
      }
    }

    const duplicatesIgnored = duplicateRowsInFile + existingIds.size;
    const activitiesImported = uniqueActivities.length - existingIds.size;

    const { error } = await supabaseAdmin
      .from("activities")
      .upsert(uniqueActivities, { onConflict: "activity_id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const pmc = await recomputePmc();

    await supabaseAdmin.from("imports").insert({
      file_name: file.name,
      activities_in_file: activities.length,
      activities_upserted: activitiesImported,
      duplicates_ignored: duplicatesIgnored,
      pmc_status: pmc.days > 0 ? "recalculé" : "aucune donnée"
    });

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      activities: activitiesImported,
      duplicatesIgnored,
      pmcDays: pmc.days,
      parserVersion: "garmin-csv-quotes-v3",
      tssSources
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
