// Trägt die Detox-Phase einmalig in die Wochen-Essenspläne ein (auch wenn schon ein Plan existiert).
import { supabase } from "./supabase";
import { addDays, parseYmd, ymd } from "./dates";
import { DETOX_ID } from "./detox-recipes";
import { DEFAULT_PROFILE, applyDetox, generatePlan, type MealPlan, type NutritionProfile } from "./nutrition";
import type { PlannedWorkout } from "./workout";

const WEEKS = ["2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16"];
const key = (ws: string) => `th.detox.${DETOX_ID}.${ws}`;

export async function loadNutritionProfile(): Promise<NutritionProfile> {
  const [st, w] = await Promise.all([
    supabase.from("user_settings").select("nutrition").maybeSingle(),
    supabase.from("wellness").select("weight").not("weight", "is", null).order("date", { ascending: false }).limit(1),
  ]);
  const saved = st.data?.nutrition as NutritionProfile | null;
  const latestWeight = w.data?.[0]?.weight as number | undefined;
  return { ...DEFAULT_PROFILE, ...(saved ?? {}), weightKg: latestWeight ?? saved?.weightKg ?? DEFAULT_PROFILE.weightKg };
}

export async function workoutsByDate(ws: string): Promise<Record<string, PlannedWorkout[]> | null> {
  const to = ymd(addDays(parseYmd(ws), 6));
  const { data, error } = await supabase.from("planned_workouts").select("*").gte("date", ws).lte("date", to);
  if (error) return null;
  const by: Record<string, PlannedWorkout[]> = {};
  for (const w of (data as PlannedWorkout[]) ?? []) (by[w.date] ??= []).push(w);
  return by;
}

let running: Promise<boolean> | null = null;

/** true, wenn mindestens eine Woche neu geschrieben wurde. */
export function ensureDetoxPlans(): Promise<boolean> {
  running ??= run().finally(() => { running = null; });
  return running;
}

async function run(): Promise<boolean> {
  const today = ymd(new Date());
  let changed = false;
  let profile: NutritionProfile | null = null;
  for (const ws of WEEKS) {
    if (ymd(addDays(parseYmd(ws), 6)) < today) continue;
    try { if (localStorage.getItem(key(ws)) === "1") continue; } catch { /* ignore */ }
    const { data, error } = await supabase.from("meal_plans").select("plan,checked").eq("week_start", ws).maybeSingle();
    if (error) return changed; // z. B. nicht angemeldet → später erneut
    const existing = data?.plan as MealPlan | undefined;
    if (existing?.program !== DETOX_ID) {
      profile ??= await loadNutritionProfile();
      const by = await workoutsByDate(ws);
      if (!by) return changed;
      const base = existing ?? generatePlan(ws, by, profile);
      const plan = applyDetox(base, by, profile);
      const { error: upErr } = await supabase.from("meal_plans").upsert({
        week_start: ws, plan, checked: (data?.checked as Record<string, boolean>) ?? {}, updated_at: new Date().toISOString(),
      });
      if (upErr) return changed;
      changed = true;
    }
    try { localStorage.setItem(key(ws), "1"); } catch { /* ignore */ }
  }
  return changed;
}
