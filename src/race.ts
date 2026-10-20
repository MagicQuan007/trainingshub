// Race-Planer: GPX-Profil, steigungsangepasstes Pacing, Renntag-Wetter, Verpflegungsplan
import type { FuelProduct } from "./fuel";

export type RaceSettings = {
  targetTimeS?: number;
  carbRate?: number;        // g KH pro Stunde
  fluidMlH?: number;        // ml pro Stunde
  drinkId?: string | null;  // Getränk im Trinkrucksack/Flask
  gelIds?: string[];        // Gels/Chews, die mitkommen
  boosterId?: string | null;// Koffein-Booster vor dem Start
  aidStations?: boolean;    // Verpflegungsstellen nutzen (Wasser nachfüllen)
};

/** Höhe alle `step` Meter. `points` ist die aktive Quelle; `gps`/`dem` halten beide Varianten zum Umschalten. */
export type Profile = {
  step: number;
  points: number[];
  source?: "gps" | "dem";
  gps?: number[];
  dem?: number[];
  coords?: [number, number][]; // Lat/Lon je Abtastpunkt (für die Geländeabfrage)
};

export type Race = {
  id: string;
  key: string | null;
  name: string;
  date: string;
  start_time: string | null;
  distance_km: number;
  gain_m: number | null;
  loss_m: number | null;
  lat: number | null;
  lon: number | null;
  profile: Profile | null;
  settings: RaceSettings;
  notes: string | null;
};

export const SEED_RACES = [
  {
    key: "hermann", name: "Hermannslauf", date: "2027-04-25", start_time: "11:00", distance_km: 31.1, gain_m: 510, loss_m: 710,
    lat: 51.9114, lon: 8.8394, settings: { targetTimeS: 2 * 3600 + 20 * 60, aidStations: true },
    notes: "Hermannsdenkmal → Sparrenburg Bielefeld. Startzeit bitte mit der Ausschreibung abgleichen.",
  },
  {
    key: "rennsteig", name: "Rennsteiglauf Supermarathon", date: "2027-05-22", start_time: "06:00", distance_km: 73.9, gain_m: 1470, loss_m: 969,
    lat: 50.9745, lon: 10.3197, settings: { targetTimeS: 8 * 3600, aidStations: true },
    notes: "Eisenach Markt (6:00) → Schmiedefeld. ~15 Verpflegungsstellen, Zielschluss 18:00. Ziel: gut ankommen.",
  },
];

// ---------------------------------------------------------------- GPX

const R = 6371000;
const rad = (x: number) => (x * Math.PI) / 180;
function hav(a: [number, number], b: [number, number]) {
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Liest eine GPX-Datei, glättet die Höhe und tastet sie alle `step` Meter neu ab */
export function parseGpx(xml: string, step = 100) {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const pts = Array.from(doc.querySelectorAll("trkpt, rtept"));
  if (pts.length < 2) throw new Error("Keine Trackpunkte in der GPX-Datei gefunden");
  const raw = pts.map((p) => ({
    lat: Number(p.getAttribute("lat")),
    lon: Number(p.getAttribute("lon")),
    ele: Number(p.querySelector("ele")?.textContent ?? NaN),
  })).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  if (raw.some((p) => !Number.isFinite(p.ele))) throw new Error("Die GPX-Datei enthält keine Höhendaten");

  const dist: number[] = [0];
  for (let i = 1; i < raw.length; i++) dist.push(dist[i - 1] + hav([raw[i - 1].lat, raw[i - 1].lon], [raw[i].lat, raw[i].lon]));
  const total = dist[dist.length - 1];

  // Neu abtasten (lineare Interpolation)
  const n = Math.floor(total / step);
  const ele: number[] = [];
  const coords: [number, number][] = [];
  const r5 = (x: number) => Math.round(x * 1e5) / 1e5;
  let j = 0;
  for (let k = 0; k <= n; k++) {
    const d = k * step;
    while (j < dist.length - 2 && dist[j + 1] < d) j++;
    const t = dist[j + 1] === dist[j] ? 0 : (d - dist[j]) / (dist[j + 1] - dist[j]);
    ele.push(raw[j].ele + t * (raw[j + 1].ele - raw[j].ele));
    coords.push([r5(raw[j].lat + t * (raw[j + 1].lat - raw[j].lat)), r5(raw[j].lon + t * (raw[j + 1].lon - raw[j].lon))]);
  }
  // Glätten (gleitender Mittelwert über ±200 m) gegen GPS-Rauschen
  const smooth = smoothElev(ele, step, 200);
  const { gain, loss } = gainLoss(smooth);
  return {
    profile: { step, points: smooth, source: "gps", gps: smooth, coords } as Profile,
    distanceKm: Math.round((total / 1000) * 10) / 10,
    gain,
    loss,
    start: { lat: raw[0].lat, lon: raw[0].lon },
  };
}

function smoothElev(ele: number[], step: number, radiusM: number) {
  const w = Math.max(1, Math.round(radiusM / step));
  return ele.map((_, i) => {
    let s = 0, c = 0;
    for (let k = Math.max(0, i - w); k <= Math.min(ele.length - 1, i + w); k++) { s += ele[k]; c++; }
    return Math.round((s / c) * 10) / 10;
  });
}

export function gainLoss(points: number[]) {
  let gain = 0, loss = 0;
  for (let i = 1; i < points.length; i++) {
    const d = points[i] - points[i - 1];
    if (d > 0) gain += d; else loss -= d;
  }
  return { gain: Math.round(gain), loss: Math.round(loss) };
}

/**
 * Echte Geländehöhe je Streckenpunkt aus dem Copernicus-Höhenmodell (GLO-90) über Open-Meteo.
 * Ersetzt verrauschte GPS-/Barometer-Höhen. Max. 100 Punkte pro Anfrage → in Blöcken.
 */
export async function fetchTerrain(coords: [number, number][], step: number): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < coords.length; i += 100) {
    const chunk = coords.slice(i, i + 100);
    const url = "https://api.open-meteo.com/v1/elevation?latitude=" + chunk.map((c) => c[0]).join(",") + "&longitude=" + chunk.map((c) => c[1]).join(",");
    let res = await fetch(url);
    if (res.status === 429) { await new Promise((r) => setTimeout(r, 1500)); res = await fetch(url); }
    if (!res.ok) throw new Error(`Geländehöhen nicht verfügbar (HTTP ${res.status})`);
    const j = (await res.json()) as { elevation?: number[] };
    if (!j.elevation || j.elevation.length !== chunk.length) throw new Error("Geländehöhen unvollständig");
    out.push(...j.elevation);
  }
  // Leicht glätten (±100 m): das Höhenmodell ist sauber, nur Rasterstufen ausgleichen
  return smoothElev(out, step, 100);
}

// ---------------------------------------------------------------- Pacing

/** Energiekosten des Laufens bei Steigung i (Minetti et al. 2002), relativ zur Ebene, für Rennpraxis begrenzt */
export function gradeFactor(i: number) {
  const g = Math.max(-0.35, Math.min(0.35, i));
  const c = 155.4 * g ** 5 - 30.4 * g ** 4 - 43.3 * g ** 3 + 46.3 * g ** 2 + 19.5 * g + 3.6;
  // Bergab kann man nicht beliebig schneller laufen (Technik, Exzentrik) → Faktor ≥ 0,82
  return Math.max(0.82, c / 3.6);
}

export type Split = { km: number; fromKm: number; toKm: number; grade: number; gainM: number; lossM: number; paceS: number; timeS: number; cumS: number; elevEnd: number };

/** Verteilt die Zielzeit so auf die Strecke, dass der Aufwand gleich bleibt (steigungsangepasst) */
export function computeSplits(race: Race, targetS: number, segKm = 1): Split[] {
  const total = race.distance_km * 1000;
  const prof = race.profile;
  const segs: { from: number; to: number; gain: number; loss: number; grade: number; elevEnd: number }[] = [];
  for (let from = 0; from < total - 1; from += segKm * 1000) {
    const to = Math.min(total, from + segKm * 1000);
    let gain = 0, loss = 0, eStart = 0, eEnd = 0;
    if (prof) {
      const a = Math.min(prof.points.length - 1, Math.round(from / prof.step));
      const b = Math.min(prof.points.length - 1, Math.round(to / prof.step));
      eStart = prof.points[a];
      eEnd = prof.points[b];
      for (let k = a + 1; k <= b; k++) {
        const d = prof.points[k] - prof.points[k - 1];
        if (d > 0) gain += d; else loss -= d;
      }
    } else {
      // Ohne GPX: Höhenmeter gleichmäßig verteilen
      const share = (to - from) / total;
      gain = (race.gain_m ?? 0) * share;
      loss = (race.loss_m ?? 0) * share;
      eEnd = 0;
    }
    segs.push({ from, to, gain, loss, grade: prof ? (eEnd - eStart) / (to - from) : 0, elevEnd: eEnd });
  }
  // Aufwand pro Segment: Summe über die 100-m-Schritte des Profils (Minetti-Faktor je Steigung)
  const effort = segs.map((s) => {
    const len = s.to - s.from;
    if (!prof) return len; // ohne Profil: gleichmäßiges Tempo
    const a = Math.min(prof.points.length - 1, Math.round(s.from / prof.step));
    const b = Math.min(prof.points.length - 1, Math.round(s.to / prof.step));
    if (b <= a) return len;
    let e = 0;
    for (let k = a + 1; k <= b; k++) e += prof.step * gradeFactor((prof.points[k] - prof.points[k - 1]) / prof.step);
    return e * (len / ((b - a) * prof.step));
  });
  const sum = effort.reduce((a, b) => a + b, 0);
  let cum = 0;
  return segs.map((s, i) => {
    const t = (effort[i] / sum) * targetS;
    cum += t;
    const len = (s.to - s.from) / 1000;
    return {
      km: i + 1, fromKm: s.from / 1000, toKm: s.to / 1000, grade: s.grade, gainM: Math.round(s.gain), lossM: Math.round(s.loss),
      paceS: t / len, timeS: t, cumS: cum, elevEnd: s.elevEnd,
    };
  });
}

/** Zeit (s) bei Kilometer km – und umgekehrt – aus den Splits */
export function timeAtKm(splits: Split[], km: number) {
  for (const s of splits) if (km <= s.toKm) return s.cumS - s.timeS + ((km - s.fromKm) / (s.toKm - s.fromKm)) * s.timeS;
  return splits[splits.length - 1]?.cumS ?? 0;
}
export function kmAtTime(splits: Split[], t: number) {
  for (const s of splits) if (t <= s.cumS) return s.fromKm + ((t - (s.cumS - s.timeS)) / s.timeS) * (s.toKm - s.fromKm);
  return splits[splits.length - 1]?.toKm ?? 0;
}

// ---------------------------------------------------------------- Wetter

export type RaceWeather = { kind: "forecast" | "history"; years?: number; tempStart: number; tempMax: number; humidity: number; rainChance?: number; precipMm?: number; wind: number };

export async function fetchRaceWeather(race: Race, durationS: number): Promise<RaceWeather | null> {
  if (race.lat == null || race.lon == null) return null;
  const startH = Number((race.start_time ?? "10:00").slice(0, 2));
  const endH = Math.min(23, startH + Math.ceil(durationS / 3600));
  const days = (new Date(race.date).getTime() - Date.now()) / 86_400_000;
  const hourly = "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m";
  const pick = (h: Record<string, number[]>, offset = 0) => {
    const idx = Array.from({ length: endH - startH + 1 }, (_, i) => offset + startH + i);
    const t = idx.map((i) => h.temperature_2m[i]).filter((x) => x != null);
    return {
      tStart: h.temperature_2m[offset + startH], tMax: Math.max(...t),
      hum: avg(idx.map((i) => h.relative_humidity_2m[i])), wind: Math.max(...idx.map((i) => h.wind_speed_10m[i] ?? 0)),
      precip: idx.reduce((s, i) => s + (h.precipitation[i] ?? 0), 0),
    };
  };

  if (days <= 15 && days >= -1) {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${race.lat}&longitude=${race.lon}&hourly=${hourly},precipitation_probability&timezone=Europe%2FBerlin&start_date=${race.date}&end_date=${race.date}`);
    if (!r.ok) return null;
    const d = await r.json();
    const p = pick(d.hourly);
    const rain = Math.max(...d.hourly.precipitation_probability.slice(startH, endH + 1));
    return { kind: "forecast", tempStart: p.tStart, tempMax: p.tMax, humidity: p.hum, rainChance: rain, wind: p.wind, precipMm: p.precip };
  }
  // Noch weit weg: Mittel der letzten 5 Jahre am selben Datum
  const [y, m, dd] = race.date.split("-").map(Number);
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => Math.min(thisYear - 1, y - 1) - i);
  const results = await Promise.all(years.map(async (yr) => {
    const date = `${yr}-${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    const r = await fetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${race.lat}&longitude=${race.lon}&start_date=${date}&end_date=${date}&hourly=${hourly}&timezone=Europe%2FBerlin`);
    if (!r.ok) return null;
    const d = await r.json();
    return d.hourly ? pick(d.hourly) : null;
  }));
  const ok = results.filter((x): x is NonNullable<typeof x> => !!x && Number.isFinite(x.tStart));
  if (!ok.length) return null;
  return {
    kind: "history", years: ok.length,
    tempStart: avg(ok.map((x) => x.tStart)), tempMax: avg(ok.map((x) => x.tMax)),
    humidity: avg(ok.map((x) => x.hum)), wind: avg(ok.map((x) => x.wind)), precipMm: avg(ok.map((x) => x.precip)),
  };
}

function avg(xs: number[]) {
  const v = xs.filter((x) => x != null && Number.isFinite(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
}

/** Trink- und Natriumbedarf nach Temperatur (Richtwerte; individuell per Schweißtest prüfen) */
export function hydration(tempMax: number | null) {
  const t = tempMax ?? 15;
  const fluid = t < 10 ? 400 : t < 15 ? 500 : t < 20 ? 600 : t < 25 ? 700 : 800;
  const sodium = t < 15 ? 400 : t < 22 ? 500 : 700;
  return { fluid, sodium };
}

// ---------------------------------------------------------------- Verpflegungsplan

export type FuelStep = { tS: number; km: number; label: string; carbs: number; caffeine: number; sodium: number; kind: "pre" | "gel" | "drink" | "info" };

export type FuelPlan = {
  steps: FuelStep[];
  totals: { carbs: number; caffeine: number; sodium: number; fluidMl: number };
  pack: { name: string; count: number }[];
  carbsPerHour: number;
  warnings: string[];
};

const drinkMl = (p: FuelProduct) => {
  const m = /(\d{3})\s*ml/i.exec(p.serving_label ?? "");
  if (m) return Number(m[1]);
  return p.kind === "electrolyte" ? 250 : 500;
};

export function planFuel(
  durationS: number,
  splits: Split[],
  products: FuelProduct[],
  s: Required<Pick<RaceSettings, "carbRate" | "fluidMlH">> & RaceSettings,
  weightKg: number,
): FuelPlan {
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  const steps: FuelStep[] = [];
  const warnings: string[] = [];
  const hours = durationS / 3600;
  const caffeineMax = Math.round(weightKg * 4.5); // 3–6 mg/kg untersucht; >4,5 bringt kaum Zusatznutzen, mehr Magenprobleme
  let caffeine = 0;

  // Vor dem Start
  steps.push({ tS: -150 * 60, km: 0, label: "Frühstück: 1–3 g KH/kg (z. B. Weißbrot/Honig, Banane), wenig Ballaststoffe/Fett", carbs: 0, caffeine: 0, sodium: 0, kind: "info" });
  const booster = s.boosterId ? byId[s.boosterId] : null;
  if (booster) {
    caffeine += booster.caffeine_mg ?? 0;
    steps.push({ tS: -25 * 60, km: 0, label: `${booster.name}`, carbs: booster.carbs_g ?? 0, caffeine: booster.caffeine_mg ?? 0, sodium: booster.sodium_mg ?? 0, kind: "pre" });
  }

  // Getränk: kontinuierlich, alle 15 min ein paar Schlucke
  const drink = s.drinkId ? byId[s.drinkId] : null;
  const perMlCarbs = drink ? (drink.carbs_g ?? 0) / drinkMl(drink) : 0;
  const perMlNa = drink ? (drink.sodium_mg ?? 0) / drinkMl(drink) : 0;
  const drinkCarbsH = perMlCarbs * s.fluidMlH;
  const drinkNaH = perMlNa * s.fluidMlH;

  // Gels: Rest der Kohlenhydrate, ab Minute 20 in gleichmäßigen Abständen
  const gels = (s.gelIds ?? []).map((id) => byId[id]).filter((g): g is FuelProduct => !!g && (g.carbs_g ?? 0) > 0);
  const gelCarbsNeeded = Math.max(0, s.carbRate * Math.max(0, hours - 0.25) - drinkCarbsH * hours);
  const avgGel = gels.length ? gels.reduce((a, g) => a + (g.carbs_g ?? 0), 0) / gels.length : 0;
  const nGels = avgGel ? Math.ceil(gelCarbsNeeded / avgGel - 0.2) : 0;
  const pack: Record<string, number> = {};
  if (nGels > 0) {
    const first = 20 * 60;
    const last = durationS - 15 * 60;
    const interval = nGels > 1 ? (last - first) / (nGels - 1) : 0;
    // Koffeinhaltige Gels bevorzugt in der zweiten Hälfte
    const caf = gels.filter((g) => (g.caffeine_mg ?? 0) > 0);
    const plain = gels.filter((g) => !(g.caffeine_mg ?? 0));
    for (let i = 0; i < nGels; i++) {
      const t = first + i * interval;
      const late = t > durationS * 0.5;
      let g = (late && caf.length ? caf : plain.length ? plain : gels)[i % (late && caf.length ? caf.length : plain.length || gels.length)];
      if ((g.caffeine_mg ?? 0) > 0 && caffeine + (g.caffeine_mg ?? 0) > caffeineMax) {
        if (plain[0]) g = plain[0];
        else if (!warnings.some((w) => w.startsWith("Nur koffeinhaltige"))) warnings.push("Nur koffeinhaltige Gels gewählt – für weniger Koffein ein Gel ohne Koffein mitnehmen oder den Booster weglassen.");
      }
      caffeine += g.caffeine_mg ?? 0;
      pack[g.name] = (pack[g.name] ?? 0) + 1;
      steps.push({ tS: t, km: kmAtTime(splits, t), label: g.name, carbs: g.carbs_g ?? 0, caffeine: g.caffeine_mg ?? 0, sodium: g.sodium_mg ?? 0, kind: "gel" });
    }
  }

  const fluidTotal = Math.round(s.fluidMlH * hours);
  if (drink) {
    const portions = Math.ceil(fluidTotal / drinkMl(drink));
    pack[`${drink.name} (Portionen à ${drinkMl(drink)} ml)`] = portions;
    steps.push({ tS: 10 * 60, km: kmAtTime(splits, 600), label: `${drink.name}: alle 15 min ein paar Schlucke (~${Math.round(s.fluidMlH / 4)} ml)`, carbs: 0, caffeine: 0, sodium: 0, kind: "drink" });
  }
  steps.sort((a, b) => a.tS - b.tS);

  const gelCarbs = steps.filter((x) => x.kind !== "drink").reduce((a, x) => a + x.carbs, 0);
  const gelNa = steps.filter((x) => x.kind !== "drink").reduce((a, x) => a + x.sodium, 0);
  const totals = {
    carbs: Math.round(gelCarbs + drinkCarbsH * hours),
    caffeine: Math.round(caffeine),
    sodium: Math.round(gelNa + drinkNaH * hours),
    fluidMl: fluidTotal,
  };
  const cph = hours > 0 ? totals.carbs / hours : 0;

  if (!gels.length && !drink) warnings.push("Wähle mindestens ein Gel oder Getränk aus deinem Schrank.");
  if (gels.length && !gels.some((g) => g.tolerance === "gut")) warnings.push("Keines der gewählten Gels ist als „gut vertragen“ markiert – im Training testen!");
  if (cph > 75) warnings.push(`${Math.round(cph)} g/h ist viel – nur mit trainiertem Darm. In langen Läufen vorher üben.`);
  if (caffeine > weightKg * 3) warnings.push(`Koffein gesamt ${Math.round(caffeine)} mg (${(caffeine / weightKg).toFixed(1)} mg/kg) – wirksam ab ~3 mg/kg, mehr bringt kaum zusätzlich, erhöht aber Magen-/Schlafprobleme.`);
  const naH = hours > 0 ? totals.sodium / hours : 0;
  if (naH < 250 && hours > 2) warnings.push(`Nur ~${Math.round(naH)} mg Natrium/h – bei Wärme Salztabletten oder Elektrolytgetränk ergänzen.`);

  return { steps, totals, pack: Object.entries(pack).map(([name, count]) => ({ name, count })), carbsPerHour: Math.round(cph), warnings };
}

export const fmtHMS = (s: number) => {
  const neg = s < 0;
  s = Math.abs(Math.round(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${neg ? "−" : ""}${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};
export const fmtPaceS = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
export const clockAt = (start: string | null, offsetS: number) => {
  const [h, m] = (start ?? "10:00").split(":").map(Number);
  const t = h * 3600 + m * 60 + offsetS;
  const hh = Math.floor((((t / 3600) % 24) + 24) % 24), mm = Math.floor((((t % 3600) + 3600) % 3600) / 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};
