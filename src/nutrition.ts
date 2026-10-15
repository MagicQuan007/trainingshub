// Ernährungsplanung: Tagesziele aus dem Trainingsplan + Wochen-Essensplan + Einkaufsliste
//
// Grundlage:
// - Kohlenhydrat-Periodisierung nach Belastung („fuel for the work required“):
//   ACSM/IOC/Dietitians Position Stand (Thomas et al. 2016): 3–5 g/kg leicht, 5–7 g/kg moderat, 6–10 g/kg hoch;
//   Impey et al. 2018 (Sports Med).
// - Protein im Kaloriendefizit 1,8–2,2 g/kg zum Muskelerhalt (Helms et al. 2014; ISSN Position Stand 2017).
// - Defizit nur an Ruhe-/lockeren Tagen, nie an harten/langen Tagen → vermeidet niedrige Energieverfügbarkeit (RED-S, IOC 2023).
// - Fett mind. ~0,8 g/kg bzw. 20 % der Energie.
import { addDays, parseYmd, ymd } from "./dates";
import { RECIPES, byId, type Cat, type Protein, type Recipe, type Slot } from "./recipes";
import type { PlannedWorkout } from "./workout";

export type NutritionProfile = {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: "m" | "w";
  goal: "lose" | "maintain";
  adults: number;
  kids: number;
  fishPerWeek: number;
  meatPerWeek: number;
};

export const DEFAULT_PROFILE: NutritionProfile = {
  weightKg: 75, heightCm: 178, age: 40, sex: "m", goal: "lose", adults: 2, kids: 2, fishPerWeek: 1, meatPerWeek: 2,
};

export type DayType = "rest" | "strength" | "easy" | "hard" | "long";

export const DAY_LABEL: Record<DayType, string> = {
  rest: "Ruhetag", strength: "Kraft", easy: "Locker", hard: "Harte Einheit", long: "Langer Lauf",
};

const CARBS_PER_KG: Record<DayType, number> = { rest: 3, strength: 3.5, easy: 4.5, hard: 6, long: 7 };

export type Targets = { kcal: number; carbs: number; protein: number; fat: number };
export type MealRef = { slot: Slot; id: string; mult: number };
export type PlanDay = { date: string; type: DayType; preLong: boolean; exerciseKcal: number; targets: Targets; meals: MealRef[]; note?: string };
export type MealPlan = { generatedAt: string; days: PlanDay[] };

const HARD_RE = /intervall|schwelle|tempo|bahn|berg|renntempo|×|x\s?\d/i;

export function classifyDay(workouts: PlannedWorkout[]): { type: DayType; exerciseKcal: number; minutes: number } {
  const runs = workouts.filter((w) => w.sport !== "WeightTraining");
  const strength = workouts.some((w) => w.sport === "WeightTraining");
  const minutes = runs.reduce((s, w) => s + (w.planned_duration_s ?? 0) / 60, 0);
  if (runs.length === 0) return { type: strength ? "strength" : "rest", exerciseKcal: strength ? 250 : 0, minutes: 0 };
  const long = runs.some((w) => (w.planned_duration_s ?? 0) >= 90 * 60 || (w.planned_distance_m ?? 0) >= 20_000);
  const hard = runs.some((w) => HARD_RE.test(w.name));
  return { type: long ? "long" : hard ? "hard" : "easy", exerciseKcal: 0, minutes };
}

export function exerciseKcal(workouts: PlannedWorkout[], weightKg: number): number {
  let kcal = 0;
  for (const w of workouts) {
    if (w.sport === "WeightTraining") kcal += 250;
    else if (w.planned_distance_m && /run|walk|hike/i.test(w.sport)) kcal += (w.planned_distance_m / 1000) * weightKg * 0.9;
    else if (w.planned_duration_s) kcal += (w.planned_duration_s / 60) * 9;
  }
  return Math.round(kcal);
}

export function dayTargets(p: NutritionProfile, type: DayType, exKcal: number, preLong: boolean): Targets {
  const rmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === "m" ? 5 : -161); // Mifflin-St Jeor
  const baseline = rmr * 1.4; // Alltag ohne Training (überwiegend sitzend)
  const deficit = p.goal === "lose" && (type === "rest" || type === "strength" || type === "easy") && !preLong ? 400 : 0;
  let kcal = baseline + exKcal - deficit;
  const carbs = Math.round(p.weightKg * (CARBS_PER_KG[type] + (preLong ? 1 : 0)));
  const protein = Math.round(p.weightKg * (p.goal === "lose" ? 2.0 : 1.8));
  let fat = Math.round((kcal - carbs * 4 - protein * 4) / 9);
  const minFat = Math.round(p.weightKg * 0.8);
  if (fat < minFat) {
    fat = minFat;
    kcal = carbs * 4 + protein * 4 + fat * 9;
  }
  return { kcal: Math.round(kcal / 10) * 10, carbs, protein, fat };
}

// ---------------------------------------------------------------- Generator

function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function shuffle<T>(arr: T[], r: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const bySlot = (slot: Slot) => RECIPES.filter((r) => r.slot === slot);
const roundQ = (x: number) => Math.round(x * 4) / 4;

export function generatePlan(weekStart: string, workoutsByDate: Record<string, PlannedWorkout[]>, p: NutritionProfile, seed = Date.now()): MealPlan {
  const r = rng(seed);
  const dates = Array.from({ length: 7 }, (_, i) => ymd(addDays(parseYmd(weekStart), i)));
  const info = dates.map((d) => {
    const ws = workoutsByDate[d] ?? [];
    const c = classifyDay(ws);
    return { date: d, type: c.type, ex: exerciseKcal(ws, p.weightKg) };
  });
  const preLong = info.map((_, i) => info[i + 1]?.type === "long");
  const highCarbDay = info.map((x, i) => x.type === "hard" || x.type === "long" || preLong[i]);

  // Abendessen: Proteinquellen über die Woche verteilen
  const pattern: Protein[] = [];
  for (let i = 0; i < Math.min(p.fishPerWeek, 3); i++) pattern.push("fish");
  for (let i = 0; i < Math.min(p.meatPerWeek, 4); i++) pattern.push("meat");
  while (pattern.length < 7) pattern.push("veg");
  const kinds = shuffle(pattern, r);
  const usedDinners = new Set<string>();
  const dinners = info.map((_, i) => {
    const pool = shuffle(bySlot("dinner").filter((x) => x.type === kinds[i] && !usedDinners.has(x.id)), r);
    const pick = (highCarbDay[i] ? pool.find((x) => x.highCarb) : pool.find((x) => !x.highCarb)) ?? pool[0]
      ?? shuffle(bySlot("dinner").filter((x) => !usedDinners.has(x.id)), r)[0];
    usedDinners.add(pick.id);
    return pick;
  });

  // Frühstück: kohlenhydratreich an harten/langen Tagen
  const bf = shuffle(bySlot("breakfast"), r);
  const bfHigh = bf.filter((x) => x.highCarb);
  const bfLow = bf.filter((x) => !x.highCarb);
  // Mittag: Meal Prep – je 2 Tage dasselbe
  const lunches = shuffle(bySlot("lunch"), r);
  const lunchFor = (i: number) => (i < 5 ? lunches[Math.floor(i / 2) % lunches.length] : lunches[(3 + i) % lunches.length]);

  const days: PlanDay[] = info.map((d, i) => {
    const t = dayTargets(p, d.type, d.ex, preLong[i]);
    const breakfast = highCarbDay[i] ? bfHigh[i % bfHigh.length] : bfLow[i % bfLow.length];
    const meals: MealRef[] = [
      { slot: "breakfast", id: breakfast.id, mult: 1 },
      { slot: "lunch", id: lunchFor(i).id, mult: 1 },
      { slot: "dinner", id: dinners[i].id, mult: 1 },
    ];
    // Trainingssnacks
    const snacks: MealRef[] = [];
    if (d.type === "hard" || d.type === "long") {
      snacks.push({ slot: "snack", id: "s_banana", mult: 1 });
      snacks.push({ slot: "snack", id: "s_cocoa", mult: 1 });
    } else if (d.type === "strength" || d.type === "rest") {
      snacks.push({ slot: "snack", id: "s_skyr", mult: 1 }); // Protein nach dem Krafttraining / im Defizit
    }
    const snackKcal = snacks.reduce((s, m) => s + byId[m.id].kcal * m.mult, 0);
    const mealKcal = meals.reduce((s, m) => s + byId[m.id].kcal, 0);
    const mult = Math.min(1.5, Math.max(0.75, roundQ((t.kcal - snackKcal) / mealKcal)));
    meals.forEach((m) => (m.mult = mult));
    // Lücke mit Snack füllen (Protein bevorzugt)
    let total = mealKcal * mult + snackKcal;
    let protein = meals.reduce((s, m) => s + byId[m.id].protein * mult, 0) + snacks.reduce((s, m) => s + byId[m.id].protein, 0);
    const others = ["s_apple", "s_pb"];
    let k = 0;
    while (t.kcal - total > 180 && k < 2) {
      const usedSkyr = snacks.some((s) => s.id === "s_skyr");
      const id = t.protein - protein > 20 && !usedSkyr ? "s_skyr" : others[(i + k) % others.length];
      snacks.push({ slot: "snack", id, mult: 1 });
      total += byId[id].kcal;
      protein += byId[id].protein;
      k++;
    }
    return {
      date: d.date, type: d.type, preLong: preLong[i], exerciseKcal: d.ex, targets: t, meals: [...meals, ...snacks],
      note: preLong[i] ? "Vortag langer Lauf: Abends kohlenhydratreich, wenig Ballaststoffe/Fett." : undefined,
    };
  });

  return { generatedAt: new Date().toISOString(), days };
}

export function dayTotals(day: PlanDay): Targets {
  return day.meals.reduce(
    (s, m) => {
      const r = byId[m.id];
      if (!r) return s;
      return { kcal: s.kcal + r.kcal * m.mult, carbs: s.carbs + r.carbs * m.mult, protein: s.protein + r.protein * m.mult, fat: s.fat + r.fat * m.mult };
    },
    { kcal: 0, carbs: 0, protein: 0, fat: 0 },
  );
}

/** Nächstes Rezept im gleichen Slot (beim Abendessen bevorzugt gleiche Proteinquelle) */
export function nextAlternative(current: Recipe, usedIds: Set<string>): Recipe {
  const pool = RECIPES.filter((r) => r.slot === current.slot);
  const same = current.slot === "dinner" ? pool.filter((r) => r.type === current.type) : pool;
  const list = same.length > 1 ? same : pool;
  const idx = list.findIndex((r) => r.id === current.id);
  for (let k = 1; k <= list.length; k++) {
    const cand = list[(idx + k) % list.length];
    if (!usedIds.has(cand.id) || current.slot !== "dinner") return cand;
  }
  return list[(idx + 1) % list.length];
}

// ---------------------------------------------------------------- Einkaufsliste

export type ShopItem = { key: string; n: string; q: number; u: string; c: Cat };

export function shoppingList(plan: MealPlan, p: NutritionProfile): Record<Cat, ShopItem[]> {
  const acc = new Map<string, ShopItem>();
  for (const day of plan.days) {
    for (const m of day.meals) {
      const r = byId[m.id];
      if (!r) continue;
      // Abendessen für die ganze Familie: du (mult) + weitere Erwachsene (0,9) + Kinder (0,6)
      const factor = r.slot === "dinner" ? m.mult + Math.max(0, p.adults - 1) * 0.9 + p.kids * 0.6 : m.mult;
      for (const ing of r.ing) {
        const key = `${ing.n}|${ing.u}`;
        const cur = acc.get(key) ?? { key, n: ing.n, q: 0, u: ing.u, c: ing.c };
        cur.q += ing.q * factor;
        acc.set(key, cur);
      }
    }
  }
  const round = (q: number, u: string) =>
    u === "g" ? Math.ceil(q / 10) * 10 : u === "ml" ? Math.ceil(q / 50) * 50 : Math.ceil(q * 2) / 2;
  const out = {} as Record<Cat, ShopItem[]>;
  for (const it of acc.values()) {
    it.q = round(it.q, it.u);
    (out[it.c] ??= []).push(it);
  }
  for (const c of Object.keys(out) as Cat[]) out[c].sort((a, b) => a.n.localeCompare(b.n, "de"));
  return out;
}

export const CAT_ORDER: Cat[] = ["Obst & Gemüse", "Kühlregal", "Fleisch & Fisch", "Brot & Getreide", "Vorrat", "Tiefkühl"];
