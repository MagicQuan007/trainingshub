import { useState } from "react";
import { supabase } from "../supabase";

export type CrewEvent = {
  id: string;
  title: string;
  kind: "race" | "group" | "other";
  wish: boolean;
  date: string | null;
  start_time: string | null;
  location: string | null;
  distances: string[];
  url: string | null;
  notes: string | null;
  created_by: string;
};

type Props = { existing?: CrewEvent; defaultWish?: boolean; canDelete: boolean; onClose: () => void; onSaved: () => void };

export default function EventForm({ existing, defaultWish, canDelete, onClose, onSaved }: Props) {
  const [f, setF] = useState({
    title: existing?.title ?? "",
    kind: existing?.kind ?? (defaultWish ? "race" : "group"),
    wish: existing?.wish ?? !!defaultWish,
    date: existing?.date ?? "",
    time: existing?.start_time?.slice(0, 5) ?? "",
    location: existing?.location ?? "",
    distances: existing?.distances.join(", ") ?? "",
    url: existing?.url ?? "",
    notes: existing?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function save() {
    setError(null);
    if (!f.title.trim()) return setError("Bitte einen Titel angeben");
    if (!f.wish && !f.date) return setError("Für feste Termine bitte ein Datum angeben");
    let url = f.url.trim();
    if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
    setBusy(true);
    const row = {
      title: f.title.trim(),
      kind: f.kind,
      wish: f.wish,
      date: f.date || null,
      start_time: f.time || null,
      location: f.location.trim() || null,
      distances: f.distances.split(",").map((s) => s.trim()).filter(Boolean),
      url: url || null,
      notes: f.notes.trim() || null,
    };
    const res = existing
      ? await supabase.from("crew_events").update(row).eq("id", existing.id)
      : await supabase.from("crew_events").insert(row);
    setBusy(false);
    if (res.error) return setError(res.error.message);
    onSaved();
    onClose();
  }

  async function remove() {
    if (!existing || !confirm(`„${existing.title}“ löschen? Alle Zusagen gehen verloren.`)) return;
    const { error } = await supabase.from("crew_events").delete().eq("id", existing.id);
    if (error) return setError(error.message);
    onSaved();
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal narrow" role="dialog" aria-modal="true" aria-label="Termin">
        <div className="modal-head">
          <h2>{existing ? "Termin bearbeiten" : f.wish ? "Rennen vorschlagen" : "Neuer Termin"}</h2>
          <button className="ghost icon" onClick={onClose} aria-label="Schließen">✕</button>
        </div>
        <div className="modal-body">
          <label className="field"><span>Titel</span><input value={f.title} onChange={set("title")} placeholder="z. B. Hermannslauf oder Sonntagslauf Teuto" /></label>
          <div className="chips">
            {(["race", "group", "other"] as const).map((k) => (
              <button key={k} className={`chip ${f.kind === k ? "on" : ""}`} onClick={() => setF({ ...f, kind: k })}>
                {k === "race" ? "Rennen" : k === "group" ? "Gruppenlauf" : "Sonstiges"}
              </button>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={f.wish} onChange={(e) => setF({ ...f, wish: e.target.checked })} />
            <span>Wunschliste – noch nicht fest, erst mal Interesse sammeln</span>
          </label>
          <div className="grid-2">
            <label className="field"><span>Datum{f.wish ? " (optional)" : ""}</span><input type="date" value={f.date} onChange={set("date")} /></label>
            <label className="field"><span>Uhrzeit (optional)</span><input type="time" value={f.time} onChange={set("time")} /></label>
          </div>
          <label className="field"><span>Ort / Treffpunkt</span><input value={f.location} onChange={set("location")} placeholder="z. B. Parkplatz Tönsberg" /></label>
          <label className="field"><span>Strecken (mit Komma trennen)</span><input value={f.distances} onChange={set("distances")} placeholder="z. B. 10 km, Halbmarathon" /></label>
          <label className="field"><span>Link (Ausschreibung/Anmeldung)</span><input value={f.url} onChange={set("url")} placeholder="https://…" inputMode="url" /></label>
          <label className="field"><span>Notizen</span><textarea rows={3} value={f.notes} onChange={set("notes")} placeholder="Fahrgemeinschaft, Tempo, Anmeldeschluss …" /></label>
          {error && <p className="error">{error}</p>}
        </div>
        <div className="modal-foot">
          {canDelete ? <button className="ghost danger" onClick={remove}>Löschen</button> : <span />}
          <button onClick={save} disabled={busy}>{busy ? "Speichere …" : "Speichern"}</button>
        </div>
      </div>
    </div>
  );
}
