// Tagesbereitschaft aus Check-in (subjektiv, Hauptgewicht) + HRV/Ruhepuls (objektiv, Korrektur)
// Subjektive Fragebögen reagieren empfindlicher auf Belastung als objektive Marker (Saw et al. 2016, BJSM).
import { estimate, newSection, newStep, type PlannedWorkout, type Structure } from "./workout";
import { fmtPace, type CoachSettings } from "./coach";

export type CheckIn = {
  date: string;
  sleep: number;
  energy: number;
  soreness: number;
  stress: number;
  mood: number;
  ill: boolean;
  pain: boolean;
  minutes_available: number | null;
  note: string | null;
  score: number | null;
  recommendation: string | null;
};

export type Level = "plan" | "easy" | "short" | "rest";

export const LEVEL_TEXT: Record<Level, { title: string; text: string; tone: string }> = {
  plan: { title: "Wie geplant", text: "Du bist gut erholt – zieh die Einheit wie geplant durch.", tone: "ok" },
  easy: { title: "Locker statt hart", text: "Heute keine Intensität. Ersetze die harte Einheit durch einen lockeren Lauf in Z1.", tone: "warn" },
  short: { title: "Kürzer & locker", text: "Belastung reduzieren: kürzer und nur locker. Erholung hat heute Vorrang.", tone: "warn" },
  rest: { title: "Pause", text: "Heute Ruhetag oder höchstens Spazierengehen/Mobilität.", tone: "bad" },
};

export const ITEMS: { key: "sleep" | "energy" | "soreness" | "stress" | "mood"; label: string; low: string; high: string }[] = [
  { key: "sleep", label: "Schlaf", low: "sehr schlecht", high: "sehr gut" },
  { key: "energy", label: "Energie", low: "platt", high: "frisch" },
  { key: "soreness", label: "Muskeln", low: "starker Kater", high: "locker" },
  { key: "stress", label: "Stress (Job/Alltag)", low: "sehr hoch", high: "entspannt" },
  { key: "mood", label: "Stimmung", low: "mies", high: "super" },
];

export function computeScore(
  c: Pick<CheckIn, "sleep" | "energy" | "soreness" | "stress" | "mood">,
  hrv?: { today: number | null; avg: number | null },
  rhr?: { today: number | null; avg: number | null },
): { score: number; notes: string[] } {
  const notes: string[] = [];
  // „3“ überall = normaler Tag = 70; jeder Punkt darüber/darunter ±4
  const sum = c.sleep + c.energy + c.soreness + c.stress + c.mood; // 5..25
  let score = 70 + (sum - 15) * 4;
  if (hrv?.today && hrv.avg) {
    const d = (hrv.today - hrv.avg) / hrv.avg;
    if (d < -0.2) { score -= 20; notes.push(`HRV ${Math.round(d * 100)} % unter Schnitt`); }
    else if (d < -0.1) { score -= 10; notes.push(`HRV ${Math.round(d * 100)} % unter Schnitt`); }
  }
  if (rhr?.today && rhr.avg) {
    const d = rhr.today - rhr.avg;
    if (d >= 8) { score -= 15; notes.push(`Ruhepuls +${Math.round(d)} über Schnitt`); }
    else if (d >= 5) { score -= 10; notes.push(`Ruhepuls +${Math.round(d)} über Schnitt`); }
  }
  if (c.stress <= 2) notes.push("hoher Alltagsstress");
  if (c.sleep <= 2) notes.push("schlechter Schlaf");
  return { score: Math.max(0, Math.min(100, Math.round(score))), notes };
}

/** Ist die Einheit hart (Z2/Z3)? Erkennbar an Pace-Zielen schneller als LT1 */
export function isHard(w: PlannedWorkout, s: CoachSettings): boolean {
  if (!w.structure) return /intervall|schwelle|tempo|bahn|berg|renntempo|×/i.test(w.name);
  return w.structure.sections.some((sec) =>
    sec.steps.some((st) => {
      const m = /^(\d{1,2}):(\d{2})$/.exec(st.paceFrom.trim());
      const pace = m ? Number(m[1]) * 60 + Number(m[2]) : null;
      return (pace != null && pace < s.lt1Pace) || /hart|bergauf|renntempo/i.test(st.cue);
    }),
  );
}

export function recommend(score: number, c: Pick<CheckIn, "ill" | "pain" | "minutes_available">, todays: PlannedWorkout[], s: CoachSettings): Level {
  if (c.ill || c.pain) return "rest";
  const runs = todays.filter((w) => w.sport !== "WeightTraining");
  const hard = runs.some((w) => isHard(w, s));
  const plannedMin = Math.max(0, ...runs.map((w) => (w.planned_duration_s ?? 0) / 60));
  if (score < 45) return "rest";
  if (score < 58) return "short";
  if (score < 70 && hard) return "easy";
  if (c.minutes_available && plannedMin > c.minutes_available + 5) return "short";
  return "plan";
}

/** Erzeugt die angepasste Version einer Einheit */
export function adjustWorkout(w: PlannedWorkout, level: Level, s: CoachSettings, minutesAvailable?: number | null) {
  const easyFrom = fmtPace(s.lt1Pace + 35);
  const easyTo = fmtPace(s.lt1Pace + 10);
  const origMin = (w.planned_duration_s ?? 0) / 60;

  if (level === "rest") {
    return { name: `Ruhetag (statt ${w.name})`, structure: null as Structure | null, description: null as string | null, sport: w.sport, push: false };
  }
  let minutes: number;
  if (level === "easy") minutes = Math.min(50, Math.max(30, Math.round((origMin * 0.6) / 5) * 5 || 40));
  else minutes = Math.min(35, Math.max(20, Math.round((origMin * 0.45) / 5) * 5 || 30));
  if (minutesAvailable) minutes = Math.min(minutes, Math.max(15, minutesAvailable - 5));

  const st: Structure = { sections: [newSection("main", { steps: [newStep({ minutes, paceFrom: easyFrom, paceTo: easyTo })] })] };
  return {
    name: `${level === "easy" ? "Locker" : "Kurz & locker"} ${minutes} min (statt ${w.name})`,
    structure: st,
    description: null as string | null, // wird aus der Struktur erzeugt
    sport: w.sport === "WeightTraining" ? w.sport : "Run",
    push: true,
    estimate: estimate(st),
  };
}

/** Belastungsfaktor für den Wochenvorschlag aus dem Schnitt der letzten Check-ins */
export function loadFactorFromCheckins(scores: number[]): { factor: number; reason: string } {
  if (scores.length < 3) return { factor: 1, reason: "Zu wenige Check-ins für eine Anpassung" };
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg < 50) return { factor: 0.7, reason: `Ø Bereitschaft ${Math.round(avg)} – Woche deutlich entlasten` };
  if (avg < 65) return { factor: 0.85, reason: `Ø Bereitschaft ${Math.round(avg)} – etwas weniger Umfang, nur 1 harte Einheit` };
  return { factor: 1, reason: `Ø Bereitschaft ${Math.round(avg)} – voller Plan` };
}
