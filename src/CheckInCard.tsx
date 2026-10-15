import { useCallback, useEffect, useState } from "react";
import { callFunction, supabase } from "./supabase";
import { DEFAULT_SETTINGS, type CoachSettings } from "./coach";
import { toIntervalsText, type PlannedWorkout } from "./workout";
import {
  ITEMS, LEVEL_TEXT, adjustWorkout, computeScore, recommend,
  type CheckIn, type Level,
} from "./readiness";

type Props = {
  today: string;
  planned: PlannedWorkout[];
  hrv: { today: number | null; avg: number | null };
  rhr: { today: number | null; avg: number | null };
  onChanged: () => void;
};

type Draft = { sleep: number; energy: number; soreness: number; stress: number; mood: number; ill: boolean; pain: boolean; minutes: string; note: string };
const EMPTY: Draft = { sleep: 0, energy: 0, soreness: 0, stress: 0, mood: 0, ill: false, pain: false, minutes: "", note: "" };

export default function CheckInCard({ today, planned, hrv, rhr, onChanged }: Props) {
  const [existing, setExisting] = useState<CheckIn | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [settings, setSettings] = useState<CoachSettings>(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [c, st] = await Promise.all([
      supabase.from("checkins").select("*").eq("date", today).maybeSingle(),
      supabase.from("user_settings").select("coach").maybeSingle(),
    ]);
    setSettings({ ...DEFAULT_SETTINGS, ...((st.data?.coach as Partial<CoachSettings>) ?? {}) });
    if (c.data) {
      const ci = c.data as CheckIn;
      setExisting(ci);
      setDraft({ sleep: ci.sleep, energy: ci.energy, soreness: ci.soreness, stress: ci.stress, mood: ci.mood, ill: ci.ill, pain: ci.pain, minutes: ci.minutes_available ? String(ci.minutes_available) : "", note: ci.note ?? "" });
    } else {
      setExisting(null);
      setEditing(true);
    }
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  const complete = ITEMS.every((i) => draft[i.key] > 0);

  async function save() {
    if (!complete) return setMsg("Bitte alle fünf Punkte bewerten");
    setBusy(true);
    setMsg(null);
    const minutes = draft.minutes.trim() ? Number(draft.minutes) : null;
    const { score } = computeScore(draft, hrv, rhr);
    const level = recommend(score, { ill: draft.ill, pain: draft.pain, minutes_available: minutes }, planned, settings);
    const row = {
      date: today, sleep: draft.sleep, energy: draft.energy, soreness: draft.soreness, stress: draft.stress, mood: draft.mood,
      ill: draft.ill, pain: draft.pain, minutes_available: minutes, note: draft.note.trim() || null, score, recommendation: level,
    };
    const { error } = await supabase.from("checkins").upsert(row, { onConflict: "user_id,date" });
    setBusy(false);
    if (error) return setMsg(error.message);
    setEditing(false);
    load();
    onChanged();
  }

  const runs = planned.filter((w) => w.sport !== "WeightTraining");
  const adjusted = runs.filter((w) => (w as PlannedWorkout & { adjusted_from?: unknown }).adjusted_from);
  const level = (existing?.recommendation as Level | null) ?? null;
  const scoreInfo = existing ? computeScore(existing, hrv, rhr) : null;

  async function applyAdjustment() {
    if (!level || level === "plan") return;
    setBusy(true);
    setMsg(null);
    let failed = 0;
    for (const w of runs) {
      const a = adjustWorkout(w, level, settings, existing?.minutes_available);
      const original = {
        name: w.name, sport: w.sport, structure: w.structure, description: w.description,
        planned_distance_m: w.planned_distance_m, planned_duration_s: w.planned_duration_s,
      };
      const description = a.structure ? toIntervalsText(a.structure) : null;
      const est = "estimate" in a ? a.estimate : undefined;
      const upd = await supabase.from("planned_workouts").update({
        name: a.name, sport: a.sport, structure: a.structure, description,
        planned_distance_m: est?.meters || null, planned_duration_s: est?.seconds || null,
        adjusted_from: original, updated_at: new Date().toISOString(),
      }).eq("id", w.id);
      if (upd.error) { failed++; continue; }
      const res = a.push
        ? await callFunction("intervals-plan", { action: "push", id: w.id })
        : w.intervals_event_id
          ? await callFunction("intervals-plan", { action: "delete", id: w.id })
          : { error: null };
      if (!a.push && !res.error) await supabase.from("planned_workouts").update({ intervals_event_id: null }).eq("id", w.id);
      if (res.error) failed++;
    }
    setBusy(false);
    setMsg(failed ? `${failed} Einheit(en) konnten nicht übertragen werden – im Wochenplan erneut senden.` : "Angepasst und an die Uhr geschickt.");
    onChanged();
  }

  async function undo() {
    setBusy(true);
    for (const w of adjusted) {
      const o = (w as PlannedWorkout & { adjusted_from: Record<string, unknown> }).adjusted_from;
      await supabase.from("planned_workouts").update({ ...o, adjusted_from: null, updated_at: new Date().toISOString() }).eq("id", w.id);
      await callFunction("intervals-plan", { action: "push", id: w.id });
    }
    setBusy(false);
    setMsg("Ursprüngliche Einheit wiederhergestellt.");
    onChanged();
  }

  if (editing || !existing) {
    return (
      <section className="card checkin">
        <div className="card-head">
          <h2>Wie geht's dir heute?</h2>
          {existing && <button className="ghost small" onClick={() => setEditing(false)}>Abbrechen</button>}
        </div>
        <div className="ci-items">
          {ITEMS.map((it) => (
            <div key={it.key} className="ci-row">
              <span className="ci-label">{it.label}</span>
              <div className="ci-scale">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    className={`ci-dot v${v} ${draft[it.key] === v ? "on" : ""}`}
                    onClick={() => setDraft({ ...draft, [it.key]: v })}
                    aria-label={`${it.label} ${v} von 5`}
                  >{v}</button>
                ))}
              </div>
              <span className="ci-hint muted">{it.low} → {it.high}</span>
            </div>
          ))}
        </div>
        <div className="chips">
          <button className={`chip ${draft.ill ? "on bad" : ""}`} onClick={() => setDraft({ ...draft, ill: !draft.ill })}>🤒 Krank / angeschlagen</button>
          <button className={`chip ${draft.pain ? "on bad" : ""}`} onClick={() => setDraft({ ...draft, pain: !draft.pain })}>⚠️ Schmerzen</button>
          <label className="ci-time">
            <span className="muted small">Zeit heute</span>
            <input inputMode="numeric" placeholder="min" value={draft.minutes} onChange={(e) => setDraft({ ...draft, minutes: e.target.value.replace(/\D/g, "") })} />
          </label>
        </div>
        <input placeholder="Notiz (optional) – z. B. Deadline, schlecht geschlafen, Reise" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        {msg && <p className="error">{msg}</p>}
        <button onClick={save} disabled={busy || !complete}>{busy ? "Speichere …" : "Check-in speichern"}</button>
      </section>
    );
  }

  const info = level ? LEVEL_TEXT[level] : null;
  return (
    <section className="card checkin">
      <div className="card-head">
        <h2>Bereitschaft heute</h2>
        <button className="ghost small" onClick={() => setEditing(true)}>Bearbeiten</button>
      </div>
      <div className="ci-result">
        <div className={`ci-score ${info?.tone ?? ""}`}>
          <strong className="mono">{existing.score ?? "–"}</strong>
          <span className="muted small">/ 100</span>
        </div>
        <div>
          <strong>{info?.title}</strong>
          <p className="muted small">{info?.text}</p>
          {scoreInfo && scoreInfo.notes.length > 0 && <p className="small">{scoreInfo.notes.join(" · ")}</p>}
          {existing.note && <p className="muted small">„{existing.note}“</p>}
        </div>
      </div>
      {level && level !== "plan" && runs.length > 0 && adjusted.length === 0 && (
        <button onClick={applyAdjustment} disabled={busy}>
          {busy ? "Passe an …" : level === "rest" ? "Heutige Einheit absagen" : "Heutige Einheit anpassen"}
        </button>
      )}
      {adjusted.length > 0 && (
        <button className="ghost small" onClick={undo} disabled={busy}>Rückgängig: ursprüngliche Einheit</button>
      )}
      {level && level !== "plan" && runs.length === 0 && <p className="muted small">Heute ist ohnehin kein Lauf geplant.</p>}
      {(existing.ill || existing.pain) && (
        <p className="muted small">Bei Fieber oder Beschwerden unterhalb des Halses kein Training. Hält ein Schmerz an, lass ihn ärztlich abklären.</p>
      )}
      {msg && <p className="small">{msg}</p>}
    </section>
  );
}
