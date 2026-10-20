// Vom Coach (Claude) vorbereitete Trainingspläne. Die App übernimmt jeden Block einmalig
// in planned_workouts und schickt die Einheiten an Intervals (→ Uhr).
import { callFunction, supabase } from "./supabase";
import { estimate, newSection, newStep, toIntervalsText, type Section, type Structure } from "./workout";

type ImportWorkout = { date: string; sport: string; name: string; notes?: string; structure: Structure };
type ImportBatch = { id: string; workouts: ImportWorkout[] };

const sec = (role: Section["role"], steps: ReturnType<typeof newStep>[], extra: Partial<Section> = {}) =>
  newSection(role, { steps, ...extra });

const BATCHES: ImportBatch[] = [
  {
    // Taper vor dem Gütersloher DJK Halbmarathon (25.10.2026)
    id: "taper-djk-2026",
    workouts: [
      {
        date: "2026-10-21", sport: "Run", name: "Lockerer Lauf zur Sauna (22 km)",
        notes: "Strikt locker: Puls unter 135, auch bergauf – lieber gehen als drücken. Sauna danach max. 2 kurze Gänge (8–10 min, untere Bank), dazwischen viel trinken + Salz (z. B. Isostar Powertab). Abends normal Kohlenhydrate essen.",
        structure: {
          sections: [
            sec("warmup", [newStep({ cue: "ganz ruhig anrollen", kind: "time", minutes: 10, paceFrom: "6:15", paceTo: "6:45" })]),
            sec("main", [newStep({ cue: "locker Puls unter 135", kind: "distance", km: 19.5, paceFrom: "5:50", paceTo: "6:30" })], { title: "Locker" }),
            sec("cooldown", [newStep({ cue: "austrudeln", kind: "time", minutes: 5, paceFrom: "6:30", paceTo: "7:00" })]),
          ],
        },
      },
      {
        date: "2026-10-23", sport: "Run", name: "Locker + 4 Steigerungen",
        notes: "Donnerstag ist Ruhetag (gern 10 min Mobility). Heute nur Beine auflockern – die Steigerungen locker-schnell, nicht hart.",
        structure: {
          sections: [
            sec("warmup", [newStep({ cue: "locker", kind: "time", minutes: 25, paceFrom: "5:40", paceTo: "6:10" })]),
            sec("main", [
              newStep({ cue: "Steigerung bis ca 3:50", kind: "time", minutes: 0, seconds: 20, paceFrom: "3:45", paceTo: "4:05" }),
              newStep({ cue: "gehen oder traben", kind: "time", minutes: 1, seconds: 10 }),
            ], { title: "Steigerungen", repeat: 4 }),
            sec("cooldown", [newStep({ cue: "austrudeln", kind: "time", minutes: 5, paceFrom: "6:00", paceTo: "6:30" })]),
          ],
        },
      },
      {
        date: "2026-10-24", sport: "Run", name: "Vorbelastung: 3× 1 min Renntempo",
        notes: "Startunterlagen/Startnummer checken, Gels + Koffein-Gel einpacken. Abends kohlenhydratreich (Nudeln/Reis), wenig Ballaststoffe, früh ins Bett.",
        structure: {
          sections: [
            sec("warmup", [newStep({ cue: "locker", kind: "time", minutes: 15, paceFrom: "5:40", paceTo: "6:10" })]),
            sec("main", [
              newStep({ cue: "Renntempo", kind: "time", minutes: 1, paceFrom: "4:20", paceTo: "4:25" }),
              newStep({ cue: "locker traben", kind: "time", minutes: 1, paceFrom: "5:45", paceTo: "6:30" }),
            ], { title: "Renntempo", repeat: 3 }),
            sec("cooldown", [newStep({ cue: "austrudeln", kind: "time", minutes: 5, paceFrom: "6:00", paceTo: "6:30" })]),
          ],
        },
      },
    ],
  },
];

const doneKey = (id: string) => `th.planImport.${id}`;

/** Übernimmt noch nicht importierte Pläne. Läuft still im Hintergrund; Fehler blockieren die App nicht. */
export async function applyPlanImports(): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  let changed = false;
  for (const b of BATCHES) {
    try { if (localStorage.getItem(doneKey(b.id)) === "1") continue; } catch { /* ignore */ }
    const todo = b.workouts.filter((w) => w.date >= today);
    let ok = true;
    if (todo.length) {
      const { data: existing, error } = await supabase.from("planned_workouts").select("date,name").in("date", todo.map((w) => w.date));
      if (error) continue; // z. B. noch nicht angemeldet → später erneut
      const have = new Set((existing ?? []).map((e) => `${e.date}|${e.name}`));
      for (const w of todo) {
        if (have.has(`${w.date}|${w.name}`)) continue;
        const est = estimate(w.structure, 360);
        const { data, error: insErr } = await supabase.from("planned_workouts").insert({
          date: w.date, sport: w.sport, name: w.name, notes: w.notes ?? null,
          structure: w.structure, description: toIntervalsText(w.structure),
          planned_distance_m: est.meters || null, planned_duration_s: est.seconds || null,
        }).select("id").single();
        if (insErr || !data) { ok = false; continue; }
        changed = true;
        await callFunction("intervals-plan", { action: "push", id: data.id });
      }
    }
    if (ok) try { localStorage.setItem(doneKey(b.id), "1"); } catch { /* ignore */ }
  }
  return changed;
}
