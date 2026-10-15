// Holt Aktivitäten von Intervals.icu und speichert sie für den eingeloggten Nutzer.
// Der Intervals-API-Key liegt ausschließlich als Supabase-Secret (INTERVALS_API_KEY).
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://magicquan007.github.io",
  "http://localhost:5173",
];

function cors(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json" },
  });
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  const apiKey = Deno.env.get("INTERVALS_API_KEY");
  const athleteId = Deno.env.get("INTERVALS_ATHLETE_ID") ?? "0"; // 0 = Athlet des Keys
  if (!apiKey) return json({ error: "INTERVALS_API_KEY ist in Supabase nicht gesetzt" }, 500, origin);

  // Nutzer prüfen – nur eingeloggte Nutzer dürfen syncen
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Nicht eingeloggt" }, 401, origin);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } },
  );
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "Session ungültig" }, 401, origin);
  const userId = userData.user.id;

  let days = 90;
  try {
    const body = await req.json();
    if (typeof body?.days === "number") days = Math.min(Math.max(Math.round(body.days), 1), 3650);
  } catch { /* leerer Body ist okay */ }

  const newest = new Date();
  const oldest = new Date(newest.getTime() - days * 86_400_000);
  const url = `https://intervals.icu/api/v1/athlete/${athleteId}/activities` +
    `?oldest=${isoDate(oldest)}&newest=${isoDate(newest)}`;

  const res = await fetch(url, {
    headers: { Authorization: "Basic " + btoa(`API_KEY:${apiKey}`) },
  });
  if (!res.ok) {
    return json({ error: `Intervals.icu antwortet mit ${res.status}`, detail: await res.text() }, 502, origin);
  }

  // deno-lint-ignore no-explicit-any
  const items: any[] = await res.json();
  const rows = items
    .filter((a) => a?.id && a?.start_date)
    .map((a) => ({
      id: String(a.id),
      user_id: userId,
      start_date: a.start_date,
      start_date_local: a.start_date_local ?? null,
      type: a.type ?? null,
      name: a.name ?? null,
      distance_m: a.distance ?? null,
      moving_time_s: a.moving_time ?? null,
      elapsed_time_s: a.elapsed_time ?? null,
      elevation_gain_m: a.total_elevation_gain ?? null,
      avg_hr: a.average_heartrate != null ? Math.round(a.average_heartrate) : null,
      max_hr: a.max_heartrate != null ? Math.round(a.max_heartrate) : null,
      training_load: a.icu_training_load != null ? Math.round(a.icu_training_load) : null,
      avg_speed_ms: a.average_speed ?? null,
      raw: a,
      synced_at: new Date().toISOString(),
    }));

  if (rows.length > 0) {
    const { error } = await supabase.from("activities").upsert(rows, { onConflict: "user_id,id" });
    if (error) return json({ error: "Speichern fehlgeschlagen", detail: error.message }, 500, origin);
  }

  // Wellness (Schlaf, HRV, Ruhepuls, Fitness/Ermüdung) – Fehler hier brechen den Sync nicht ab
  let wellnessCount = 0;
  let wellnessError: string | null = null;
  try {
    const wRes = await fetch(
      `https://intervals.icu/api/v1/athlete/${athleteId}/wellness?oldest=${isoDate(oldest)}&newest=${isoDate(newest)}`,
      { headers: { Authorization: "Basic " + btoa(`API_KEY:${apiKey}`) } },
    );
    if (!wRes.ok) throw new Error(`Intervals ${wRes.status}`);
    // deno-lint-ignore no-explicit-any
    const wItems: any[] = await wRes.json();
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    const wRows = wItems
      .filter((w) => typeof w?.id === "string")
      .map((w) => ({
        user_id: userId,
        date: w.id,
        ctl: num(w.ctl),
        atl: num(w.atl),
        ramp_rate: num(w.rampRate),
        resting_hr: num(w.restingHR) != null ? Math.round(w.restingHR) : null,
        hrv: num(w.hrv),
        sleep_secs: num(w.sleepSecs) != null ? Math.round(w.sleepSecs) : null,
        sleep_score: num(w.sleepScore),
        weight: num(w.weight),
        readiness: num(w.readiness),
        raw: w,
        synced_at: new Date().toISOString(),
      }));
    if (wRows.length > 0) {
      const { error } = await supabase.from("wellness").upsert(wRows, { onConflict: "user_id,date" });
      if (error) throw new Error(error.message);
    }
    wellnessCount = wRows.length;
  } catch (e) {
    wellnessError = e instanceof Error ? e.message : String(e);
  }

  return json(
    { synced: rows.length, wellness: wellnessCount, wellness_error: wellnessError, oldest: isoDate(oldest), newest: isoDate(newest) },
    200,
    origin,
  );
});
