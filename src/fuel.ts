// Verpflegungsschrank: Typen, Open-Food-Facts-Lookup, Richtwerte

export type FuelProduct = {
  id: string;
  barcode: string | null;
  name: string;
  brand: string | null;
  kind: string;
  serving_label: string | null;
  serving_g: number | null;
  carbs_g: number | null;
  sodium_mg: number | null;
  caffeine_mg: number | null;
  kcal: number | null;
  carb_ratio: string | null;
  stock: number;
  tolerance: string | null;
  notes: string | null;
  image_url: string | null;
};

export type FuelLog = {
  id: string;
  product_id: string;
  date: string;
  context: string;
  amount: number;
  tolerance: string;
  note: string | null;
};

export const KINDS: { value: string; label: string }[] = [
  { value: "gel", label: "Gel" },
  { value: "drink", label: "Getränk / Pulver" },
  { value: "electrolyte", label: "Elektrolyte / Salz" },
  { value: "chew", label: "Chews / Gummis" },
  { value: "bar", label: "Riegel" },
  { value: "food", label: "Echtes Essen" },
  { value: "other", label: "Sonstiges" },
];
export const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.value, k.label]));

export const TOLERANCE: Record<string, { label: string; tone: string }> = {
  gut: { label: "gut vertragen", tone: "ok" },
  mittel: { label: "mittel", tone: "warn" },
  schlecht: { label: "schlecht", tone: "bad" },
};

export type ProductDraft = Omit<FuelProduct, "id" | "stock" | "tolerance" | "notes"> & { stock?: number };

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
const round1 = (v: number | null) => (v == null ? null : Math.round(v * 10) / 10);

/** Produkt über Open Food Facts nachschlagen (kostenlos, ohne Schlüssel) */
export async function lookupBarcode(barcode: string): Promise<ProductDraft | null> {
  const fields = "product_name,product_name_de,brands,serving_size,serving_quantity,nutriments,image_front_small_url,categories_tags";
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${fields}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Food Facts nicht erreichbar (${res.status})`);
  const data = await res.json();
  if (data.status !== 1 || !data.product) return null;
  const p = data.product;
  const n = p.nutriments ?? {};
  const servingG = num(p.serving_quantity);
  const perServing = (key: string, factor = 1) => {
    const s = num(n[`${key}_serving`]);
    if (s != null) return s * factor;
    const h = num(n[`${key}_100g`]);
    return h != null && servingG ? (h * servingG * factor) / 100 : null;
  };
  const cats: string[] = p.categories_tags ?? [];
  const has = (s: string) => cats.some((c) => c.includes(s));
  const kind = has("gel") ? "gel" : has("bar") ? "bar" : has("beverage") || has("drink") ? "drink" : has("gumm") || has("chew") ? "chew" : "gel";

  return {
    barcode,
    name: p.product_name_de || p.product_name || "Unbekanntes Produkt",
    brand: p.brands ? String(p.brands).split(",")[0].trim() : null,
    kind,
    serving_label: p.serving_size ?? null,
    serving_g: servingG,
    carbs_g: round1(perServing("carbohydrates")),
    sodium_mg: round1(perServing("sodium", 1000)), // OFF speichert Natrium in g
    caffeine_mg: null, // Koffein ist bei OFF uneinheitlich erfasst – bitte manuell
    kcal: round1(perServing("energy-kcal")),
    carb_ratio: null,
    image_url: p.image_front_small_url ?? null,
  };
}

/** Kohlenhydrat-Richtwert pro Stunde nach Belastungsdauer (Jeukendrup 2014; ACSM/IOC-Konsens) */
export function carbGuidance(minutes: number): { range: [number, number]; text: string } {
  if (minutes < 60) return { range: [0, 30], text: "Unter 1 h: nicht nötig, ggf. Mundspülung oder kleine Mengen." };
  if (minutes < 120) return { range: [30, 60], text: "1–2 h: 30–60 g/h, eine Kohlenhydratquelle reicht." };
  if (minutes < 150) return { range: [60, 90], text: "2–2,5 h: bis 60–90 g/h, Glukose + Fruktose (z. B. 1:0,8) verbessern die Aufnahme." };
  return { range: [60, 90], text: "Über 2,5 h: 60–90 g/h (trainierter Darm auch mehr). Darmtraining in langen Läufen ist Pflicht." };
}
