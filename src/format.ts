export const isRun = (type: string | null) => !!type && /run/i.test(type);

export function km(m: number | null | undefined, digits = 1) {
  if (m == null) return "–";
  return (m / 1000).toLocaleString("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function duration(s: number | null | undefined) {
  if (s == null) return "–";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")} h` : `${m}:${String(sec).padStart(2, "0")} min`;
}

/** Pace in min/km aus Distanz und Zeit */
export function pace(distanceM: number | null, timeS: number | null) {
  if (!distanceM || !timeS) return "–";
  const secPerKm = timeS / (distanceM / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return s === 60 ? `${m + 1}:00 /km` : `${m}:${String(s).padStart(2, "0")} /km`;
}

export function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}

/** Montag 00:00 der Woche (lokale Zeit) */
export function weekStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const diff = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - diff);
  return x;
}

export const TYPE_LABEL: Record<string, string> = {
  Run: "Lauf",
  TrailRun: "Trail",
  VirtualRun: "Laufband",
  Ride: "Rad",
  VirtualRide: "Rolle",
  Walk: "Gehen",
  Hike: "Wandern",
  WeightTraining: "Kraft",
  Workout: "Workout",
  Swim: "Schwimmen",
};
