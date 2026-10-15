import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { KINDS, KIND_LABEL, TOLERANCE, carbGuidance, lookupBarcode, type FuelProduct, type ProductDraft } from "./fuel";
import Scanner from "./Scanner";
import ProductEditor from "./ProductEditor";

export default function Fuel() {
  const [products, setProducts] = useState<FuelProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [scan, setScan] = useState(false);
  const [editor, setEditor] = useState<{ existing?: FuelProduct; draft?: ProductDraft } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [minutes, setMinutes] = useState(140);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("fuel_products").select("*").order("kind").order("name");
    if (error) setMsg(error.message);
    setProducts((data as FuelProduct[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onCode(code: string) {
    setScan(false);
    setMsg(null);
    const known = products.find((p) => p.barcode === code);
    if (known) {
      setEditor({ existing: known });
      return;
    }
    try {
      const draft = await lookupBarcode(code);
      if (draft) setEditor({ draft: { ...draft, stock: 1 } });
      else {
        setMsg(`Barcode ${code} ist bei Open Food Facts nicht bekannt – bitte Werte von der Packung eintragen.`);
        setEditor({ draft: { barcode: code, name: "", brand: null, kind: "gel", serving_label: null, serving_g: null, carbs_g: null, sodium_mg: null, caffeine_mg: null, kcal: null, carb_ratio: null, image_url: null, stock: 1 } });
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  async function changeStock(p: FuelProduct, delta: number) {
    const stock = Math.max(0, p.stock + delta);
    setProducts(products.map((x) => (x.id === p.id ? { ...x, stock } : x)));
    await supabase.from("fuel_products").update({ stock, updated_at: new Date().toISOString() }).eq("id", p.id);
  }

  const visible = useMemo(() => (filter === "all" ? products : products.filter((p) => p.kind === filter)), [products, filter]);
  const lowStock = products.filter((p) => p.stock <= 2 && p.tolerance !== "schlecht");
  const guide = carbGuidance(minutes);
  const h = minutes / 60;

  return (
    <div className="fuel">
      <div className="fuel-actions">
        <button onClick={() => setScan(true)}>Barcode scannen</button>
        <button className="ghost" onClick={() => setEditor({})}>Manuell anlegen</button>
      </div>

      {msg && <div className="notice error" onClick={() => setMsg(null)}>{msg}</div>}

      {/* Richtwerte */}
      <section className="card">
        <h2>Wie viel brauche ich?</h2>
        <div className="guide">
          <label className="field">
            <span>Belastungsdauer: {Math.floor(minutes / 60)}:{String(minutes % 60).padStart(2, "0")} h</span>
            <input type="range" min={45} max={600} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
          </label>
          <div className="guide-out">
            <strong className="mono">{guide.range[0]}–{guide.range[1]} g KH/h</strong>
            <span className="muted small">gesamt ≈ {Math.round(guide.range[0] * h)}–{Math.round(guide.range[1] * h)} g · Natrium ≈ {Math.round(300 * h)}–{Math.round(600 * h)} mg</span>
          </div>
          <p className="muted small">{guide.text} Natrium: ~300–600 mg/h je nach Schweißrate und Wärme.</p>
          <div className="chips">
            <button className="chip" onClick={() => setMinutes(140)}>Hermannslauf 2:20</button>
            <button className="chip" onClick={() => setMinutes(480)}>Rennsteig ~8 h</button>
          </div>
        </div>
      </section>

      {lowStock.length > 0 && (
        <div className="notice">Fast leer: {lowStock.map((p) => `${p.name} (${p.stock})`).join(", ")}</div>
      )}

      {/* Schrank */}
      <section className="card">
        <div className="card-head">
          <h2>Dein Schrank</h2>
          <span className="muted small">{products.length} Produkte</span>
        </div>
        <div className="chips" style={{ marginBottom: 12 }}>
          <button className={`chip ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>Alle</button>
          {KINDS.filter((k) => products.some((p) => p.kind === k.value)).map((k) => (
            <button key={k.value} className={`chip ${filter === k.value ? "on" : ""}`} onClick={() => setFilter(k.value)}>{k.label}</button>
          ))}
        </div>

        {loading ? (
          <p className="muted">Lädt …</p>
        ) : products.length === 0 ? (
          <div className="empty">
            <p className="muted">Noch leer. Scann deine Gels, Getränkepulver und Salztabletten – Nährwerte kommen automatisch, wenn das Produkt bei Open Food Facts bekannt ist.</p>
          </div>
        ) : (
          <ul className="products">
            {visible.map((p) => (
              <li key={p.id} className="product">
                <button className="product-main" onClick={() => setEditor({ existing: p })}>
                  {p.image_url ? <img src={p.image_url} alt="" /> : <span className="product-ph">{KIND_LABEL[p.kind]?.[0] ?? "?"}</span>}
                  <span className="product-text">
                    <span className="product-name">{p.name}</span>
                    <span className="muted small">{[p.brand, KIND_LABEL[p.kind], p.serving_label].filter(Boolean).join(" · ")}</span>
                    <span className="nutri">
                      {p.carbs_g != null && <em>{p.carbs_g} g KH</em>}
                      {p.sodium_mg != null && <em>{p.sodium_mg} mg Na</em>}
                      {p.caffeine_mg ? <em>{p.caffeine_mg} mg Koffein</em> : null}
                      {p.tolerance && <em className={`tol ${TOLERANCE[p.tolerance]?.tone}`}>{TOLERANCE[p.tolerance]?.label}</em>}
                    </span>
                  </span>
                </button>
                <div className="stock">
                  <button className="ghost icon" onClick={() => changeStock(p, -1)} aria-label="Weniger">−</button>
                  <span className="mono">{p.stock}</span>
                  <button className="ghost icon" onClick={() => changeStock(p, 1)} aria-label="Mehr">+</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="muted small">
        Richtwerte nach Jeukendrup (2014) und dem ACSM/IOC-Konsens zur Sporternährung. Hohe Mengen (&gt; 60 g/h) nur nach Darmtraining in langen Läufen.
        Die Alltagsernährung kommt als nächster Bereich hier dazu.
      </p>

      {scan && <Scanner onResult={onCode} onClose={() => setScan(false)} />}
      {editor && <ProductEditor existing={editor.existing} draft={editor.draft} onClose={() => setEditor(null)} onSaved={load} />}
    </div>
  );
}
