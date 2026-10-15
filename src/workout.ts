// Workout-Baukasten: Struktur ↔ Intervals.icu-Workout-Text

export type DurKind = "time" | "distance";

export type Step = {
  id: string;
  cue: string;        // Hinweistext auf der Uhr, optional
  kind: DurKind;
  minutes: number;
  seconds: number;
  km: number;
  paceFrom: string;   // "4:30" – leer = ohne Pace-Ziel
  paceTo: string;     // optional, für Bereich
};

export type SectionRole = "warmup" | "main" | "cooldown";

export type Section = {
  id: string;
  role: SectionRole;
  title: string;
  repeat: number;
  steps: Step[];
};

export type Structure = { sections: Section[] };

export type PlannedWorkout = {
  id: string;
  date: string;
  sport: string;
  name: string;
  structure: Structure | null;
  description: string | null;
  notes: string | null;
  planned_distance_m: number | null;
  planned_duration_s: number | null;
  intervals_event_id: string | null;
  synced_at: string | null;
  sync_error: string | null;
};

export const SPORTS: { value: string; label: string }[] = [
  { value: "Run", label: "Lauf" },
  { value: "TrailRun", label: "Trail" },
  { value: "Ride", label: "Rad" },
  { value: "WeightTraining", label: "Kraft" },
  { value: "Walk", label: "Gehen" },
  { value: "Workout", label: "Sonstiges" },
];

export const ROLE_LABEL: Record<SectionRole, string> = {
  warmup: "Einlaufen",
  main: "Hauptteil",
  cooldown: "Auslaufen",
};

export const uid = () => Math.random().toString(36).slice(2, 10);

export function newStep(partial: Partial<Step> = {}): Step {
  return { id: uid(), cue: "", kind: "time", minutes: 10, seconds: 0, km: 1, paceFrom: "", paceTo: "", ...partial };
}

export function newSection(role: SectionRole, partial: Partial<Section> = {}): Section {
  return { id: uid(), role, title: "", repeat: 1, steps: [newStep()], ...partial };
}

const PACE_RE = /^(\d{1,2}):([0-5]\d)$/;

export function paceToSec(p: string): number | null {
  const m = PACE_RE.exec(p.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function validPace(p: string) {
  return p.trim() === "" || PACE_RE.test(p.trim());
}

function stepSeconds(s: Step) {
  return Math.max(0, Math.round(s.minutes || 0) * 60 + Math.round(s.seconds || 0));
}

function fmtDur(s: Step): string {
  if (s.kind === "distance") {
    const km = Math.max(0, s.km || 0);
    return `${Number(km.toFixed(3))}km`;
  }
  const total = stepSeconds(s);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  if (sec === 0) return `${m}m`;
  if (m === 0) return `${sec}s`;
  return `${m}m${sec}`;
}

function fmtPace(s: Step): string {
  const from = s.paceFrom.trim();
  const to = s.paceTo.trim();
  if (!from || !PACE_RE.test(from)) return "";
  if (to && PACE_RE.test(to) && to !== from) return ` ${from}-${to}/km Pace`;
  return ` ${from}/km Pace`;
}

function sectionHeader(sec: Section): string {
  const base =
    sec.role === "warmup" ? "Warmup" :
    sec.role === "cooldown" ? "Cooldown" :
    (sec.title.trim() || "Main Set");
  return sec.repeat > 1 ? `${base} ${sec.repeat}x` : base;
}

/** Erzeugt den Workout-Text, den Intervals.icu parst und an Garmin schickt */
export function toIntervalsText(st: Structure): string {
  return st.sections
    .filter((sec) => sec.steps.length > 0)
    .map((sec) => {
      const lines = sec.steps.map((s) => {
        const cue = s.cue.replace(/[\r\n-]/g, " ").trim();
        return `- ${cue ? cue + " " : ""}${fmtDur(s)}${fmtPace(s)}`;
      });
      return [sectionHeader(sec), ...lines].join("\n");
    })
    .join("\n\n");
}

/** Grobe Schätzung von Dauer und Distanz; Schritte ohne Pace nutzen `fallbackPace` (s/km), falls angegeben */
export function estimate(st: Structure, fallbackPace?: number): { seconds: number; meters: number } {
  let seconds = 0;
  let meters = 0;
  for (const sec of st.sections) {
    const reps = Math.max(1, sec.repeat || 1);
    for (const s of sec.steps) {
      const a = paceToSec(s.paceFrom);
      const b = paceToSec(s.paceTo);
      const pace = (a && b ? (a + b) / 2 : a) ?? fallbackPace ?? null; // Sekunden pro km
      if (s.kind === "time") {
        const t = stepSeconds(s);
        seconds += t * reps;
        if (pace) meters += (t / pace) * 1000 * reps;
      } else {
        const m = Math.max(0, s.km || 0) * 1000;
        meters += m * reps;
        if (pace) seconds += (m / 1000) * pace * reps;
      }
    }
  }
  return { seconds: Math.round(seconds), meters: Math.round(meters) };
}

export function validate(st: Structure): string | null {
  for (const sec of st.sections) {
    for (const s of sec.steps) {
      if (!validPace(s.paceFrom) || !validPace(s.paceTo)) return "Pace bitte als m:ss eingeben, z. B. 4:30";
      if (s.kind === "time" && stepSeconds(s) === 0) return "Ein Schritt hat keine Dauer";
      if (s.kind === "distance" && !(s.km > 0)) return "Ein Schritt hat keine Distanz";
    }
  }
  return null;
}

export const TEMPLATES: { key: string; label: string; name: string; build: () => Structure }[] = [
  {
    key: "easy",
    label: "Lockerer Lauf",
    name: "Lockerer Dauerlauf",
    build: () => ({ sections: [newSection("main", { steps: [newStep({ minutes: 45 })] })] }),
  },
  {
    key: "intervals",
    label: "Intervalle",
    name: "Intervalle",
    build: () => ({
      sections: [
        newSection("warmup", { steps: [newStep({ minutes: 15 })] }),
        newSection("main", {
          repeat: 6,
          steps: [
            newStep({ kind: "distance", km: 1, paceFrom: "4:30" }),
            newStep({ minutes: 2, cue: "Trabpause" }),
          ],
        }),
        newSection("cooldown", { steps: [newStep({ minutes: 10 })] }),
      ],
    }),
  },
  {
    key: "tempo",
    label: "Tempodauerlauf",
    name: "Tempodauerlauf",
    build: () => ({
      sections: [
        newSection("warmup", { steps: [newStep({ minutes: 15 })] }),
        newSection("main", { steps: [newStep({ minutes: 25, paceFrom: "4:50", paceTo: "4:40" })] }),
        newSection("cooldown", { steps: [newStep({ minutes: 10 })] }),
      ],
    }),
  },
  {
    key: "long",
    label: "Langer Lauf",
    name: "Langer Lauf",
    build: () => ({ sections: [newSection("main", { steps: [newStep({ minutes: 100 })] })] }),
  },
  {
    key: "strides",
    label: "Steigerungen",
    name: "Lauf + Steigerungen",
    build: () => ({
      sections: [
        newSection("main", { steps: [newStep({ minutes: 35 })] }),
        newSection("main", {
          title: "Steigerungen",
          repeat: 6,
          steps: [newStep({ minutes: 0, seconds: 20, cue: "Steigern" }), newStep({ minutes: 1, cue: "Gehen/Traben" })],
        }),
      ],
    }),
  },
];
