import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Edge Function aufrufen; liefert eine lesbare Fehlermeldung statt eines Error-Objekts */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function callFunction<T = any>(name: string, body: Record<string, unknown>): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) return { data: data as T, error: null };
  let detail = error.message;
  try {
    const ctx = await (error as { context?: Response }).context?.json();
    if (ctx?.error) detail = ctx.error;
  } catch {
    /* ignore */
  }
  return { data: null, error: detail };
}

export type Activity = {
  id: string;
  start_date: string;
  start_date_local: string | null;
  type: string | null;
  name: string | null;
  distance_m: number | null;
  moving_time_s: number | null;
  elevation_gain_m: number | null;
  avg_hr: number | null;
  training_load: number | null;
  avg_speed_ms: number | null;
};
