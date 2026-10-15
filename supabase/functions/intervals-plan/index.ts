// Spiegelt eine geplante Einheit in den Intervals.icu-Kalender (von dort → Garmin-Uhr).
// Body: { action: "push" | "delete", id: "<planned_workouts.id>" }
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = ["https://magicquan007.github.io", "http://localhost:5173"];

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

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  const apiKey = Deno.env.get("INTERVALS_API_KEY");
  const athleteId = Deno.env.get("INTERVALS_ATHLETE_ID") ?? "0";
  if (!apiKey) return json({ error: "INTERVALS_API_KEY ist in Supabase nicht gesetzt" }, 500, origin);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Nicht eingeloggt" }, 401, origin);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } },
  );
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "Session ungültig" }, 401, origin);

  let body: { action?: string; id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ungültiger Body" }, 400, origin);
  }
  const { action, id } = body;
  if (!id || (action !== "push" && action !== "delete")) {
    return json({ error: "action (push|delete) und id erforderlich" }, 400, origin);
  }

  const auth = { Authorization: "Basic " + btoa(`API_KEY:${apiKey}`) };
  const base = `https://intervals.icu/api/v1/athlete/${athleteId}`;

  if (action === "delete") {
    const res = await fetch(`${base}/events/bulk-delete`, {
      method: "PUT",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify([{ external_id: id }]),
    });
    if (!res.ok) {
      return json({ error: `Intervals antwortet mit ${res.status}`, detail: await res.text() }, 502, origin);
    }
    return json({ deleted: true }, 200, origin);
  }

  // push: Zeile lesen (RLS stellt sicher, dass sie dem Nutzer gehört)
  const { data: row, error: rowError } = await supabase
    .from("planned_workouts")
    .select("id,date,sport,name,description")
    .eq("id", id)
    .single();
  if (rowError || !row) return json({ error: "Einheit nicht gefunden" }, 404, origin);

  const event = {
    category: "WORKOUT",
    start_date_local: `${row.date}T00:00:00`,
    type: row.sport,
    name: row.name,
    description: row.description ?? "",
    external_id: row.id,
  };

  const res = await fetch(`${base}/events/bulk?upsert=true`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify([event]),
  });

  if (!res.ok) {
    const detail = await res.text();
    await supabase.from("planned_workouts")
      .update({ sync_error: `Intervals ${res.status}: ${detail.slice(0, 300)}` })
      .eq("id", id);
    return json({ error: `Intervals antwortet mit ${res.status}`, detail }, 502, origin);
  }

  // deno-lint-ignore no-explicit-any
  const created: any[] = await res.json();
  const eventId = created?.[0]?.id != null ? String(created[0].id) : null;

  await supabase.from("planned_workouts")
    .update({ intervals_event_id: eventId, synced_at: new Date().toISOString(), sync_error: null })
    .eq("id", id);

  return json({ event_id: eventId }, 200, origin);
});
