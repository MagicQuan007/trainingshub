// Coach: polarisiertes 3-Zonen-Modell, Saisonplan und Wochenvorschläge
//
// Wissenschaftliche Grundlage (Kurzfassung, Details im Coach-Tab):
// - 3-Zonen-Modell nach Seiler: Z1 < LT1/VT1, Z2 zwischen LT1 und LT2, Z3 > LT2/VT2
// - Polarisiert ≈ 80 % Z1 / ≤ 5–10 % Z2 / 15–20 % Z3 (Zeit in Zone)
// - Filipas et al. 2022 (SJMSS): pyramidal → polarisiert (je 8 Wo.) brachte die größten Zuwächse
// - Eihara et al. 2022 (Sports Med Open): schweres Krafttraining (≤ 5 RM) verbessert Laufökonomie, ≥ 10 Wochen
import { addDays, parseYmd, ymd } from "./dates";
import { newSection, newStep, toIntervalsText, estimate, type Structure } from "./workout";

// ---------------------------------------------------------------- Zonen

export type CoachSettings = {
  lt1Hr: number;     // Herzfrequenz an LT1/VT1
  lt2Hr: number;     // Herzfrequenz an LT2/VT2 (≈ Laktatschwelle)
  lt1Pace: number;   // s/km an LT1
  lt2Pace: number;   // s/km an LT2
  vo2Pace: number;   // s/km ≈ 5-km-Renntempo
  model?: "hybrid" | "polarized"; // Hybrid: Basis norwegisch (Sub-Schwelle), danach polarisiert
};

/** Startwerte aus Garmin (LTHR 173, Prognose 5 km 19:12 / HM 1:33:33) – im Coach-Tab anpassbar */
export const DEFAULT_SETTINGS: CoachSettings = {
  lt1Hr: 155,
  lt2Hr: 173,
  lt1Pace: 305, // 5:05
  lt2Pace: 258, // 4:18
  vo2Pace: 230, // 3:50
  model: "hybrid",
};

/** Ziel-Intensitätsverteilung je Phase und Modell */
export function targetTid(phase: PhaseKey, model: CoachSettings["model"]): [number, number, number] {
  if (model !== "polarized" && phase === "base") return [75, 22, 3];
  return PHASES[phase].tid;
}

export function phaseFocus(phase: PhaseKey, model: CoachSettings["model"]): string {
  if (model !== "polarized" && phase === "base")
    return "Norwegisch light: 2 kontrollierte Sub-Schwellen-Einheiten (Puls-Deckel), Rest locker, schwere Kraft";
  return PHASES[phase].focus;
}

export const fmtPace = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export function zones(s: CoachSettings) {
  return [
    { key: "z1", name: "Z1 · locker", hr: `< ${s.lt1Hr}`, pace: `langsamer als ${fmtPace(s.lt1Pace)}`, use: "Grundlage, lange Läufe, Erholung" },
    { key: "z2", name: "Z2 · Schwelle", hr: `${s.lt1Hr}–${s.lt2Hr - 1}`, pace: `${fmtPace(s.lt1Pace)}–${fmtPace(s.lt2Pace)}`, use: "Tempodauerlauf, Renntempo Hermannslauf – sparsam" },
    { key: "z3", name: "Z3 · hart", hr: `≥ ${s.lt2Hr}`, pace: `schneller als ${fmtPace(s.lt2Pace)}`, use: "Intervalle (VO₂max), Bergsprints" },
  ];
}

// ---------------------------------------------------------------- Rennen & Phasen

/** Einlaufen mit der Laufgruppe: 15 min locker, dann Lauf-ABC – endet per Lap-Taste, die Uhr läuft durch. */
export function groupWarmup(eFrom: string, eTo: string) {
  return newSection("warmup", { steps: [
    newStep({ minutes: 15, paceFrom: eFrom, paceTo: eTo }),
    newStep({ minutes: 10, cue: "Lauf-ABC", lap: true }),
  ] });
}

export const RACES = [
  { key: "djk-gt-2026", name: "DJK Halbmarathon Gütersloh", date: "2026-10-25", detail: "21,1 km Straße, flach · Trail-&-Road-Cup #4 · Ziel 1:32:30", primary: false },
  { key: "xmas-cross-2026", name: "Weihnachts-Crosslauf Borgholzhausen", date: "2026-12-13", detail: "16 km Cross, hügelig · Cup #5 · Trainingswettkampf", primary: false },
  { key: "lipperreihe-2026", name: "Weihnachtslauf Lipperreihe", date: "2026-12-20", detail: "10 km · Oerlinghausen · 10-km-Test", primary: false },
  { key: "luisenturm-2027", name: "Luisenturmlauf Borgholzhausen", date: "2027-03-07", detail: "21,1 km Straße/Wald über den Luisenturm · Cup #6 · Formtest", primary: false },
  { key: "hermann", name: "Hermannslauf", date: "2027-04-25", detail: "31,1 km Trail · +510/−710 Hm · Ziel 2:20:00 · Cup-Finale", primary: true },
  { key: "rennsteig", name: "Rennsteiglauf Supermarathon", date: "2027-05-22", detail: "73,9 km · gut ins Ziel kommen", primary: false },
];

export type PhaseKey = "reset" | "base" | "build" | "specific" | "taper" | "race" | "recover" | "ultra";

export const PHASES: Record<PhaseKey, { name: string; color: string; tid: [number, number, number]; focus: string }> = {
  reset:    { name: "Wiedereinstieg", color: "#8a93a3", tid: [90, 5, 5],   focus: "Belastungsspitze abbauen, nur locker" },
  base:     { name: "Basis",          color: "#3fd0c9", tid: [80, 10, 10], focus: "Umfang aufbauen, 1× VO₂max-Intervalle, schwere Kraft" },
  build:    { name: "Aufbau",         color: "#c6f432", tid: [80, 5, 15],  focus: "Polarisiert: 2 harte Einheiten (Bahn + Berg), Rest konsequent locker" },
  specific: { name: "Spezifisch",     color: "#f5a524", tid: [80, 10, 10], focus: "Hermannslauf-spezifisch: Hügel, Bergab, Renntempo-Abschnitte, Trail-Longruns" },
  taper:    { name: "Tapering",       color: "#b48cff", tid: [80, 5, 15],  focus: "Umfang −30–40 %, Intensität halten" },
  race:     { name: "Rennwoche",      color: "#ff6b6b", tid: [85, 5, 10],  focus: "Frisch an den Start" },
  recover:  { name: "Erholung",       color: "#8a93a3", tid: [95, 5, 0],   focus: "Regeneration nach dem Hermannslauf" },
  ultra:    { name: "Rennsteig",      color: "#7d8cff", tid: [90, 7, 3],   focus: "Lange Läufe, Back-to-back, Verpflegung testen" },
};

export type PlanWeek = {
  start: string;      // Montag yyyy-mm-dd
  phase: PhaseKey;
  km: number;         // Ziel-Wochenumfang
  longKm: number;     // langer Lauf Sonntag
  recovery?: boolean; // Entlastungswoche
  note?: string;
  race?: { name: string; km: number; notes: string; day?: number }; // Aufbau-Wettkampf (day: 0 = Mo … 6 = So, Standard So)
};

const W = (start: string, phase: PhaseKey, km: number, longKm: number, recovery = false, note?: string, race?: PlanWeek["race"]): PlanWeek =>
  ({ start, phase, km, longKm, recovery, note, race });

/** Saisonplan: 3:1-Rhythmus, Peak ≈ 55 km, Tapering 2 Wochen */
export const SEASON: PlanWeek[] = [
  W("2026-10-12", "reset", 30, 14, true, "Laufende Woche: hohe Akutlast – Rest der Woche nur locker"),
  W("2026-10-19", "base", 34, 14, false, "Wiedereinstieg nach Pause, noch keine harten Einheiten außer Dienstag",
    { name: "DJK Halbmarathon Gütersloh", km: 21.1, notes: "Cup #4 · Ziel 1:32:30 (4:23/km), km 1–5 bei 4:26–4:28 anlaufen." }),
  W("2026-10-26", "base", 32, 14, true, "Erholung nach dem Halbmarathon: bis Mittwoch nur locker, Bahn nur wenn die Beine frisch sind"),
  W("2026-11-02", "base", 42, 18),
  W("2026-11-09", "base", 32, 14, true),
  W("2026-11-16", "base", 42, 18),
  W("2026-11-23", "base", 45, 19),
  W("2026-11-30", "base", 47, 20),
  W("2026-12-07", "base", 36, 16, true, "Entlastungswoche mit Cup-Lauf am Sonntag",
    { name: "Weihnachts-Crosslauf Borgholzhausen", km: 16, notes: "Cup #5 · 2 Runden über den Barenberg, Matsch möglich – Trailschuhe. Als harter Trainingslauf, nicht volle Pulle." }),
  W("2026-12-14", "build", 44, 18, false, "Aufbau mit 10-km-Test am Sonntag",
    { name: "Weihnachtslauf Lipperreihe", km: 10, notes: "Heimrennen in Oerlinghausen · 10-km-Test eine Woche nach dem Crosslauf: zügig, aber kontrolliert (Ziel ~40–41 min). Danach 20–30 min auslaufen." }),
  W("2026-12-21", "build", 40, 18, false, "Weihnachten – flexibel"),
  W("2026-12-28", "build", 48, 21),
  W("2027-01-04", "build", 36, 16, true),
  W("2027-01-11", "build", 50, 22),
  W("2027-01-18", "build", 52, 23),
  W("2027-01-25", "build", 54, 24),
  W("2027-02-01", "build", 40, 18, true),
  W("2027-02-08", "specific", 52, 24),
  W("2027-02-15", "specific", 54, 25),
  W("2027-02-22", "specific", 55, 26),
  W("2027-03-01", "specific", 44, 21, true, "Entlastungswoche mit Formtest am Sonntag",
    { name: "Luisenturmlauf Borgholzhausen", km: 21.1, notes: "Cup #6 · Hügeliger Halbmarathon über den Luisenturm – Generalprobe für Hermannslauf-Tempo bergauf/bergab, Gels wie im Rennen." }),
  W("2027-03-08", "specific", 54, 27, false, "Long Run auf dem Hermannsweg"),
  W("2027-03-15", "specific", 55, 27, false, "Spitzenwoche: langer Lauf mit Höhenmetern auf dem Hermannsweg"),
  W("2027-03-22", "specific", 55, 28, false, "Generalprobe: Longrun mit Renntempo-Blöcken"),
  W("2027-03-29", "specific", 42, 20, true),
  W("2027-04-05", "specific", 52, 24),
  W("2027-04-12", "taper", 40, 18),
  W("2027-04-19", "race", 26, 31, false, "So: Hermannslauf"),
  W("2027-04-26", "recover", 20, 10, true),
  W("2027-05-03", "ultra", 62, 32, false, "Längster Lauf, Verpflegung wie im Rennen"),
  W("2027-05-10", "ultra", 50, 24, false, "Back-to-back Sa/So"),
  W("2027-05-17", "race", 18, 74, false, "Sa: Rennsteiglauf"),
];

export function weekFor(date: Date): PlanWeek | undefined {
  const d = ymd(date);
  return SEASON.find((w) => d >= w.start && d <= ymd(addDays(parseYmd(w.start), 6)));
}

// ---------------------------------------------------------------- Wochenvorschlag

export type Proposal = {
  date: string;
  sport: string;
  name: string;
  zone: "Z1" | "Z2" | "Z3" | "Kraft";
  structure: Structure | null;
  description: string | null;
  notes: string;
  distance_m: number | null;
  duration_s: number | null;
};

const p = fmtPace;

let FALLBACK_PACE = DEFAULT_SETTINGS.lt1Pace + 25;

function run(date: string, name: string, zone: Proposal["zone"], st: Structure, notes: string): Proposal {
  const est = estimate(st, FALLBACK_PACE);
  return {
    date, sport: "Run", name, zone, structure: st, description: toIntervalsText(st), notes,
    distance_m: est.meters || null, duration_s: est.seconds || null,
  };
}

function easyRange(s: CoachSettings): [string, string] {
  // Z1: deutlich langsamer als LT1
  return [p(s.lt1Pace + 35), p(s.lt1Pace + 10)];
}

function easyMinutes(km: number, s: CoachSettings) {
  return Math.max(20, Math.round((km * (s.lt1Pace + 22)) / 60 / 5) * 5);
}

function strength(date: string, phase: PhaseKey, recovery: boolean): Proposal {
  const heavy = phase === "base" || phase === "build";
  const eccentric = phase === "specific";
  const body = recovery || phase === "taper" || phase === "race" || phase === "recover"
    ? "Erhaltung: 2 Sätze, ~70 % Last, keine Ausbelastung."
    : heavy
      ? "Schwer: Kniebeuge/Kreuzheben/Step-ups 3–4 × 3–5 Wdh. (≤ 5RM), Wadenheben schwer, 2–3 min Pause. Plus Rumpf."
      : eccentric
        ? "Bergab-spezifisch: exzentrische Kniebeugen (4 s ab), Bulgarian Split Squats, Drop Jumps 3×5, schwere Wadenarbeit."
        : "Erhaltung: 2 Sätze, moderat.";
  return {
    date, sport: "WeightTraining", name: "Kraft 6 Uhr", zone: "Kraft", structure: null,
    description: body, notes: "Schwer & wenige Wiederholungen verbessert die Laufökonomie (Eihara 2022).",
    distance_m: null, duration_s: 45 * 60,
  };
}

/** Erzeugt Vorschläge für die Woche, die am Montag `start` beginnt */
export function proposeWeek(baseWeek: PlanWeek, s: CoachSettings, factor = 1): Proposal[] {
  // Belastungsfaktor aus den Check-ins: Umfang skalieren, bei < 0,9 nur eine harte Einheit, bei ≤ 0,7 Entlastungswoche
  const week: PlanWeek = factor >= 1 || baseWeek.phase === "race"
    ? baseWeek
    : { ...baseWeek, km: Math.round(baseWeek.km * factor), longKm: Math.round(baseWeek.longKm * (1 + factor) / 2), recovery: baseWeek.recovery || factor <= 0.7 };
  const dropSecondHard = factor < 0.9;
  const hybrid = s.model !== "polarized";
  const d = (i: number) => ymd(addDays(parseYmd(week.start), i));
  const [eFrom, eTo] = easyRange(s);
  FALLBACK_PACE = s.lt1Pace + 25;
  const out: Proposal[] = [];
  const { phase, recovery } = week;
  const kmOf = (pr?: Proposal) => (pr?.distance_m ?? 0) / 1000;

  // Rennwochen separat
  if (phase === "race") {
    if (week.longKm > 40) {
      out.push(run(d(1), "Locker + 4 Steigerungen", "Z1", {
        sections: [newSection("main", { steps: [newStep({ minutes: 35, paceFrom: eFrom, paceTo: eTo })] }),
          newSection("main", { title: "Steigerungen", repeat: 4, steps: [newStep({ minutes: 0, seconds: 20, cue: "Steigern" }), newStep({ minutes: 1, cue: "Traben" })] })],
      }, "Beine wach halten."));
      out.push(run(d(3), "Locker 30 min", "Z1", { sections: [newSection("main", { steps: [newStep({ minutes: 30, paceFrom: eFrom, paceTo: eTo })] })] }, ""));
      out.push({ date: d(5), sport: "Run", name: "Rennsteiglauf Supermarathon", zone: "Z1", structure: null, description: null,
        notes: "Gleichmäßig nach Gefühl, früh essen: 60–90 g KH/h.", distance_m: 73_900, duration_s: null });
      return out;
    }
    out.push(run(d(1), "Bahn kurz: 5 × 400 m", "Z3", {
      sections: [groupWarmup(eFrom, eTo),
        newSection("main", { repeat: 5, steps: [newStep({ kind: "distance", km: 0.4, paceFrom: p(s.vo2Pace) }), newStep({ minutes: 1, seconds: 30, cue: "Traben" })] }),
        newSection("cooldown", { steps: [newStep({ minutes: 10 })] })],
    }, "Mit der Gruppe, aber nur 5 Wiederholungen."));
    out.push(run(d(3), "Locker + Steigerungen", "Z1", {
      sections: [newSection("main", { steps: [newStep({ minutes: 30, paceFrom: eFrom, paceTo: eTo })] }),
        newSection("main", { title: "Steigerungen", repeat: 4, steps: [newStep({ minutes: 0, seconds: 20, cue: "Steigern" }), newStep({ minutes: 1, cue: "Traben" })] })],
    }, ""));
    out.push(run(d(5), "Shakeout 20 min", "Z1", { sections: [newSection("main", { steps: [newStep({ minutes: 20, paceFrom: eFrom, paceTo: eTo })] })] }, ""));
    out.push({ date: d(6), sport: "Run", name: "Hermannslauf", zone: "Z2", structure: null, description: null,
      notes: "Ziel 2:20:00. Erste 10 km bewusst kontrolliert, bergab locker laufen lassen.", distance_m: 31_100, duration_s: 8400 });
    return out;
  }

  // Kraft Mo + Do
  if (phase !== "recover") {
    out.push(strength(d(0), phase, !!recovery));
    if (!recovery && phase !== "taper") out.push(strength(d(3), phase, false));
  }

  // Dienstag: Bahn mit Laufgruppe
  let tueKm = 0;
  if (phase === "reset" || phase === "recover") {
    // keine harte Einheit
  } else if (recovery) {
    out.push(run(d(1), "Bahn kurz: 6 × 400 m", "Z3", {
      sections: [groupWarmup(eFrom, eTo),
        newSection("main", { repeat: 6, steps: [newStep({ kind: "distance", km: 0.4, paceFrom: p(s.vo2Pace - 5), paceTo: p(s.vo2Pace + 5) }), newStep({ minutes: 1, seconds: 30, cue: "Traben" })] }),
        newSection("cooldown", { steps: [newStep({ minutes: 10 })] })],
    }, "Entlastungswoche: kurz und knackig, nicht ausbelasten."));
    tueKm = 7;
  } else if (phase === "base" && hybrid) {
    const subReps = week.km < 45 ? 6 : 8;
    out.push(run(d(1), `Bahn: ${subReps} × 800 m Sub-Schwelle`, "Z2", {
      sections: [groupWarmup(eFrom, eTo),
        newSection("main", { repeat: subReps, steps: [
          newStep({ kind: "distance", km: 0.8, paceFrom: p(s.lt2Pace + 18), paceTo: p(s.lt2Pace + 8), cue: "Kontrolliert" }),
          newStep({ kind: "distance", km: 0.4, cue: "Traben", paceFrom: p(s.lt1Pace + 20) }),
        ] }),
        newSection("cooldown", { steps: [newStep({ minutes: 10 })] })],
    }, `Norwegisch: Wolf-Tempo passt (knapp unter Schwelle ${p(s.lt2Pace)}). Puls-Deckel ~${s.lt2Hr - 8} bpm – wenn er drüber geht, langsamer. Es soll sich „angenehm hart“ anfühlen, nie wie ein Rennen.`));
    tueKm = 13;
  } else if (phase === "base" || phase === "build" || phase === "taper") {
    const reps = phase === "taper" ? 6 : 8;
    out.push(run(d(1), `Bahn: ${reps} × 800 m (Z3)`, "Z3", {
      sections: [groupWarmup(eFrom, eTo),
        newSection("main", { repeat: reps, steps: [
          newStep({ kind: "distance", km: 0.8, paceFrom: p(s.lt2Pace - 8), paceTo: p(s.lt2Pace - 16), cue: "Hart" }),
          newStep({ kind: "distance", km: 0.4, cue: "Traben", paceFrom: p(s.lt1Pace + 20) }),
        ] }),
        newSection("cooldown", { steps: [newStep({ minutes: 10 })] })],
    }, `Mit der Laufgruppe. Wiederholungen schneller als deine Schwelle (${p(s.lt2Pace)}), also eher Fuchs-Tempo – sonst landet die Einheit in Z2 statt Z3. Pausen wirklich locker.`));
    tueKm = 4 + reps * 1.2;
  } else if (phase === "specific") {
    out.push(run(d(1), "Bahn: 5 × 1600 m (Z3)", "Z3", {
      sections: [groupWarmup(eFrom, eTo),
        newSection("main", { repeat: 5, steps: [
          newStep({ kind: "distance", km: 1.6, paceFrom: p(s.lt2Pace - 5), paceTo: p(s.lt2Pace - 12), cue: "Hart" }),
          newStep({ minutes: 2, cue: "Traben" }),
        ] }),
        newSection("cooldown", { steps: [newStep({ minutes: 10 })] })],
    }, "Längere Wiederholungen knapp über der Schwelle – Hermannslauf-Härte."));
    tueKm = 13;
  } else if (phase === "ultra") {
    out.push(run(d(1), "Locker + 6 Steigerungen", "Z1", {
      sections: [newSection("main", { steps: [newStep({ minutes: 50, paceFrom: eFrom, paceTo: eTo })] }),
        newSection("main", { title: "Steigerungen", repeat: 6, steps: [newStep({ minutes: 0, seconds: 20, cue: "Steigern" }), newStep({ minutes: 1, cue: "Traben" })] })],
    }, "Vor dem Rennsteig keine harten Bahneinheiten mehr nötig."));
    tueKm = 10;
  }

  // Samstag: zweite harte Einheit nur im Aufbau/Spezifisch (polarisiert: 2 × Z3/Woche)
  let satKm = 0;
  if (week.race) {
    out.push(run(d((week.race.day ?? 6) - 1), "Shakeout 20 min + 3 Steigerungen", "Z1", {
      sections: [newSection("main", { steps: [newStep({ minutes: 20, paceFrom: eFrom, paceTo: eTo })] }),
        newSection("main", { title: "Steigerungen", repeat: 3, steps: [newStep({ minutes: 0, seconds: 20, cue: "Steigern" }), newStep({ minutes: 1, cue: "Traben" })] })],
    }, "Vor dem Wettkampf: nur Beine wach machen."));
    satKm = 4;
  } else if (!recovery && phase === "base" && hybrid && !dropSecondHard && !week.note?.startsWith("Wiedereinstieg")) {
    const subSets = week.km < 46 ? 2 : 3;
    out.push(run(d(5), `Sub-Schwelle: ${subSets} × 10 min`, "Z2", {
      sections: [newSection("warmup", { steps: [newStep({ minutes: 15, paceFrom: eFrom, paceTo: eTo })] }),
        newSection("main", { repeat: subSets, steps: [
          newStep({ minutes: 10, paceFrom: p(s.lt2Pace + 27), paceTo: p(s.lt2Pace + 17), cue: "Sub-Schwelle" }),
          newStep({ minutes: 1, cue: "Traben" }),
        ] }),
        newSection("cooldown", { steps: [newStep({ minutes: 10 })] })],
    }, `Gleichmäßig, Puls unter ~${s.lt2Hr - 8} bpm. Sprechen in kurzen Sätzen muss gehen.`));
    satKm = 12;
  } else if (!recovery && phase === "build" && !dropSecondHard) {
    out.push(run(d(5), "Bergsprints: 8 × 90 s", "Z3", {
      sections: [newSection("warmup", { steps: [newStep({ minutes: 15, paceFrom: eFrom, paceTo: eTo })] }),
        newSection("main", { title: "Bergauf", repeat: 8, steps: [newStep({ minutes: 1, seconds: 30, cue: "Bergauf hart" }), newStep({ minutes: 2, seconds: 30, cue: "Runter traben" })] }),
        newSection("cooldown", { steps: [newStep({ minutes: 10 })] })],
    }, "Steiler Hang (6–10 %). Nach Gefühl hart (RPE 8/10), Pace ignorieren."));
    satKm = 11;
  } else if (!recovery && phase === "specific" && !dropSecondHard) {
    out.push(run(d(5), "Hügel-Tempo + Bergab-Technik", "Z2", {
      sections: [newSection("warmup", { steps: [newStep({ minutes: 15, paceFrom: eFrom, paceTo: eTo })] }),
        newSection("main", { title: "Renntempo wellig", repeat: 3, steps: [newStep({ minutes: 8, cue: "Renngefühl Hermannslauf" }), newStep({ minutes: 3, cue: "Locker" })] }),
        newSection("main", { title: "Bergab", repeat: 4, steps: [newStep({ minutes: 1, cue: "Bergab zügig, kurze Schritte" }), newStep({ minutes: 2, cue: "Hoch gehen/traben" })] }),
        newSection("cooldown", { steps: [newStep({ minutes: 10 })] })],
    }, "Welliges Gelände, idealerweise Teutoburger Wald. Renntempo nach Gefühl (Ziel-Ø 4:30/km auf Trail)."));
    satKm = 13;
  } else if (phase === "ultra" && !recovery) {
    out.push(run(d(5), "Back-to-back Teil 1", "Z1", {
      sections: [newSection("main", { steps: [newStep({ minutes: Math.round(week.longKm * 0.6 * (s.lt1Pace + 40) / 60), paceFrom: p(s.lt1Pace + 50), paceTo: p(s.lt1Pace + 25) })] })],
    }, "Ruhig, Verpflegung wie im Rennen testen."));
    satKm = Math.round(week.longKm * 0.6);
  }

  // Sonntag: Cup-Wettkampf statt langem Lauf
  if (week.race) {
    const rd = week.race.day ?? 6;
    out.push({ date: d(rd), sport: "Run", name: week.race.name, zone: "Z2", structure: null, description: null,
      notes: week.race.notes, distance_m: Math.round(week.race.km * 1000), duration_s: null });
    if (rd < 6) {
      out.push(run(d(6), "Lockeres Auslaufen 40 min", "Z1", { sections: [newSection("main", { steps: [newStep({ minutes: 40, paceFrom: p(s.lt1Pace + 50), paceTo: p(s.lt1Pace + 30) })] })] },
        "Tag nach dem Wettkampf: ganz locker, Beine ausschütteln."));
    }
  }
  // Sonntag: langer Lauf
  const longMin = Math.round((week.longKm * (s.lt1Pace + 35)) / 60 / 5) * 5;
  const longSt: Structure = phase === "specific" && !recovery && week.longKm >= 26
    ? { sections: [
        newSection("main", { steps: [newStep({ minutes: Math.max(30, longMin - 50), paceFrom: p(s.lt1Pace + 50), paceTo: p(s.lt1Pace + 20) })] }),
        newSection("main", { title: "Renntempo-Block", repeat: 2, steps: [newStep({ minutes: 15, cue: "Renntempo", paceFrom: "4:40", paceTo: "4:25" }), newStep({ minutes: 5, cue: "Locker" })] }),
        newSection("cooldown", { steps: [newStep({ minutes: 10 })] }),
      ] }
    : { sections: [newSection("main", { steps: [newStep({ minutes: longMin, paceFrom: p(s.lt1Pace + 50), paceTo: p(s.lt1Pace + 20) })] })] };
  if (!week.race) out.push(run(d(6), phase === "specific" ? `Trail-Longrun ${week.longKm} km` : `Langer Lauf ${week.longKm} km`, phase === "specific" && week.longKm >= 26 ? "Z2" : "Z1", longSt,
    phase === "specific" ? "Trail mit Höhenmetern, bergab locker laufen lassen. Gels wie im Rennen testen." : "Konsequent Z1 – Gespräch muss möglich sein."));

  // Lockere Läufe füllen den Wochenumfang: Mittwoch immer, Samstag nur ohne Samstagseinheit
  void tueKm; void satKm; void kmOf;
  const fixedKm = out.filter((x) => x.sport === "Run").reduce((sum, x) => sum + (x.distance_m ?? 0), 0) / 1000;
  let rest = week.km - fixedKm;
  const satTaken = out.some((x) => x.date === d(5));
  const plan: [number, number][] = [];
  const wedKm = Math.min(12, Math.max(5, rest));
  plan.push([2, wedKm]);
  rest -= wedKm;
  if (!satTaken && rest >= 4) {
    const satEasy = Math.min(14, rest);
    plan.push([5, satEasy]);
    rest -= satEasy;
  }
  if (phase === "reset" && rest >= 4) plan.push([4, Math.min(8, rest)]);

  for (const [i, kmDay] of plan) {
    const strides = i === 2 && (phase === "base" || phase === "build") && !recovery;
    const st: Structure = {
      sections: [newSection("main", { steps: [newStep({ minutes: easyMinutes(kmDay, s), paceFrom: eFrom, paceTo: eTo })] })],
    };
    if (strides) {
      st.sections.push(newSection("main", { title: "Steigerungen", repeat: 6, steps: [newStep({ minutes: 0, seconds: 20, cue: "Steigern" }), newStep({ minutes: 1, cue: "Traben" })] }));
    }
    out.push(run(d(i), strides ? "Locker + Steigerungen" : "Lockerer Lauf", "Z1", st, "Z1: unter deiner LT1-Herzfrequenz bleiben."));
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------- Ist-Intensitätsverteilung

type ActivityRaw = { type: string | null; moving_time_s: number | null; avg_hr: number | null; raw?: Record<string, unknown> | null };

/** Zeit in Z1/Z2/Z3 (Sekunden) aus Intervals-Zonenzeiten; Fallback: Durchschnittspuls der Einheit */
export function tidSeconds(acts: ActivityRaw[], s: CoachSettings): [number, number, number] {
  const out: [number, number, number] = [0, 0, 0];
  const zoneOf = (hr: number) => (hr < s.lt1Hr ? 0 : hr < s.lt2Hr ? 1 : 2);
  for (const a of acts) {
    if (!a.type || !/run|ride|walk|hike/i.test(a.type)) continue;
    const times = a.raw?.icu_hr_zone_times as number[] | undefined;
    const bounds = a.raw?.icu_hr_zones as number[] | undefined;
    if (Array.isArray(times) && Array.isArray(bounds) && times.length > 0 && bounds.length >= times.length - 1) {
      times.forEach((t, i) => {
        const lower = i === 0 ? 0 : bounds[i - 1];
        const upper = bounds[i] ?? lower + 10;
        out[zoneOf((lower + upper) / 2)] += t || 0;
      });
    } else if (a.avg_hr && a.moving_time_s) {
      out[zoneOf(a.avg_hr)] += a.moving_time_s;
    }
  }
  return out;
}
