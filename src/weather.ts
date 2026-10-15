// Wetter über Open-Meteo (kostenlos, ohne API-Key, direkt aus dem Browser)
export type Place = { lat: number; lon: number; name: string };

const KEY = "th.place";
const DEFAULT: Place = { lat: 52.02, lon: 8.53, name: "Bielefeld" };

export function getPlace(): Place {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Place;
  } catch {
    /* ignore */
  }
  return DEFAULT;
}

export function setPlace(p: Place) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export type Hour = {
  time: string; // ISO lokal
  temp: number;
  feels: number;
  rain: number; // Regenwahrscheinlichkeit %
  wind: number; // km/h
  code: number;
};

export async function fetchHours(place: Place): Promise<Hour[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
    `&hourly=temperature_2m,apparent_temperature,precipitation_probability,wind_speed_10m,weather_code` +
    `&timezone=Europe%2FBerlin&forecast_days=2`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Wetter nicht verfügbar (${res.status})`);
  const d = await res.json();
  const h = d.hourly;
  return h.time.map((t: string, i: number) => ({
    time: t,
    temp: h.temperature_2m[i],
    feels: h.apparent_temperature[i],
    rain: h.precipitation_probability[i] ?? 0,
    wind: h.wind_speed_10m[i],
    code: h.weather_code[i],
  }));
}

export function weatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 85 && code <= 86) return "🌨️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}

/** Kurze Lauf-Hinweise aus den Wetterdaten */
export function runTips(hours: Hour[]): string[] {
  if (hours.length === 0) return [];
  const maxTemp = Math.max(...hours.map((h) => h.feels));
  const minTemp = Math.min(...hours.map((h) => h.feels));
  const maxRain = Math.max(...hours.map((h) => h.rain));
  const maxWind = Math.max(...hours.map((h) => h.wind));
  const tips: string[] = [];
  if (maxTemp >= 25) tips.push("Warm: mehr trinken, Elektrolyte einplanen, früh oder spät laufen");
  else if (maxTemp >= 20) tips.push("Mild bis warm: Trinken bei längeren Einheiten mitnehmen");
  if (minTemp <= 2) tips.push("Kalt: Handschuhe & Mütze, länger einlaufen");
  if (maxRain >= 60) tips.push("Hohe Regenwahrscheinlichkeit: Regenjacke");
  if (maxWind >= 30) tips.push("Windig: Tempo nach Gefühl/Herzfrequenz statt Pace");
  return tips;
}
