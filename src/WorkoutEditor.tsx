import { useMemo, useState } from "react";
import { callFunction, supabase } from "./supabase";
import { duration, km } from "./format";
import {
  estimate, newSection, newStep, ROLE_LABEL, SPORTS, TEMPLATES, toIntervalsText, validate,
  type PlannedWorkout, type Section, type SectionRole, type Step, type Structure,
} from "./workout";

type Props = {
  date: string;
  existing?: PlannedWorkout;
  onClose: () => void;
  onSaved: () => void;
};

const defaultStructure = (): Structure => TEMPLATES[0].build();

export default function WorkoutEditor({ date: initialDate, existing, onClose, onSaved }: Props) {
  const [name, setName] = useState(existing?.name ?? TEMPLATES[0].name);
  const [date, setDate] = useState(existing?.date ?? initialDate);
  const [sport, setSport] = useState(existing?.sport ?? "Run");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [mode, setMode] = useState<"builder" | "text">(existing && !existing.structure ? "text" : "builder");
  const [structure, setStructure] = useState<Structure>(existing?.structure ?? defaultStructure());
  const [text, setText] = useState(existing?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEndurance = sport !== "WeightTraining";
  const generated = useMemo(() => toIntervalsText(structure), [structure]);
  const est = useMemo(() => estimate(structure), [structure]);

  // --- Struktur bearbeiten ---------------------------------------------
  const updateSection = (id: string, patch: Partial<Section>) =>
    setStructure((st) => ({ sections: st.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const updateStep = (secId: string, stepId: string, patch: Partial<Step>) =>
    setStructure((st) => ({
      sections: st.sections.map((s) =>
        s.id !== secId ? s : { ...s, steps: s.steps.map((p) => (p.id === stepId ? { ...p, ...patch } : p)) },
      ),
    }));

  const addStep = (secId: string) =>
    setStructure((st) => ({
      sections: st.sections.map((s) => (s.id === secId ? { ...s, steps: [...s.steps, newStep({ minutes: 2 })] } : s)),
    }));

  const removeStep = (secId: string, stepId: string) =>
    setStructure((st) => ({
      sections: st.sections.map((s) => (s.id === secId ? { ...s, steps: s.steps.filter((p) => p.id !== stepId) } : s)),
    }));

  const addSection = (role: SectionRole) =>
    setStructure((st) => {
      const sec = newSection(role, { steps: [newStep({ minutes: role === "main" ? 20 : 10 })] });
      const sections = [...st.sections];
      if (role === "warmup") sections.unshift(sec);
      else if (role === "cooldown") sections.push(sec);
      else {
        const cdIndex = sections.findIndex((s) => s.role === "cooldown");
        cdIndex === -1 ? sections.push(sec) : sections.splice(cdIndex, 0, sec);
      }
      return { sections };
    });

  const removeSection = (id: string) =>
    setStructure((st) => ({ sections: st.sections.filter((s) => s.id !== id) }));

  const moveSection = (id: string, dir: -1 | 1) =>
    setStructure((st) => {
      const i = st.sections.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= st.sections.length) return st;
      const sections = [...st.sections];
      [sections[i], sections[j]] = [sections[j], sections[i]];
      return { sections };
    });

  function applyTemplate(key: string) {
    const t = TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    setStructure(t.build());
    setName(t.name);
    setMode("builder");
  }

  function switchMode(next: "builder" | "text") {
    if (next === "text" && mode === "builder") setText(generated);
    setMode(next);
  }

  // --- Speichern / Löschen ---------------------------------------------
  async function save() {
    setError(null);
    if (!name.trim()) return setError("Bitte einen Namen eingeben");
    if (isEndurance && mode === "builder") {
      const v = validate(structure);
      if (v) return setError(v);
    }
    setBusy(true);

    const useBuilder = isEndurance && mode === "builder";
    const row = {
      date,
      sport,
      name: name.trim(),
      notes: notes.trim() || null,
      structure: useBuilder ? structure : null,
      description: useBuilder ? generated : text.trim() || null,
      planned_distance_m: useBuilder && est.meters ? est.meters : null,
      planned_duration_s: useBuilder && est.seconds ? est.seconds : null,
      updated_at: new Date().toISOString(),
    };

    const res = existing
      ? await supabase.from("planned_workouts").update(row).eq("id", existing.id).select("id").single()
      : await supabase.from("planned_workouts").insert(row).select("id").single();

    if (res.error || !res.data) {
      setBusy(false);
      return setError(res.error?.message ?? "Speichern fehlgeschlagen");
    }

    const push = await callFunction("intervals-plan", { action: "push", id: res.data.id });
    setBusy(false);
    if (push.error) {
      // gespeichert, aber nicht an Intervals übertragen – Nutzer kann es später erneut versuchen
      setError(`Gespeichert, aber nicht an die Uhr übertragen: ${push.error}`);
      onSaved();
      return;
    }
    onSaved();
    onClose();
  }

  async function remove() {
    if (!existing) return;
    if (!confirm(`„${existing.name}“ löschen? Die Einheit verschwindet auch von der Uhr.`)) return;
    setBusy(true);
    setError(null);
    if (existing.intervals_event_id) {
      const del = await callFunction("intervals-plan", { action: "delete", id: existing.id });
      if (del.error) {
        setBusy(false);
        return setError(`Konnte nicht aus Intervals löschen: ${del.error}`);
      }
    }
    const { error: dbError } = await supabase.from("planned_workouts").delete().eq("id", existing.id);
    setBusy(false);
    if (dbError) return setError(dbError.message);
    onSaved();
    onClose();
  }

  // --- UI ----------------------------------------------------------------
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Einheit planen">
        <div className="modal-head">
          <h2>{existing ? "Einheit bearbeiten" : "Einheit planen"}</h2>
          <button className="ghost icon" onClick={onClose} disabled={busy} aria-label="Schließen">✕</button>
        </div>

        <div className="modal-body">
          <div className="grid-3">
            <label className="field span-2">
              <span>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="field">
              <span>Datum</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>

          <div className="chips">
            {SPORTS.map((s) => (
              <button key={s.value} className={`chip ${sport === s.value ? "on" : ""}`} onClick={() => setSport(s.value)}>
                {s.label}
              </button>
            ))}
          </div>

          {isEndurance && (
            <>
              <div className="row-between">
                <div className="chips">
                  <span className="muted small">Vorlage:</span>
                  {TEMPLATES.map((t) => (
                    <button key={t.key} className="chip" onClick={() => applyTemplate(t.key)}>{t.label}</button>
                  ))}
                </div>
                <div className="seg">
                  <button className={mode === "builder" ? "on" : ""} onClick={() => switchMode("builder")}>Baukasten</button>
                  <button className={mode === "text" ? "on" : ""} onClick={() => switchMode("text")}>Text</button>
                </div>
              </div>

              {mode === "builder" ? (
                <div className="sections">
                  {structure.sections.map((sec, i) => (
                    <div key={sec.id} className={`section role-${sec.role}`}>
                      <div className="section-head">
                        {sec.role === "main" ? (
                          <input
                            className="section-title"
                            value={sec.title}
                            placeholder={ROLE_LABEL.main}
                            onChange={(e) => updateSection(sec.id, { title: e.target.value })}
                          />
                        ) : (
                          <strong>{ROLE_LABEL[sec.role]}</strong>
                        )}
                        <label className="repeat">
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={sec.repeat}
                            onChange={(e) => updateSection(sec.id, { repeat: Math.max(1, Number(e.target.value) || 1) })}
                          />
                          <span>× wiederholen</span>
                        </label>
                        <div className="section-actions">
                          <button className="ghost icon" onClick={() => moveSection(sec.id, -1)} disabled={i === 0} aria-label="Nach oben">↑</button>
                          <button className="ghost icon" onClick={() => moveSection(sec.id, 1)} disabled={i === structure.sections.length - 1} aria-label="Nach unten">↓</button>
                          <button className="ghost icon" onClick={() => removeSection(sec.id)} aria-label="Abschnitt entfernen">✕</button>
                        </div>
                      </div>

                      {sec.steps.map((st) => (
                        <div key={st.id} className="step">
                          <div className="seg small">
                            <button className={st.kind === "time" ? "on" : ""} onClick={() => updateStep(sec.id, st.id, { kind: "time" })}>Zeit</button>
                            <button className={st.kind === "distance" ? "on" : ""} onClick={() => updateStep(sec.id, st.id, { kind: "distance" })}>km</button>
                          </div>
                          {st.kind === "time" ? (
                            <div className="dur">
                              <input type="number" min={0} value={st.minutes} onChange={(e) => updateStep(sec.id, st.id, { minutes: Number(e.target.value) || 0 })} aria-label="Minuten" />
                              <span>min</span>
                              <input type="number" min={0} max={59} value={st.seconds} onChange={(e) => updateStep(sec.id, st.id, { seconds: Number(e.target.value) || 0 })} aria-label="Sekunden" />
                              <span>s</span>
                            </div>
                          ) : (
                            <div className="dur">
                              <input type="number" min={0} step={0.1} value={st.km} onChange={(e) => updateStep(sec.id, st.id, { km: Number(e.target.value) || 0 })} aria-label="Kilometer" />
                              <span>km</span>
                            </div>
                          )}
                          <div className="pace">
                            <input placeholder="Pace" value={st.paceFrom} onChange={(e) => updateStep(sec.id, st.id, { paceFrom: e.target.value })} aria-label="Pace von" />
                            <span>–</span>
                            <input placeholder="bis" value={st.paceTo} onChange={(e) => updateStep(sec.id, st.id, { paceTo: e.target.value })} aria-label="Pace bis" />
                            <span>/km</span>
                          </div>
                          <input className="cue" placeholder="Hinweis (optional)" value={st.cue} onChange={(e) => updateStep(sec.id, st.id, { cue: e.target.value })} />
                          <label className="lap-toggle" title="Schritt endet erst, wenn du die Lap-Taste drückst">
                            <input type="checkbox" checked={!!st.lap} onChange={(e) => updateStep(sec.id, st.id, { lap: e.target.checked })} /> bis Lap
                          </label>
                          <button className="ghost icon" onClick={() => removeStep(sec.id, st.id)} aria-label="Schritt entfernen">✕</button>
                        </div>
                      ))}
                      <button className="ghost small" onClick={() => addStep(sec.id)}>+ Schritt</button>
                    </div>
                  ))}

                  <div className="chips">
                    <button className="ghost small" onClick={() => addSection("warmup")}>+ Einlaufen</button>
                    <button className="ghost small" onClick={() => addSection("main")}>+ Block</button>
                    <button className="ghost small" onClick={() => addSection("cooldown")}>+ Auslaufen</button>
                  </div>

                  <div className="estimate">
                    <span>≈ {duration(est.seconds)}</span>
                    {est.meters > 0 && <span>≈ {km(est.meters)} km</span>}
                  </div>

                  <details className="preview">
                    <summary>So geht es an die Uhr</summary>
                    <pre>{generated}</pre>
                  </details>
                </div>
              ) : (
                <label className="field">
                  <span>Workout-Text (Intervals-Syntax)</span>
                  <textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
                </label>
              )}
            </>
          )}

          <label className="field">
            <span>Notizen (nur in der App)</span>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          {error && <p className="error">{error}</p>}
        </div>

        <div className="modal-foot">
          {existing ? (
            <button className="ghost danger" onClick={remove} disabled={busy}>Löschen</button>
          ) : <span />}
          <button onClick={save} disabled={busy}>{busy ? "Speichere …" : "Speichern & auf die Uhr"}</button>
        </div>
      </div>
    </div>
  );
}
