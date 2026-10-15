import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { ymd } from "./dates";
import { KINDS, TOLERANCE, type FuelLog, type FuelProduct, type ProductDraft } from "./fuel";

type Props = {
  existing?: FuelProduct;
  draft?: ProductDraft;
  onClose: () => void;
  onSaved: () => void;
};

const toStr = (v: number | null | undefined) => (v == null ? "" : String(v));
const toNum = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

export default function ProductEditor({ existing, draft, onClose, onSaved }: Props) {
  const src = existing ?? draft;
  const [f, setF] = useState({
    name: src?.name ?? "",
    brand: src?.brand ?? "",
    kind: src?.kind ?? "gel",
    serving_label: src?.serving_label ?? "",
    serving_g: toStr(src?.serving_g),
    carbs_g: toStr(src?.carbs_g),
    sodium_mg: toStr(src?.sodium_mg),
    caffeine_mg: toStr(src?.caffeine_mg),
    kcal: toStr(src?.kcal),
    carb_ratio: src?.carb_ratio ?? "",
    stock: String(existing?.stock ?? draft?.stock ?? 0),
    notes: existing?.notes ?? "",
  });
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [log, setLog] = useState({ date: ymd(new Date()), context: "training", amount: "1", tolerance: "gut", note: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    supabase.from("fuel_logs").select("*").eq("product_id", existing.id).order("date", { ascending: false })
      .then(({ data }) => setLogs((data as FuelLog[]) ?? []));
  }, [existing]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function save() {
    if (!f.name.trim()) return setError("Bitte einen Namen eingeben");
    setBusy(true);
    setError(null);
    const row = {
      name: f.name.trim(),
      brand: f.brand.trim() || null,
      kind: f.kind,
      serving_label: f.serving_label.trim() || null,
      serving_g: toNum(f.serving_g),
      carbs_g: toNum(f.carbs_g),
      sodium_mg: toNum(f.sodium_mg),
      caffeine_mg: toNum(f.caffeine_mg),
      kcal: toNum(f.kcal),
      carb_ratio: f.carb_ratio.trim() || null,
      stock: Math.max(0, Math.round(Number(f.stock) || 0)),
      notes: f.notes.trim() || null,
      barcode: src?.barcode ?? null,
      image_url: src?.image_url ?? null,
      updated_at: new Date().toISOString(),
    };
    const res = existing
      ? await supabase.from("fuel_products").update(row).eq("id", existing.id)
      : await supabase.from("fuel_products").insert(row);
    setBusy(false);
    if (res.error) return setError(res.error.message);
    onSaved();
    onClose();
  }

  async function remove() {
    if (!existing || !confirm(`„${existing.name}“ aus dem Schrank löschen?`)) return;
    const { error: e } = await supabase.from("fuel_products").delete().eq("id", existing.id);
    if (e) return setError(e.message);
    onSaved();
    onClose();
  }

  async function addLog() {
    if (!existing) return;
    const amount = Number(log.amount.replace(",", ".")) || 1;
    const ins = await supabase.from("fuel_logs").insert({
      product_id: existing.id, date: log.date, context: log.context, amount, tolerance: log.tolerance, note: log.note.trim() || null,
    }).select("*").single();
    if (ins.error) return setError(ins.error.message);
    // Bestand reduzieren und Gesamteindruck = letzte Erfahrung
    const newStock = Math.max(0, (Number(f.stock) || 0) - Math.round(amount));
    await supabase.from("fuel_products").update({ stock: newStock, tolerance: log.tolerance, updated_at: new Date().toISOString() }).eq("id", existing.id);
    setF({ ...f, stock: String(newStock) });
    setLogs([ins.data as FuelLog, ...logs]);
    setLog({ ...log, note: "" });
    onSaved();
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Produkt">
        <div className="modal-head">
          <h2>{existing ? "Produkt" : "Neues Produkt"}</h2>
          <button className="ghost icon" onClick={onClose} aria-label="Schließen">✕</button>
        </div>
        <div className="modal-body">
          {src?.image_url && <img className="product-img" src={src.image_url} alt="" />}
          <div className="grid-3">
            <label className="field span-2"><span>Name</span><input value={f.name} onChange={set("name")} /></label>
            <label className="field"><span>Marke</span><input value={f.brand} onChange={set("brand")} /></label>
          </div>
          <div className="grid-fuel">
            <label className="field"><span>Art</span>
              <select value={f.kind} onChange={set("kind")}>{KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select>
            </label>
            <label className="field"><span>Portion</span><input placeholder="1 Gel (40 g)" value={f.serving_label} onChange={set("serving_label")} /></label>
            <label className="field"><span>Kohlenhydrate (g/Portion)</span><input inputMode="decimal" value={f.carbs_g} onChange={set("carbs_g")} /></label>
            <label className="field"><span>Natrium (mg/Portion)</span><input inputMode="decimal" value={f.sodium_mg} onChange={set("sodium_mg")} /></label>
            <label className="field"><span>Koffein (mg/Portion)</span><input inputMode="decimal" value={f.caffeine_mg} onChange={set("caffeine_mg")} /></label>
            <label className="field"><span>kcal/Portion</span><input inputMode="decimal" value={f.kcal} onChange={set("kcal")} /></label>
            <label className="field"><span>Glukose:Fruktose</span><input placeholder="1:0,8" value={f.carb_ratio} onChange={set("carb_ratio")} /></label>
            <label className="field"><span>Bestand (Stück)</span><input inputMode="numeric" value={f.stock} onChange={set("stock")} /></label>
          </div>
          <label className="field"><span>Notizen</span><textarea rows={2} value={f.notes} onChange={set("notes")} placeholder="Geschmack, Konsistenz, mit/ohne Wasser …" /></label>
          {src?.barcode && <p className="muted small">Barcode {src.barcode} · Nährwerte aus Open Food Facts, bitte mit der Packung abgleichen.</p>}

          {existing && (
            <div className="fuel-logs">
              <h3>Erfahrungen</h3>
              <div className="log-form">
                <input type="date" value={log.date} onChange={(e) => setLog({ ...log, date: e.target.value })} aria-label="Datum" />
                <select value={log.context} onChange={(e) => setLog({ ...log, context: e.target.value })} aria-label="Anlass">
                  <option value="training">Training</option>
                  <option value="rennen">Rennen</option>
                </select>
                <input inputMode="decimal" value={log.amount} onChange={(e) => setLog({ ...log, amount: e.target.value })} aria-label="Portionen" style={{ width: 70 }} />
                <div className="seg small">
                  {Object.entries(TOLERANCE).map(([k, v]) => (
                    <button key={k} className={log.tolerance === k ? "on" : ""} onClick={() => setLog({ ...log, tolerance: k })}>{v.label.replace(" vertragen", "")}</button>
                  ))}
                </div>
                <input placeholder="Notiz (z. B. km 12, warm)" value={log.note} onChange={(e) => setLog({ ...log, note: e.target.value })} />
                <button className="small" onClick={addLog}>Eintragen</button>
              </div>
              {logs.length === 0 ? (
                <p className="muted small">Noch keine Erfahrungen – nach jeder Nutzung kurz eintragen, dann weiß der Race-Planer, was du verträgst.</p>
              ) : (
                <ul className="log-list">
                  {logs.map((l) => (
                    <li key={l.id}>
                      <span className="mono small">{new Date(l.date).toLocaleDateString("de-DE")}</span>
                      <span className="small">{l.context === "rennen" ? "Rennen" : "Training"} · {l.amount}×</span>
                      <span className={`tol ${TOLERANCE[l.tolerance]?.tone}`}>{TOLERANCE[l.tolerance]?.label}</span>
                      {l.note && <span className="muted small">{l.note}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error && <p className="error">{error}</p>}
        </div>
        <div className="modal-foot">
          {existing ? <button className="ghost danger" onClick={remove}>Löschen</button> : <span />}
          <button onClick={save} disabled={busy}>{busy ? "Speichere …" : "Speichern"}</button>
        </div>
      </div>
    </div>
  );
}
