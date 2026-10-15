// Rezeptbibliothek: schnell (≤ 30 min), überwiegend vegetarisch, abends kinderfreundlich.
// Nährwerte pro Erwachsenen-Portion – Richtwerte, gerundet.

export type Cat = "Obst & Gemüse" | "Kühlregal" | "Brot & Getreide" | "Vorrat" | "Fleisch & Fisch" | "Tiefkühl";
export type Ing = { n: string; q: number; u: string; c: Cat };
export type Slot = "breakfast" | "lunch" | "dinner" | "snack";
export type Protein = "veg" | "fish" | "meat";

export type Recipe = {
  id: string;
  slot: Slot;
  name: string;
  min: number;            // Zubereitungszeit
  kcal: number; carbs: number; protein: number; fat: number;
  type: Protein;
  highCarb?: boolean;
  prep?: boolean;         // gut für Meal Prep
  tip?: string;
  ing: Ing[];
};

const G: Cat = "Obst & Gemüse", K: Cat = "Kühlregal", B: Cat = "Brot & Getreide", V: Cat = "Vorrat", F: Cat = "Fleisch & Fisch", T: Cat = "Tiefkühl";

export const RECIPES: Recipe[] = [
  // ---------------- Frühstück
  { id: "oats", slot: "breakfast", name: "Overnight Oats mit Beeren & Skyr", min: 5, kcal: 600, carbs: 85, protein: 38, fat: 10, type: "veg", highCarb: true, prep: true,
    tip: "Abends ansetzen, morgens nur noch mitnehmen.",
    ing: [{ n: "Haferflocken", q: 80, u: "g", c: B }, { n: "Skyr", q: 150, u: "g", c: K }, { n: "Milch", q: 150, u: "ml", c: K }, { n: "Beeren (TK)", q: 100, u: "g", c: T }, { n: "Honig", q: 10, u: "g", c: V }] },
  { id: "porridge", slot: "breakfast", name: "Porridge mit Banane & Erdnussbutter", min: 8, kcal: 700, carbs: 105, protein: 28, fat: 20, type: "veg", highCarb: true,
    ing: [{ n: "Haferflocken", q: 80, u: "g", c: B }, { n: "Milch", q: 300, u: "ml", c: K }, { n: "Banane", q: 1, u: "Stk", c: G }, { n: "Erdnussbutter", q: 15, u: "g", c: V }] },
  { id: "eggs", slot: "breakfast", name: "Rührei auf Vollkornbrot mit Tomate", min: 10, kcal: 560, carbs: 45, protein: 30, fat: 28, type: "veg",
    ing: [{ n: "Eier", q: 3, u: "Stk", c: K }, { n: "Vollkornbrot", q: 100, u: "g", c: B }, { n: "Tomate", q: 1, u: "Stk", c: G }, { n: "Butter", q: 10, u: "g", c: K }] },
  { id: "skyrbowl", slot: "breakfast", name: "Skyr-Bowl mit Müsli & Apfel", min: 5, kcal: 520, carbs: 70, protein: 35, fat: 8, type: "veg",
    ing: [{ n: "Skyr", q: 250, u: "g", c: K }, { n: "Müsli (ungezuckert)", q: 60, u: "g", c: B }, { n: "Apfel", q: 1, u: "Stk", c: G }] },
  { id: "quarkbread", slot: "breakfast", name: "Vollkornbrötchen mit Kräuterquark & Gurke", min: 5, kcal: 470, carbs: 62, protein: 27, fat: 9, type: "veg",
    ing: [{ n: "Vollkornbrötchen", q: 2, u: "Stk", c: B }, { n: "Kräuterquark", q: 100, u: "g", c: K }, { n: "Gurke", q: 0.3, u: "Stk", c: G }] },

  // ---------------- Mittag (Meal Prep / Büro)
  { id: "bulgur", slot: "lunch", name: "Linsen-Bulgur-Salat mit Feta", min: 20, kcal: 620, carbs: 80, protein: 30, fat: 20, type: "veg", highCarb: true, prep: true,
    tip: "Sonntag für 2–3 Tage vorkochen.",
    ing: [{ n: "Bulgur", q: 70, u: "g", c: V }, { n: "Linsen (Dose, abgetropft)", q: 150, u: "g", c: V }, { n: "Feta", q: 40, u: "g", c: K }, { n: "Paprika", q: 0.5, u: "Stk", c: G }, { n: "Gurke", q: 0.3, u: "Stk", c: G }, { n: "Olivenöl", q: 10, u: "ml", c: V }] },
  { id: "tofubowl", slot: "lunch", name: "Reis-Bowl mit Tofu & Edamame", min: 25, kcal: 720, carbs: 85, protein: 40, fat: 22, type: "veg", highCarb: true, prep: true,
    ing: [{ n: "Reis", q: 80, u: "g", c: V }, { n: "Tofu", q: 150, u: "g", c: K }, { n: "Edamame (TK)", q: 100, u: "g", c: T }, { n: "Karotte", q: 1, u: "Stk", c: G }, { n: "Sojasauce", q: 15, u: "ml", c: V }, { n: "Sesamöl", q: 10, u: "ml", c: V }] },
  { id: "pastasalad", slot: "lunch", name: "Nudelsalat mit Thunfisch & Joghurtdressing", min: 15, kcal: 640, carbs: 80, protein: 45, fat: 9, type: "fish", highCarb: true, prep: true,
    ing: [{ n: "Vollkornnudeln", q: 90, u: "g", c: V }, { n: "Thunfisch (Dose, eigener Saft)", q: 1, u: "Dose", c: V }, { n: "Mais (Dose)", q: 70, u: "g", c: V }, { n: "Cherrytomaten", q: 100, u: "g", c: G }, { n: "Naturjoghurt", q: 80, u: "g", c: K }] },
  { id: "wraps", slot: "lunch", name: "Wraps mit Hummus, Falafel & Salat", min: 15, kcal: 660, carbs: 72, protein: 26, fat: 28, type: "veg",
    ing: [{ n: "Vollkorn-Wraps", q: 2, u: "Stk", c: B }, { n: "Falafel (Kühlregal)", q: 100, u: "g", c: K }, { n: "Hummus", q: 50, u: "g", c: K }, { n: "Salat", q: 50, u: "g", c: G }] },
  { id: "cottage", slot: "lunch", name: "Vollkornbrot mit Hüttenkäse, Gemüse & Apfel", min: 5, kcal: 590, carbs: 75, protein: 38, fat: 9, type: "veg",
    ing: [{ n: "Vollkornbrot", q: 150, u: "g", c: B }, { n: "Hüttenkäse", q: 200, u: "g", c: K }, { n: "Paprika", q: 0.5, u: "Stk", c: G }, { n: "Apfel", q: 1, u: "Stk", c: G }] },

  // ---------------- Abendessen (Familie, kinderfreundlich, ≤ 30 min)
  { id: "bolo", slot: "dinner", name: "Spaghetti Bolognese (halb Hack, halb rote Linsen)", min: 30, kcal: 750, carbs: 100, protein: 40, fat: 18, type: "meat", highCarb: true,
    tip: "Rote Linsen verkochen in der Soße – Kinder merken es nicht.",
    ing: [{ n: "Spaghetti", q: 110, u: "g", c: V }, { n: "Rinderhack", q: 75, u: "g", c: F }, { n: "Rote Linsen", q: 40, u: "g", c: V }, { n: "Passierte Tomaten", q: 150, u: "g", c: V }, { n: "Karotte", q: 0.5, u: "Stk", c: G }, { n: "Zwiebel", q: 0.5, u: "Stk", c: G }, { n: "Parmesan", q: 10, u: "g", c: K }] },
  { id: "friedrice", slot: "dinner", name: "Gemüse-Reispfanne mit Ei", min: 20, kcal: 640, carbs: 85, protein: 25, fat: 20, type: "veg", highCarb: true,
    ing: [{ n: "Reis", q: 90, u: "g", c: V }, { n: "Eier", q: 2, u: "Stk", c: K }, { n: "Pfannengemüse (TK)", q: 200, u: "g", c: T }, { n: "Sojasauce", q: 15, u: "ml", c: V }, { n: "Rapsöl", q: 10, u: "ml", c: V }] },
  { id: "salmon", slot: "dinner", name: "Ofen-Lachs mit Kartoffeln & Brokkoli", min: 30, kcal: 680, carbs: 55, protein: 40, fat: 30, type: "fish",
    ing: [{ n: "Lachsfilet", q: 150, u: "g", c: F }, { n: "Kartoffeln", q: 300, u: "g", c: G }, { n: "Brokkoli", q: 200, u: "g", c: G }, { n: "Zitrone", q: 0.25, u: "Stk", c: G }] },
  { id: "pastamozz", slot: "dinner", name: "Pasta mit Tomate, Spinat & Mozzarella", min: 20, kcal: 700, carbs: 95, protein: 32, fat: 18, type: "veg", highCarb: true,
    ing: [{ n: "Vollkornpasta", q: 110, u: "g", c: V }, { n: "Mozzarella", q: 60, u: "g", c: K }, { n: "Blattspinat (TK)", q: 100, u: "g", c: T }, { n: "Stückige Tomaten (Dose)", q: 150, u: "g", c: V }] },
  { id: "chili", slot: "dinner", name: "Chili sin Carne mit Reis", min: 25, kcal: 640, carbs: 110, protein: 25, fat: 8, type: "veg", highCarb: true, prep: true,
    tip: "Doppelte Menge kochen – Reste sind ein perfektes Mittagessen.",
    ing: [{ n: "Reis", q: 80, u: "g", c: V }, { n: "Kidneybohnen (Dose)", q: 120, u: "g", c: V }, { n: "Mais (Dose)", q: 70, u: "g", c: V }, { n: "Stückige Tomaten (Dose)", q: 150, u: "g", c: V }, { n: "Paprika", q: 0.5, u: "Stk", c: G }, { n: "Zwiebel", q: 0.5, u: "Stk", c: G }] },
  { id: "curry", slot: "dinner", name: "Mildes Hähnchen-Gemüse-Curry mit Reis", min: 25, kcal: 720, carbs: 80, protein: 45, fat: 22, type: "meat", highCarb: true,
    ing: [{ n: "Reis", q: 80, u: "g", c: V }, { n: "Hähnchenbrust", q: 130, u: "g", c: F }, { n: "Kokosmilch light", q: 100, u: "ml", c: V }, { n: "Pfannengemüse (TK)", q: 200, u: "g", c: T }, { n: "Currypaste mild", q: 10, u: "g", c: V }] },
  { id: "potquark", slot: "dinner", name: "Ofenkartoffeln mit Kräuterquark & Rohkost", min: 30, kcal: 600, carbs: 75, protein: 35, fat: 15, type: "veg",
    ing: [{ n: "Kartoffeln", q: 400, u: "g", c: G }, { n: "Kräuterquark", q: 200, u: "g", c: K }, { n: "Gurke", q: 0.3, u: "Stk", c: G }, { n: "Paprika", q: 0.5, u: "Stk", c: G }, { n: "Rapsöl", q: 10, u: "ml", c: V }] },
  { id: "burrito", slot: "dinner", name: "Bohnen-Burritos zum Selberfüllen", min: 20, kcal: 700, carbs: 100, protein: 28, fat: 18, type: "veg", highCarb: true,
    tip: "Alles in Schüsseln auf den Tisch – Kinder füllen selbst.",
    ing: [{ n: "Tortilla-Wraps", q: 2, u: "Stk", c: B }, { n: "Schwarze Bohnen (Dose)", q: 100, u: "g", c: V }, { n: "Mais (Dose)", q: 50, u: "g", c: V }, { n: "Reis", q: 40, u: "g", c: V }, { n: "Reibekäse", q: 30, u: "g", c: K }, { n: "Paprika", q: 0.5, u: "Stk", c: G }, { n: "Salsa", q: 40, u: "g", c: V }] },
  { id: "fishsticks", slot: "dinner", name: "Fischstäbchen mit Kartoffelpüree & Erbsen", min: 25, kcal: 650, carbs: 70, protein: 32, fat: 25, type: "fish",
    ing: [{ n: "Fischstäbchen (TK)", q: 150, u: "g", c: T }, { n: "Kartoffeln", q: 300, u: "g", c: G }, { n: "Milch", q: 80, u: "ml", c: K }, { n: "Erbsen (TK)", q: 150, u: "g", c: T }] },
  { id: "gnocchi", slot: "dinner", name: "Gnocchi-Pfanne mit Zucchini & Tomaten", min: 20, kcal: 620, carbs: 105, protein: 18, fat: 12, type: "veg", highCarb: true,
    ing: [{ n: "Gnocchi (Kühlregal)", q: 250, u: "g", c: K }, { n: "Zucchini", q: 0.5, u: "Stk", c: G }, { n: "Cherrytomaten", q: 150, u: "g", c: G }, { n: "Parmesan", q: 20, u: "g", c: K }] },
  { id: "turkey", slot: "dinner", name: "Putengeschnetzeltes mit Champignons & Bandnudeln", min: 25, kcal: 720, carbs: 85, protein: 50, fat: 16, type: "meat", highCarb: true,
    ing: [{ n: "Bandnudeln", q: 110, u: "g", c: V }, { n: "Putenbrust", q: 130, u: "g", c: F }, { n: "Champignons", q: 150, u: "g", c: G }, { n: "Kochsahne 15 %", q: 60, u: "ml", c: K }] },
  { id: "tomsoup", slot: "dinner", name: "Tomatensuppe mit Käsetoast", min: 20, kcal: 600, carbs: 70, protein: 25, fat: 24, type: "veg",
    ing: [{ n: "Passierte Tomaten", q: 300, u: "g", c: V }, { n: "Toastbrot (Vollkorn)", q: 3, u: "Scheiben", c: B }, { n: "Gouda (Scheiben)", q: 40, u: "g", c: K }, { n: "Zwiebel", q: 0.5, u: "Stk", c: G }] },
  { id: "pancakes", slot: "dinner", name: "Herzhafte Pfannkuchen mit Spinat & Käse", min: 25, kcal: 650, carbs: 70, protein: 30, fat: 26, type: "veg",
    ing: [{ n: "Mehl (Dinkel)", q: 80, u: "g", c: V }, { n: "Eier", q: 2, u: "Stk", c: K }, { n: "Milch", q: 150, u: "ml", c: K }, { n: "Blattspinat (TK)", q: 100, u: "g", c: T }, { n: "Reibekäse", q: 30, u: "g", c: K }] },

  // ---------------- Snacks
  { id: "s_banana", slot: "snack", name: "Banane + 2 Reiswaffeln mit Honig", min: 2, kcal: 250, carbs: 55, protein: 3, fat: 1, type: "veg", highCarb: true,
    tip: "Ideal 60–90 min vor harten Einheiten.",
    ing: [{ n: "Banane", q: 1, u: "Stk", c: G }, { n: "Reiswaffeln", q: 2, u: "Stk", c: B }, { n: "Honig", q: 10, u: "g", c: V }] },
  { id: "s_skyr", slot: "snack", name: "Skyr mit Honig", min: 1, kcal: 230, carbs: 21, protein: 28, fat: 1, type: "veg",
    ing: [{ n: "Skyr", q: 250, u: "g", c: K }, { n: "Honig", q: 15, u: "g", c: V }] },
  { id: "s_pb", slot: "snack", name: "Vollkornbrot mit Erdnussbutter", min: 2, kcal: 250, carbs: 22, protein: 10, fat: 13, type: "veg",
    ing: [{ n: "Vollkornbrot", q: 50, u: "g", c: B }, { n: "Erdnussbutter", q: 20, u: "g", c: V }] },
  { id: "s_cocoa", slot: "snack", name: "Kakao (400 ml) nach dem Training", min: 1, kcal: 280, carbs: 40, protein: 14, fat: 6, type: "veg", highCarb: true,
    tip: "Kohlenhydrate + Protein in den ersten 1–2 h nach harten/langen Einheiten.",
    ing: [{ n: "Milch", q: 400, u: "ml", c: K }, { n: "Kakaopulver", q: 20, u: "g", c: V }] },
  { id: "s_apple", slot: "snack", name: "Apfel + Nüsse", min: 1, kcal: 240, carbs: 25, protein: 5, fat: 14, type: "veg",
    ing: [{ n: "Apfel", q: 1, u: "Stk", c: G }, { n: "Nussmischung", q: 25, u: "g", c: V }] },
];

export const byId = Object.fromEntries(RECIPES.map((r) => [r.id, r])) as Record<string, Recipe>;
