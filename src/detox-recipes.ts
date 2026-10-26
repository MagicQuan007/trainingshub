// Detox-Phase 27.10.–16.11.2026 – Rezepte aus Merlins Detox-Kochbuch (Seitenzahlen = Buch).
// Mengen pro Erwachsenen-Portion (Buchrezepte für 2 Portionen halbiert, für 4 geviertelt bzw. wo angegeben angepasst).
// Nährwerte sind gerundete Richtwerte.
import type { Cat, Recipe } from "./recipes";

const G: Cat = "Obst & Gemüse", K: Cat = "Kühlregal", B: Cat = "Brot & Getreide", V: Cat = "Vorrat", F: Cat = "Fleisch & Fisch", T: Cat = "Tiefkühl";

type R = Omit<Recipe, "type" | "min"> & Partial<Pick<Recipe, "type" | "min">>;
const d = (r: R): Recipe => ({ type: "veg", min: 10, prog: "detox", ...r });

export const DETOX_RECIPES: Recipe[] = [
  // ---------------- Smoothies (Buch S. 60/68, mit Merlins Notizen)
  d({ id: "dx_s_veryberry", slot: "breakfast", name: "Very-Berry-Smoothie", page: "S. 60", min: 5, kcal: 380, carbs: 80, protein: 6, fat: 4,
    ing: [{ n: "Rote Bete (vorgegart)", q: 1, u: "Stk", c: G }, { n: "Medjool-Datteln", q: 4, u: "Stk", c: V }, { n: "Beeren (TK)", q: 80, u: "g", c: T }, { n: "Chiasamen", q: 10, u: "g", c: V }] }),
  d({ id: "dx_s_ginger", slot: "breakfast", name: "Ginger Colada", page: "S. 60", min: 5, kcal: 220, carbs: 42, protein: 3, fat: 4,
    ing: [{ n: "Grünkohl oder Spinat", q: 30, u: "g", c: G }, { n: "Zitrone", q: 1, u: "Stk", c: G }, { n: "Ananas (TK)", q: 100, u: "g", c: T }, { n: "Getrocknete Aprikosen", q: 2, u: "Stk", c: V }, { n: "Kokosdrink", q: 100, u: "ml", c: K }, { n: "Chiasamen", q: 5, u: "g", c: V }, { n: "Ingwer", q: 5, u: "g", c: G }] }),
  d({ id: "dx_s_heidel", slot: "breakfast", name: "Wilder Heidelbeer-Smoothie", page: "S. 60", min: 5, kcal: 210, carbs: 18, protein: 6, fat: 12,
    ing: [{ n: "Heidelbeeren (TK)", q: 100, u: "g", c: T }, { n: "Babyspinat", q: 30, u: "g", c: G }, { n: "Mandelmus", q: 15, u: "g", c: V }, { n: "Mandelmilch", q: 200, u: "ml", c: K }] }),
  d({ id: "dx_s_pina", slot: "breakfast", name: "Piña Colada", page: "S. 60", min: 5, kcal: 190, carbs: 35, protein: 2, fat: 5,
    ing: [{ n: "Kokoswasser", q: 200, u: "ml", c: V }, { n: "Ananas (TK)", q: 100, u: "g", c: T }, { n: "Babyspinat", q: 30, u: "g", c: G }, { n: "Kokosraspel", q: 7, u: "g", c: V }] }),
  d({ id: "dx_s_cookie", slot: "breakfast", name: "Mandel-Cookie-Smoothie (+ Protein)", page: "S. 60", min: 5, kcal: 420, carbs: 55, protein: 15, fat: 16,
    ing: [{ n: "Mandelmilch", q: 200, u: "ml", c: K }, { n: "Blumenkohl (TK)", q: 80, u: "g", c: T }, { n: "Chiasamen", q: 10, u: "g", c: V }, { n: "Medjool-Datteln", q: 2.5, u: "Stk", c: V }, { n: "Mandelmus", q: 15, u: "g", c: V }, { n: "Proteinpulver", q: 10, u: "g", c: V }] }),
  d({ id: "dx_s_bowl", slot: "breakfast", name: "Green Smoothie Bowl", page: "S. 68", min: 8, kcal: 330, carbs: 60, protein: 8, fat: 7,
    ing: [{ n: "Banane", q: 1, u: "Stk", c: G }, { n: "Babyspinat", q: 40, u: "g", c: G }, { n: "Mango (TK)", q: 100, u: "g", c: T }, { n: "Mandelmilch", q: 60, u: "ml", c: K }, { n: "Beeren (TK)", q: 50, u: "g", c: T }, { n: "Kürbiskerne", q: 10, u: "g", c: V }] }),
  d({ id: "dx_a_skyr", slot: "breakfast", name: "+ 250 g Skyr (oder 1 Messlöffel Protein) & 3 EL Haferflocken", serves: "me", addon: true, min: 1, kcal: 335, carbs: 27, protein: 31, fat: 2,
    tip: "In den Smoothie mixen oder dazu essen – hält bis mittags satt.",
    ing: [{ n: "Skyr", q: 250, u: "g", c: K }, { n: "Haferflocken", q: 25, u: "g", c: B }] }),

  // ---------------- Mittag warm (immer für 2 Tage gekocht)
  d({ id: "dx_l_regenbogen", slot: "lunch", name: "Regenbogenreis", page: "S. 125", min: 35, kcal: 530, carbs: 65, protein: 11, fat: 24,
    tip: "Mit 2 Eiern oder Tofu wird's eiweißreicher.",
    ing: [{ n: "Vollkornreis", q: 75, u: "g", c: V }, { n: "Karotte", q: 1, u: "Stk", c: G }, { n: "Brokkoli", q: 0.5, u: "Stk", c: G }, { n: "Olivenöl", q: 22, u: "ml", c: V }, { n: "Knoblauch", q: 0.5, u: "Zehe", c: G }, { n: "Ingwer", q: 5, u: "g", c: G }, { n: "Kokos-Aminos", q: 7, u: "ml", c: V }, { n: "Granatapfel", q: 0.25, u: "Stk", c: G }] }),
  d({ id: "dx_l_linsensuppe", slot: "lunch", name: "Marokkanische Linsensuppe", page: "S. 189", min: 40, kcal: 470, carbs: 68, protein: 28, fat: 9,
    ing: [{ n: "Braune Linsen", q: 100, u: "g", c: V }, { n: "Zwiebel", q: 0.5, u: "Stk", c: G }, { n: "Knoblauch", q: 1.5, u: "Zehe", c: G }, { n: "Karotte", q: 1, u: "Stk", c: G }, { n: "Staudensellerie", q: 1, u: "Stange", c: G }, { n: "Olivenöl", q: 7, u: "ml", c: V }, { n: "Gemüsebrühe", q: 475, u: "ml", c: V }, { n: "Stückige Tomaten (Dose)", q: 200, u: "g", c: V }] }),
  d({ id: "dx_l_sesamnudeln", slot: "lunch", name: "Sesamnudeln", page: "S. 95", min: 20, kcal: 740, carbs: 92, protein: 10, fat: 35,
    tip: "Kalt oder warm – Sauce erst kurz vor dem Essen untermischen.",
    ing: [{ n: "Reisnudeln", q: 100, u: "g", c: V }, { n: "Karotte", q: 0.5, u: "Stk", c: G }, { n: "Rotkohl", q: 200, u: "g", c: G }, { n: "Koriander", q: 0.5, u: "Bund", c: G }, { n: "Sesamsaat", q: 10, u: "g", c: V }, { n: "Ingwer", q: 10, u: "g", c: G }, { n: "Sesamöl", q: 30, u: "ml", c: V }, { n: "Reisessig", q: 7, u: "ml", c: V }, { n: "Kokos-Aminos", q: 15, u: "ml", c: V }] }),
  d({ id: "dx_l_taboule", slot: "lunch", name: "Asiatisches Quinoa-Taboulé", page: "S. 121", min: 25, kcal: 600, carbs: 85, protein: 16, fat: 22,
    ing: [{ n: "Quinoa", q: 100, u: "g", c: V }, { n: "Karotte", q: 1, u: "Stk", c: G }, { n: "Rotkohl", q: 150, u: "g", c: G }, { n: "Paprika", q: 0.5, u: "Stk", c: G }, { n: "Koriander", q: 0.5, u: "Bund", c: G }, { n: "Ingwer", q: 3, u: "g", c: G }, { n: "Kokos-Aminos", q: 22, u: "ml", c: V }, { n: "Ahornsirup", q: 10, u: "ml", c: V }, { n: "Limette", q: 1, u: "Stk", c: G }, { n: "Olivenöl", q: 15, u: "ml", c: V }, { n: "Sesamöl", q: 3, u: "ml", c: V }] }),
  d({ id: "dx_l_kokosblumenkohl", slot: "lunch", name: "Kokos-Curry-Blumenkohl mit Mango-Gurken-Salat + Reis", page: "S. 145", min: 40, kcal: 1050, carbs: 120, protein: 18, fat: 55,
    tip: "Kokosraspel sind sehr energiereich – hier schon auf die Hälfte reduziert (90 g statt 180 g fürs Rezept).",
    ing: [{ n: "Blumenkohl", q: 0.5, u: "Stk", c: G }, { n: "Vollkornreismehl", q: 70, u: "g", c: V }, { n: "Kokosmilch", q: 120, u: "ml", c: V }, { n: "Kokosraspel", q: 45, u: "g", c: V }, { n: "Olivenöl", q: 7, u: "ml", c: V }, { n: "Mango", q: 0.5, u: "Stk", c: G }, { n: "Gurke", q: 0.5, u: "Stk", c: G }, { n: "Rote Zwiebel", q: 0.25, u: "Stk", c: G }, { n: "Minze", q: 0.5, u: "Bund", c: G }, { n: "Limette", q: 0.5, u: "Stk", c: G }, { n: "Vollkornreis", q: 50, u: "g", c: V }] }),
  d({ id: "dx_l_onepot", slot: "lunch", name: "One Pot Pasta", page: "Buch", min: 20, kcal: 520, carbs: 95, protein: 16, fat: 7,
    ing: [{ n: "Spaghetti", q: 125, u: "g", c: V }, { n: "Kirschtomaten", q: 125, u: "g", c: G }, { n: "Knoblauch", q: 1, u: "Zehe", c: G }, { n: "Gemüsebrühe", q: 250, u: "ml", c: V }, { n: "Basilikum", q: 0.5, u: "Topf", c: G }, { n: "Olivenöl", q: 5, u: "ml", c: V }] }),
  d({ id: "dx_l_suesskartoffel", slot: "lunch", name: "Goldene Süßkartoffelsuppe", page: "S. 178", min: 30, kcal: 800, carbs: 85, protein: 27, fat: 34,
    ing: [{ n: "Zwiebel", q: 0.25, u: "Stk", c: G }, { n: "Knoblauch", q: 0.5, u: "Zehe", c: G }, { n: "Ingwer", q: 10, u: "g", c: G }, { n: "Süßkartoffel", q: 150, u: "g", c: G }, { n: "Olivenöl", q: 15, u: "ml", c: V }, { n: "Gemüsebrühe", q: 350, u: "ml", c: V }, { n: "Kokosmilch", q: 100, u: "ml", c: V }, { n: "Rote Linsen", q: 100, u: "g", c: V }, { n: "Kokos-Aminos", q: 15, u: "ml", c: V }] }),
  d({ id: "dx_l_quinoaananas", slot: "lunch", name: "Gebratene Quinoa mit Ananas", page: "S. 119", min: 30, kcal: 1100, carbs: 140, protein: 32, fat: 45,
    ing: [{ n: "Quinoa", q: 125, u: "g", c: V }, { n: "Frühlingszwiebeln", q: 1.25, u: "Stk", c: G }, { n: "Ananas", q: 0.25, u: "Stk", c: G }, { n: "Erbsen (TK)", q: 40, u: "g", c: T }, { n: "Cashewkerne", q: 35, u: "g", c: V }, { n: "Sesamsaat", q: 10, u: "g", c: V }, { n: "Sesamöl", q: 15, u: "ml", c: V }, { n: "Kokos-Aminos", q: 30, u: "ml", c: V }, { n: "Kokosblütensirup", q: 20, u: "ml", c: V }, { n: "Mandelmus", q: 20, u: "g", c: V }, { n: "Reisessig", q: 7, u: "ml", c: V }, { n: "Ingwer", q: 5, u: "g", c: G }] }),
  d({ id: "dx_l_linsenblumenkohl", slot: "lunch", name: "Cremige Linsen-Blumenkohl-Suppe", page: "S. 191", min: 30, kcal: 480, carbs: 56, protein: 22, fat: 16,
    tip: "Das Buchrezept (4 Portionen) ist knapp – hier doppelte Menge gerechnet.",
    ing: [{ n: "Zwiebel", q: 0.5, u: "Stk", c: G }, { n: "Karotte", q: 1, u: "Stk", c: G }, { n: "Staudensellerie", q: 0.5, u: "Stange", c: G }, { n: "Ingwer", q: 5, u: "g", c: G }, { n: "Knoblauch", q: 1, u: "Zehe", c: G }, { n: "Olivenöl", q: 5, u: "ml", c: V }, { n: "Blumenkohl", q: 0.5, u: "Stk", c: G }, { n: "Gemüsebrühe", q: 500, u: "ml", c: V }, { n: "Rote Linsen", q: 60, u: "g", c: V }, { n: "Kokosmilch", q: 30, u: "ml", c: V }] }),
  d({ id: "dx_l_zitronenpasta", slot: "lunch", name: "Zitronenpasta", page: "S. 109", min: 25, kcal: 900, carbs: 110, protein: 20, fat: 38,
    tip: "Cashews 30 min in heißem Wasser einweichen.",
    ing: [{ n: "Spaghetti (glutenfrei)", q: 125, u: "g", c: V }, { n: "Cashewkerne", q: 20, u: "g", c: V }, { n: "Zitrone", q: 1, u: "Stk", c: G }, { n: "Knoblauch", q: 0.5, u: "Zehe", c: G }, { n: "Hefeflocken", q: 5, u: "g", c: V }, { n: "Olivenöl", q: 15, u: "ml", c: V }, { n: "Pistazien (ohne Schale)", q: 25, u: "g", c: V }, { n: "Ahornsirup", q: 15, u: "ml", c: V }] }),
  d({ id: "dx_l_karotteningwer", slot: "lunch", name: "Karotten-Ingwer-Suppe", page: "S. 185", min: 50, kcal: 170, carbs: 25, protein: 3, fat: 7,
    tip: "Leichte Suppe – mit 2 Scheiben Lifechanging Brot aus dem Gefrierfach essen.",
    ing: [{ n: "Karotten", q: 250, u: "g", c: G }, { n: "Zwiebel", q: 0.25, u: "Stk", c: G }, { n: "Knoblauch", q: 1.5, u: "Zehe", c: G }, { n: "Ingwer", q: 10, u: "g", c: G }, { n: "Olivenöl", q: 7, u: "ml", c: V }, { n: "Apfelessig", q: 7, u: "ml", c: V }, { n: "Gemüsebrühe", q: 225, u: "ml", c: V }] }),
  d({ id: "dx_a_brot", slot: "lunch", name: "+ 2 Scheiben Lifechanging Brot (ohne Haferflocken)", page: "S. 83", addon: true, min: 10, kcal: 290, carbs: 15, protein: 10, fat: 21,
    tip: "Ein Brot (ca. 12 Scheiben) backen: 180 g gekochter Vollkornreis, 180 g gekochte Quinoa, Flohsamen, Saaten, Nüsse, 400 ml Wasser · 30 min quellen, 60 min bei 180 °C. Rest in Scheiben einfrieren.",
    ing: [{ n: "Vollkornreis", q: 10, u: "g", c: V }, { n: "Quinoa", q: 10, u: "g", c: V }, { n: "Flohsamenschalen", q: 2, u: "g", c: V }, { n: "Leinsamen", q: 10, u: "g", c: V }, { n: "Sonnenblumenkerne", q: 8, u: "g", c: V }, { n: "Kürbiskerne", q: 8, u: "g", c: V }, { n: "Mandelkerne (gehobelt)", q: 7, u: "g", c: V }, { n: "Walnusskerne", q: 7, u: "g", c: V }] }),

  // ---------------- Abends Salat
  d({ id: "dx_d_brokkoliquinoa", slot: "dinner", name: "Brokkoli-Quinoa-Salat", page: "Buch", min: 25, kcal: 740, carbs: 50, protein: 25, fat: 50,
    tip: "Mandelmus fürs Dressing hier halbiert – reicht trotzdem gut.",
    ing: [{ n: "Brokkoli", q: 0.5, u: "Stk", c: G }, { n: "Rote Zwiebel", q: 0.25, u: "Stk", c: G }, { n: "Quinoa", q: 45, u: "g", c: V }, { n: "Cashewkerne", q: 35, u: "g", c: V }, { n: "Sesamsaat", q: 10, u: "g", c: V }, { n: "Limette", q: 0.5, u: "Stk", c: G }, { n: "Ingwer", q: 3, u: "g", c: G }, { n: "Mandelmus", q: 30, u: "g", c: V }, { n: "Kokos-Aminos", q: 30, u: "ml", c: V }, { n: "Reisessig", q: 15, u: "ml", c: V }, { n: "Sesamöl", q: 7, u: "ml", c: V }] }),
  d({ id: "dx_d_linsensalat", slot: "dinner", name: "Linsensalat", page: "S. 166", min: 25, kcal: 560, carbs: 55, protein: 12, fat: 32,
    ing: [{ n: "Avocado", q: 0.5, u: "Stk", c: G }, { n: "Mango", q: 0.5, u: "Stk", c: G }, { n: "Gurke", q: 0.5, u: "Stk", c: G }, { n: "Braune Linsen", q: 40, u: "g", c: V }, { n: "Dill", q: 0.5, u: "Bund", c: G }, { n: "Olivenöl", q: 15, u: "ml", c: V }, { n: "Limette", q: 0.5, u: "Stk", c: G }, { n: "Ahornsirup", q: 5, u: "ml", c: V }] }),
  d({ id: "dx_d_gruenkohlbirne", slot: "dinner", name: "Grünkohlsalat mit Birnen", page: "Buch", min: 20, kcal: 670, carbs: 30, protein: 9, fat: 60,
    ing: [{ n: "Grünkohl", q: 80, u: "g", c: G }, { n: "Walnusskerne", q: 30, u: "g", c: V }, { n: "Fenchel", q: 0.5, u: "Stk", c: G }, { n: "Birne", q: 0.5, u: "Stk", c: G }, { n: "Avocado", q: 0.5, u: "Stk", c: G }, { n: "Olivenöl", q: 22, u: "ml", c: V }, { n: "Zitrone", q: 0.5, u: "Stk", c: G }, { n: "Ahornsirup", q: 5, u: "ml", c: V }] }),
  d({ id: "dx_d_regenbogensalat", slot: "dinner", name: "Asiatischer Regenbogensalat", page: "S. 171", min: 20, kcal: 560, carbs: 40, protein: 14, fat: 42,
    ing: [{ n: "Grünkohl", q: 60, u: "g", c: G }, { n: "Karotte", q: 0.5, u: "Stk", c: G }, { n: "Rotkohl", q: 150, u: "g", c: G }, { n: "Frühlingszwiebeln", q: 0.5, u: "Stk", c: G }, { n: "Koriander", q: 0.5, u: "Bund", c: G }, { n: "Mandelblättchen", q: 15, u: "g", c: V }, { n: "Erdnussbutter", q: 32, u: "g", c: V }, { n: "Reisessig", q: 7, u: "ml", c: V }, { n: "Sesamöl", q: 15, u: "ml", c: V }, { n: "Limette", q: 0.5, u: "Stk", c: G }, { n: "Kokos-Aminos", q: 7, u: "ml", c: V }, { n: "Ahornsirup", q: 22, u: "ml", c: V }, { n: "Ingwer", q: 5, u: "g", c: G }] }),
  d({ id: "dx_d_summerbowl", slot: "dinner", name: "Summer Bowl", page: "S. 172", min: 25, kcal: 830, carbs: 85, protein: 25, fat: 42,
    tip: "Mit Kokosmilch light gerechnet – mit normaler Kokosmilch ca. 150 kcal mehr.",
    ing: [{ n: "Quinoa", q: 88, u: "g", c: V }, { n: "Kokosmilch light", q: 200, u: "ml", c: V }, { n: "Limette", q: 1.25, u: "Stk", c: G }, { n: "Avocado", q: 0.5, u: "Stk", c: G }, { n: "Romanasalat", q: 0.25, u: "Kopf", c: G }, { n: "Rote Zwiebel", q: 0.25, u: "Stk", c: G }, { n: "Paprika", q: 0.5, u: "Stk", c: G }, { n: "Weiße Bohnen (Dose, abgetropft)", q: 110, u: "g", c: V }, { n: "Koriander", q: 0.5, u: "Bund", c: G }] }),
  d({ id: "dx_d_gruenkohlgemuese", slot: "dinner", name: "Grünkohlsalat mit gebratenem Gemüse", page: "S. 168", min: 35, kcal: 550, carbs: 60, protein: 12, fat: 27,
    ing: [{ n: "Süßkartoffel", q: 0.5, u: "Stk", c: G }, { n: "Karotte", q: 0.75, u: "Stk", c: G }, { n: "Rote Bete (roh)", q: 0.5, u: "Stk", c: G }, { n: "Rote Zwiebel", q: 0.25, u: "Stk", c: G }, { n: "Kichererbsen (Dose, abgetropft)", q: 110, u: "g", c: V }, { n: "Olivenöl", q: 22, u: "ml", c: V }, { n: "Grünkohl", q: 50, u: "g", c: G }, { n: "Zitrone", q: 0.75, u: "Stk", c: G }, { n: "Ahornsirup", q: 5, u: "ml", c: V }] }),
  d({ id: "dx_d_einmachglas", slot: "dinner", name: "Salat im Einmachglas", page: "S. 175", min: 15, kcal: 700, carbs: 70, protein: 28, fat: 35,
    tip: "Reihenfolge: Dressing → weiches Gemüse → festes Gemüse → Kerne/Kichererbsen → Blattsalat.",
    ing: [{ n: "Zitrone", q: 0.5, u: "Stk", c: G }, { n: "Orange", q: 0.5, u: "Stk", c: G }, { n: "Grapefruit", q: 0.5, u: "Stk", c: G }, { n: "Olivenöl", q: 15, u: "ml", c: V }, { n: "Kichererbsen (Dose, abgetropft)", q: 110, u: "g", c: V }, { n: "Quinoa", q: 35, u: "g", c: V }, { n: "Brokkoli", q: 0.25, u: "Stk", c: G }, { n: "Kürbiskerne", q: 30, u: "g", c: V }, { n: "Babyspinat", q: 40, u: "g", c: G }, { n: "Gurke", q: 0.25, u: "Stk", c: G }, { n: "Tomate", q: 1, u: "Stk", c: G }] }),
  d({ id: "dx_d_reissalat", slot: "dinner", name: "Mediterraner Reissalat", page: "S. 128", min: 35, kcal: 400, carbs: 50, protein: 8, fat: 18,
    ing: [{ n: "Vollkornreis", q: 50, u: "g", c: V }, { n: "Rote Zwiebel", q: 0.15, u: "Stk", c: G }, { n: "Paprika", q: 0.25, u: "Stk", c: G }, { n: "Gurke", q: 0.25, u: "Stk", c: G }, { n: "Kirschtomaten", q: 50, u: "g", c: G }, { n: "Dill", q: 0.25, u: "Bund", c: G }, { n: "Petersilie", q: 0.25, u: "Bund", c: G }, { n: "Zitrone", q: 0.3, u: "Stk", c: G }, { n: "Olivenöl", q: 8, u: "ml", c: V }, { n: "Walnusskerne", q: 10, u: "g", c: V }] }),
  d({ id: "dx_d_pestosalat", slot: "dinner", name: "Basilikumpesto-Salat", page: "S. 103", min: 20, kcal: 830, carbs: 95, protein: 18, fat: 40,
    tip: "Pinienkerne und Öl hier halbiert – schmeckt trotzdem, spart ~300 kcal.",
    ing: [{ n: "Farfalle", q: 125, u: "g", c: V }, { n: "Schalotte", q: 0.5, u: "Stk", c: G }, { n: "Knoblauch", q: 0.5, u: "Zehe", c: G }, { n: "Basilikum", q: 0.5, u: "Topf", c: G }, { n: "Pinienkerne", q: 25, u: "g", c: V }, { n: "Olivenöl", q: 20, u: "ml", c: V }, { n: "Zitrone", q: 0.5, u: "Stk", c: G }, { n: "Rucola", q: 40, u: "g", c: G }, { n: "Karotte", q: 0.5, u: "Stk", c: G }] }),

  // ---------------- Eiweiß zum Salat
  d({ id: "dx_p_eggbread", slot: "dinner", name: "+ 2 Eier & 1 Scheibe Vollkornbrot", addon: true, min: 10, kcal: 260, carbs: 22, protein: 16, fat: 11,
    ing: [{ n: "Eier", q: 2, u: "Stk", c: K }, { n: "Vollkornbrot", q: 50, u: "g", c: B }] }),
  d({ id: "dx_p_egg", slot: "dinner", name: "+ 2 gekochte Eier", addon: true, min: 10, kcal: 150, carbs: 1, protein: 13, fat: 10,
    ing: [{ n: "Eier", q: 2, u: "Stk", c: K }] }),
  d({ id: "dx_p_chicken", slot: "dinner", name: "+ Hähnchenbrust (gebraten)", type: "meat", addon: true, min: 15, kcal: 190, carbs: 0, protein: 30, fat: 6,
    ing: [{ n: "Hähnchenbrust", q: 130, u: "g", c: F }] }),
  d({ id: "dx_p_feta", slot: "dinner", name: "+ Feta", addon: true, min: 1, kcal: 135, carbs: 1, protein: 8, fat: 11,
    ing: [{ n: "Feta", q: 50, u: "g", c: K }] }),
  d({ id: "dx_p_salmon", slot: "dinner", name: "+ Lachs (Ofen oder Pfanne)", type: "fish", addon: true, min: 15, kcal: 270, carbs: 0, protein: 26, fat: 18,
    ing: [{ n: "Lachsfilet", q: 130, u: "g", c: F }] }),
  d({ id: "dx_p_chickpeabread", slot: "dinner", name: "+ Kichererbsen & 1 Scheibe Vollkornbrot", addon: true, min: 2, kcal: 250, carbs: 38, protein: 11, fat: 4,
    ing: [{ n: "Kichererbsen (Dose, abgetropft)", q: 120, u: "g", c: V }, { n: "Vollkornbrot", q: 50, u: "g", c: B }] }),
  d({ id: "dx_p_hummusbread", slot: "dinner", name: "+ Hummus & Vollkornbrot", addon: true, min: 2, kcal: 310, carbs: 32, protein: 10, fat: 15,
    ing: [{ n: "Hummus", q: 60, u: "g", c: K }, { n: "Vollkornbrot", q: 60, u: "g", c: B }] }),
  d({ id: "dx_p_tuna", slot: "dinner", name: "+ Thunfisch (oder weiße Bohnen)", type: "fish", addon: true, min: 1, kcal: 120, carbs: 0, protein: 26, fat: 1,
    ing: [{ n: "Thunfisch (Dose, eigener Saft)", q: 1, u: "Dose", c: V }] }),
  d({ id: "dx_p_edamame", slot: "dinner", name: "+ Edamame", addon: true, min: 5, kcal: 150, carbs: 10, protein: 13, fat: 6,
    ing: [{ n: "Edamame (TK)", q: 120, u: "g", c: T }] }),
  d({ id: "dx_p_tofu", slot: "dinner", name: "+ Tofu (gebraten)", addon: true, min: 10, kcal: 180, carbs: 3, protein: 18, fat: 11,
    ing: [{ n: "Tofu", q: 150, u: "g", c: K }] }),

  // ---------------- Trainingstage
  d({ id: "dx_me_carbs", slot: "dinner", name: "+ Beilage der Kinder mitessen (Nudeln oder 2 Scheiben Brot)", serves: "me", addon: true, min: 1, kcal: 290, carbs: 58, protein: 10, fat: 2,
    tip: "An harten und langen Tagen – sonst fehlen die Kohlenhydrate für die Erholung.",
    ing: [{ n: "Nudeln", q: 80, u: "g", c: V }] }),

  // ---------------- Kinder abends (sättigend; Mengen pro Kind)
  d({ id: "dx_k_breadegg_cuc", slot: "kids", name: "Brot mit Ei und Gurke", serves: "kids", addon: true, kcal: 0, carbs: 0, protein: 0, fat: 0,
    ing: [{ n: "Vollkornbrot", q: 80, u: "g", c: B }, { n: "Eier", q: 1, u: "Stk", c: K }, { n: "Gurke", q: 0.25, u: "Stk", c: G }, { n: "Butter", q: 10, u: "g", c: K }] }),
  d({ id: "dx_k_pasta_tomato", slot: "kids", name: "Nudeln mit Tomatensauce", serves: "kids", addon: true, kcal: 0, carbs: 0, protein: 0, fat: 0,
    ing: [{ n: "Nudeln", q: 80, u: "g", c: V }, { n: "Passierte Tomaten", q: 120, u: "g", c: V }, { n: "Parmesan", q: 10, u: "g", c: K }] }),
  d({ id: "dx_k_pretzel_cheese", slot: "kids", name: "Brezeln und Käse", serves: "kids", addon: true, kcal: 0, carbs: 0, protein: 0, fat: 0,
    ing: [{ n: "Brezeln", q: 1.5, u: "Stk", c: B }, { n: "Gouda (Scheiben)", q: 30, u: "g", c: K }] }),
  d({ id: "dx_k_pasta_peas", slot: "kids", name: "Nudeln mit Erbsen", serves: "kids", addon: true, kcal: 0, carbs: 0, protein: 0, fat: 0,
    ing: [{ n: "Nudeln", q: 80, u: "g", c: V }, { n: "Erbsen (TK)", q: 60, u: "g", c: T }, { n: "Kochsahne 15 %", q: 30, u: "ml", c: K }] }),
  d({ id: "dx_k_bread_hummus", slot: "kids", name: "Brot, Rohkost und Hummus", serves: "kids", addon: true, kcal: 0, carbs: 0, protein: 0, fat: 0,
    ing: [{ n: "Vollkornbrot", q: 80, u: "g", c: B }, { n: "Karotte", q: 1, u: "Stk", c: G }, { n: "Hummus", q: 40, u: "g", c: K }] }),
  d({ id: "dx_k_pasta_pesto", slot: "kids", name: "Nudeln mit Pesto", serves: "kids", addon: true, kcal: 0, carbs: 0, protein: 0, fat: 0,
    ing: [{ n: "Nudeln", q: 80, u: "g", c: V }, { n: "Basilikumpesto (Glas)", q: 25, u: "g", c: V }] }),
  d({ id: "dx_k_pretzel_veg", slot: "kids", name: "Brezeln und Gemüsesticks", serves: "kids", addon: true, kcal: 0, carbs: 0, protein: 0, fat: 0,
    ing: [{ n: "Brezeln", q: 1.5, u: "Stk", c: B }, { n: "Karotte", q: 1, u: "Stk", c: G }, { n: "Gurke", q: 0.25, u: "Stk", c: G }] }),
  d({ id: "dx_k_bread_chicken", slot: "kids", name: "Brot mit Hähnchen", serves: "kids", addon: true, kcal: 0, carbs: 0, protein: 0, fat: 0,
    ing: [{ n: "Vollkornbrot", q: 80, u: "g", c: B }, { n: "Hähnchenbrust", q: 60, u: "g", c: F }, { n: "Gurke", q: 0.25, u: "Stk", c: G }] }),
  d({ id: "dx_k_bread_egg", slot: "kids", name: "Brot mit Ei", serves: "kids", addon: true, kcal: 0, carbs: 0, protein: 0, fat: 0,
    ing: [{ n: "Vollkornbrot", q: 80, u: "g", c: B }, { n: "Eier", q: 1, u: "Stk", c: K }, { n: "Butter", q: 10, u: "g", c: K }] }),
  d({ id: "dx_k_pasta_salmon", slot: "kids", name: "Nudeln mit Lachs", serves: "kids", addon: true, kcal: 0, carbs: 0, protein: 0, fat: 0,
    ing: [{ n: "Nudeln", q: 80, u: "g", c: V }, { n: "Lachsfilet", q: 60, u: "g", c: F }, { n: "Kochsahne 15 %", q: 30, u: "ml", c: K }] }),
  d({ id: "dx_k_bread_raw", slot: "kids", name: "Brot und Rohkost", serves: "kids", addon: true, kcal: 0, carbs: 0, protein: 0, fat: 0,
    ing: [{ n: "Vollkornbrot", q: 80, u: "g", c: B }, { n: "Karotte", q: 1, u: "Stk", c: G }, { n: "Gurke", q: 0.25, u: "Stk", c: G }, { n: "Frischkäse", q: 20, u: "g", c: K }] }),
  d({ id: "dx_k_bread_cheese_hummus", slot: "kids", name: "Brot mit Käse und Hummus", serves: "kids", addon: true, kcal: 0, carbs: 0, protein: 0, fat: 0,
    ing: [{ n: "Vollkornbrot", q: 80, u: "g", c: B }, { n: "Gouda (Scheiben)", q: 25, u: "g", c: K }, { n: "Hummus", q: 30, u: "g", c: K }] }),
  d({ id: "dx_k_pasta_chicken", slot: "kids", name: "Nudeln mit Hähnchen", serves: "kids", addon: true, kcal: 0, carbs: 0, protein: 0, fat: 0,
    ing: [{ n: "Nudeln", q: 80, u: "g", c: V }, { n: "Hähnchenbrust", q: 60, u: "g", c: F }, { n: "Passierte Tomaten", q: 100, u: "g", c: V }] }),
];

// ---------------------------------------------------------------- 21-Tage-Plan
// [Datum, Training (run = hart, long = lang, easy = locker, "" = Ruhetag), cook|rest, Mittag, Smoothie, Salat, Eiweiß, Kinder]
export type DetoxDay = { date: string; train: "" | "run" | "long" | "easy"; cook: boolean; lunch: string; bread?: boolean; smoothie: string; salad: string; protein: string; kids: string };

const row = (date: string, train: DetoxDay["train"], cook: "cook" | "rest", lunch: string, smoothie: string, salad: string, protein: string, kids: string, bread = false): DetoxDay =>
  ({ date, train, cook: cook === "cook", lunch, smoothie, salad, protein, kids, bread });

export const DETOX_ID = "detox-2026-10";
export const DETOX_REV = 2; // erhöhen → Detox-Tage werden beim nächsten Öffnen neu berechnet
export const DETOX_FROM = "2026-10-27";
export const DETOX_TO = "2026-11-16";

export const DETOX_DAYS: DetoxDay[] = [
  row("2026-10-27", "run", "cook", "dx_l_regenbogen", "dx_s_veryberry", "dx_d_brokkoliquinoa", "dx_p_eggbread", "dx_k_breadegg_cuc"),
  row("2026-10-28", "", "rest", "dx_l_regenbogen", "dx_s_ginger", "dx_d_linsensalat", "dx_p_chicken", "dx_k_pasta_tomato"),
  row("2026-10-29", "easy", "cook", "dx_l_linsensuppe", "dx_s_heidel", "dx_d_gruenkohlbirne", "dx_p_feta", "dx_k_pretzel_cheese"),
  row("2026-10-30", "", "rest", "dx_l_linsensuppe", "dx_s_pina", "dx_d_regenbogensalat", "dx_p_salmon", "dx_k_pasta_peas"),
  row("2026-10-31", "run", "cook", "dx_l_sesamnudeln", "dx_s_cookie", "dx_d_summerbowl", "dx_p_chickpeabread", "dx_k_bread_hummus"),
  row("2026-11-01", "long", "rest", "dx_l_sesamnudeln", "dx_s_bowl", "dx_d_einmachglas", "dx_p_hummusbread", "dx_k_pasta_pesto"),
  row("2026-11-02", "", "cook", "dx_l_taboule", "dx_s_veryberry", "dx_d_gruenkohlgemuese", "dx_p_egg", "dx_k_pretzel_veg"),
  row("2026-11-03", "run", "rest", "dx_l_taboule", "dx_s_ginger", "dx_d_reissalat", "dx_p_chicken", "dx_k_bread_chicken"),
  row("2026-11-04", "", "cook", "dx_l_kokosblumenkohl", "dx_s_heidel", "dx_d_linsensalat", "dx_p_feta", "dx_k_pasta_tomato"),
  row("2026-11-05", "easy", "rest", "dx_l_kokosblumenkohl", "dx_s_pina", "dx_d_pestosalat", "dx_p_tuna", "dx_k_pasta_pesto"),
  row("2026-11-06", "", "cook", "dx_l_onepot", "dx_s_cookie", "dx_d_regenbogensalat", "dx_p_edamame", "dx_k_pretzel_cheese"),
  row("2026-11-07", "run", "rest", "dx_l_onepot", "dx_s_bowl", "dx_d_brokkoliquinoa", "dx_p_eggbread", "dx_k_bread_egg"),
  row("2026-11-08", "long", "cook", "dx_l_suesskartoffel", "dx_s_veryberry", "dx_d_summerbowl", "dx_p_salmon", "dx_k_pasta_salmon", true),
  row("2026-11-09", "", "rest", "dx_l_suesskartoffel", "dx_s_ginger", "dx_d_gruenkohlbirne", "dx_p_feta", "dx_k_bread_raw", true),
  row("2026-11-10", "run", "cook", "dx_l_quinoaananas", "dx_s_heidel", "dx_d_einmachglas", "dx_p_hummusbread", "dx_k_bread_cheese_hummus"),
  row("2026-11-11", "", "rest", "dx_l_quinoaananas", "dx_s_pina", "dx_d_linsensalat", "dx_p_chicken", "dx_k_pasta_chicken"),
  row("2026-11-12", "easy", "cook", "dx_l_linsenblumenkohl", "dx_s_cookie", "dx_d_regenbogensalat", "dx_p_tofu", "dx_k_pretzel_cheese"),
  row("2026-11-13", "", "rest", "dx_l_linsenblumenkohl", "dx_s_bowl", "dx_d_gruenkohlgemuese", "dx_p_salmon", "dx_k_pasta_peas"),
  row("2026-11-14", "run", "cook", "dx_l_zitronenpasta", "dx_s_veryberry", "dx_d_reissalat", "dx_p_feta", "dx_k_bread_raw"),
  row("2026-11-15", "long", "rest", "dx_l_zitronenpasta", "dx_s_ginger", "dx_d_brokkoliquinoa", "dx_p_eggbread", "dx_k_pasta_tomato"),
  row("2026-11-16", "", "cook", "dx_l_karotteningwer", "dx_s_heidel", "dx_d_summerbowl", "dx_p_chicken", "dx_k_pretzel_veg", true),
];

export const detoxDay = Object.fromEntries(DETOX_DAYS.map((x) => [x.date, x])) as Record<string, DetoxDay>;
