import { useCallback, useEffect, useMemo, useState } from "react";
import { callFunction, supabase, type Activity } from "./supabase";
import { addDays, isoWeek, ymd } from "./dates";
import { duration, isRun, km, pace, TYPE_LABEL, weekStart } from "./format";
import { SPORTS, type PlannedWorkout } from "./workout";
import WorkoutEditor from "./WorkoutEditor";

const SPORT_LABEL = Object.fromEntries(SPORTS.map((s) => [s.value, s.label]));

export default function Week({ refreshKey }: { refreshKey: number }) {
  const [start, setStart] = useState(() => weekStart(new Date()));
  const [planned, setPlanned] = useState<PlannedWorkout[]>([]);
  const [done, setDone] = useState<Activity[]>([]);
  const [editor, setEditor] = useState<{ date: string; existing?: PlannedWorkout } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start]);
  const from = ymd(days[0]);
  const to = ymd(days[6]);

  const load = useCallback(async () => {
    setError(null);
    const [p, a] = await Promise.all([
      supabase.from("planned_workouts").select("*").gte("date", from).lte("date", to).order("date"),
      supabase
        .from("activities")
        .select("id,start_date,start_date_local,type,name,distance_m,moving_time_s,elevation_gain_m,avg_hr,training_load,avg_speed_ms")
        .gte("start_date", addDays(days[0], -1).toISOString())
        .lte("start_date", addDays(days[6], 2).toISOString())
        .order("start_date"),
    ]);
    if (p.error) setError(p.error.message);
    else if (a.error) setError(a.error.message);
    setPlanned((p.data as PlannedWorkout[]) ?? []);
    setDone(a.data ?? []);
  }, [from, to, days]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function retry(w: PlannedWorkout) {
    setRetrying(w.id);
    const res = await callFunction("intervals-plan", { action: "push", id: w.id });
    setRetrying(null);
    if (res.error) setError(`Übertragung fehlgeschlagen: ${res.error}`);
    load();
  }

  const today = ymd(new Date());
  const doneByDay = (d: string) => done.filter((a) => (a.start_date_local ?? a.start_date).slice(0, 10) === d);
  const plannedByDay = (d: string) => planned.filter((w) => w.date === d);

  const plannedKm = planned.reduce((s, w) => s + (w.planned_distance_m ?? 0), 0);
  const plannedTime = planned.reduce((s, w) => s + (w.planned_duration_s ?? 0), 0);
  const doneRunKm = done
    .filter((a) => isRun(a.type) && (a.start_date_local ?? a.start_date).slice(0, 10) >= from && (a.start_date_local ?? a.start_date).slice(0, 10) <= to)
    .reduce((s, a) => s + (a.distance_m ?? 0), 0);

  const rangeLabel = `${days[0].toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} – ${days[6].toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}`;

  return (
    <div className="week">
      <div className="week-head">
        <div className="week-nav">
          <button className="ghost icon" onClick={() => setStart(addDays(start, -7))} aria-label="Vorige Woche">‹</button>
          <div>
            <div className="week-title">KW {isoWeek(days[0])}</div>
            <div className="muted small">{rangeLabel}</div>
          </div>
          <button className="ghost icon" onClick={() => setStart(addDays(start, 7))} aria-label="Nächste Woche">›</button>
          <button className="ghost small" onClick={() => setStart(weekStart(new Date()))}>Heute</button>
        </div>
        <div className="week-sum">
          <div><span className="muted small">Geplant</span><strong>{plannedKm > 0 ? `${km(plannedKm)} km` : "–"}</strong><span className="muted small">{plannedTime > 0 ? duration(plannedTime) : ""}</span></div>
          <div><span className="muted small">Gelaufen</span><strong>{km(doneRunKm)} km</strong></div>
        </div>
      </div>

      {error && <div className="notice error">{error}</div>}

      <div className="days">
        {days.map((d) => {
          const key = ymd(d);
          const p = plannedByDay(key);
          const a = doneByDay(key);
          return (
            <div key={key} className={`day ${key === today ? "today" : ""} ${key < today ? "past" : ""}`}>
              <div className="day-head">
                <span>{d.toLocaleDateString("de-DE", { weekday: "short" })}</span>
                <span className="muted">{d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</span>
              </div>

              {p.map((w) => (
                <button key={w.id} className="plan-card" onClick={() => setEditor({ date: key, existing: w })}>
                  <span className="plan-sport">{SPORT_LABEL[w.sport] ?? w.sport}</span>
                  <span className="plan-name">{w.name}</span>
                  <span className="plan-meta">
                    {w.planned_distance_m ? `${km(w.planned_distance_m)} km` : ""}
                    {w.planned_distance_m && w.planned_duration_s ? " · " : ""}
                    {w.planned_duration_s ? duration(w.planned_duration_s) : ""}
                  </span>
                  {w.sync_error ? (
                    <span
                      className="sync bad"
                      onClick={(e) => { e.stopPropagation(); retry(w); }}
                      title={w.sync_error}
                    >
                      {retrying === w.id ? "Sende …" : "Nicht auf der Uhr – erneut senden"}
                    </span>
                  ) : w.intervals_event_id ? (
                    <span className="sync ok">✓ an Intervals</span>
                  ) : (
                    <span className="sync">wartet</span>
                  )}
                </button>
              ))}

              {a.map((x) => (
                <div key={x.id} className="done-card">
                  <span className={`tag ${isRun(x.type) ? "run" : ""}`}>{TYPE_LABEL[x.type ?? ""] ?? x.type}</span>
                  <span className="done-name">{x.name}</span>
                  <span className="plan-meta">
                    {x.distance_m ? `${km(x.distance_m, 1)} km · ` : ""}
                    {duration(x.moving_time_s)}
                    {isRun(x.type) ? ` · ${pace(x.distance_m, x.moving_time_s)}` : ""}
                  </span>
                </div>
              ))}

              <button className="add" onClick={() => setEditor({ date: key })}>+ Einheit</button>
            </div>
          );
        })}
      </div>

      {editor && (
        <WorkoutEditor
          date={editor.date}
          existing={editor.existing}
          onClose={() => setEditor(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
