import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

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
