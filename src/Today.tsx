import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, type Activity } from "./supabase";
import { addDays, ymd } from "./dates";
import { duration, isRun, km, pace, TYPE_LABEL, weekStart } from "./format";
import { SPORTS, type PlannedWorkout } from "./workout";
import { fetchHours, getPlace, runTips, weatherIcon, type Hour } from "./weather";
import WorkoutEditor from "./WorkoutEditor";
import CheckInCard from "./CheckInCard";
import MealsToday from "./MealsToday";

type Wellness = {
  date: string;
  ctl: number | null;
  atl: number | null;
  resting_hr: number | null;
  hrv: number | null;
  sleep_secs: number | null;
  sleep_score: number | null;
  weight: number | null;
};

const SPORT_LABEL = Object.fromEntries(SPORTS.map((s) => [s.value, s.label]));

function avg(xs: (number | null)[]) {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

function formLabel(tsb: number) {
  if (tsb > 5) return { text: "Frisch", tone: "ok" };
  if (tsb >= -10) return { text: "Ausgeglichen", tone: "ok" };
  if (tsb >= -30) return { text: "Im Training", tone: "warn" };
  return { text: "Hohe Ermüdung", tone: "bad" };
}

export default function Today({ refreshKey, onGoTraining, onGoFuel }: { refreshKey: number; onGoTraining: () => void; onGoFuel: () => void }) {
  const now = new Date();
  const today = ymd(now);
  const ws = weekStart(now);
  const weekFrom = ymd(ws);
  const weekTo = ymd(addDays(ws, 6));

  const [plannedToday, setPlannedToday] = useState<PlannedWorkout[]>([]);
  const [weekPlanned, setWeekPlanned] = useState<PlannedWorkout[]>([]);
  const [weekDone, setWeekDone] = useState<Activity[]>([]);
  const [wellness, setWellness] = useState<Wellness[]>([]);
  const [hours, setHours] = useState<Hour[]>([]);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ existing?: PlannedWorkout } | null>(null);
  const place = getPlace();

  const load = useCallback(async () => {
    const [p, a, w] = await Promise.all([
      supabase.from("planned_workouts").select("*").gte("date", weekFrom).lte("date", weekTo).order("date"),
      supabase
        .from("activities")
        .select("id,start_date,start_date_local,type,name,distance_m,moving_time_s,elevation_gain_m,avg_hr,training_load,avg_speed_ms")
        .gte("start_date", addDays(ws, -1).toISOString())
        .order("start_date", { ascending: false }),
      supabase
        .from("wellness")
        .select("date,ctl,atl,resting_hr,hrv,sleep_secs,sleep_score,weight")
        .gte("date", ymd(addDays(now, -8)))
        .order("date", { ascending: false }),
    ]);
    const planned = (p.data as PlannedWorkout[]) ?? [];
    setWeekPlanned(planned);
    setPlannedToday(planned.filter((x) => x.date === today));
    setWeekDone((a.data ?? []).filter((x) => (x.start_date_local ?? x.start_date).slice(0, 10) >= weekFrom));
    setWellness((w.data as Wellness[]) ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, weekFrom, weekTo]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    fetchHours(place)
      .then(setHours)
      .catch((e) => setWeatherError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wetter: ab jetzt bis 22 Uhr, alle 2 Stunden
  const upcoming = useMemo(() => {
    const h = now.getHours();
    return hours.filter((x) => x.time.slice(0, 10) === today && Number(x.time.slice(11, 13)) >= h && Number(x.time.slice(11, 13)) <= 22);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hours, today]);
  const strip = upcoming.filter((_, i) => i % 2 === 0).slice(0, 7);
  const tips = runTips(upcoming);

  // Wellness
  const latest = wellness[0];
  const todayW = wellness.find((w) => w.date === today) ?? latest;
  const prev7 = wellness.filter((w) => w.date !== todayW?.date).slice(0, 7);
  const hrvAvg = avg(prev7.map((w) => w.hrv));
  const rhrAvg = avg(prev7.map((w) => w.resting_hr));
  const tsb = latest?.ctl != null && latest?.atl != null ? latest.ctl - latest.atl : null;
  const form = tsb != null ? formLabel(tsb) : null;

  // Woche
  const plannedKm = weekPlanned.reduce((s, w) => s + (w.planned_distance_m ?? 0), 0) / 1000;
  const doneKm = weekDone.filter((a) => isRun(a.type)).reduce((s, a) => s + (a.distance_m ?? 0), 0) / 1000;
  const pct = plannedKm > 0 ? Math.min(100, (doneKm / plannedKm) * 100) : 0;
  const lastRun = weekDone[0];

  const greeting = now.getHours() < 11 ? "Guten Morgen" : now.getHours() < 18 ? "Hallo" : "Guten Abend";

  return (
    <div className="today">
      <div className="today-head">
        <h1>{greeting}</h1>
        <p className="muted">{now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}</p>
      </div>

      <CheckInCard
        today={today}
        planned={plannedToday}
        hrv={{ today: todayW?.date === today ? todayW.hrv : null, avg: hrvAvg }}
        rhr={{ today: todayW?.date === today ? todayW.resting_hr : null, avg: rhrAvg }}
        onChanged={load}
      />

      {/* Heute geplant */}
      <section className="card">
        <div className="card-head">
          <h2>Heute</h2>
          <button className="ghost small" onClick={() => setEditor({})}>+ Einheit</button>
        </div>
        {plannedToday.length === 0 ? (
          <p className="muted">Keine Einheit geplant – Ruhetag oder freies Training.</p>
        ) : (
          <div className="today-plans">
            {plannedToday.map((w) => (
              <button key={w.id} className="plan-card big" onClick={() => setEditor({ existing: w })}>
                <span className="plan-sport">{SPORT_LABEL[w.sport] ?? w.sport}</span>
                <span className="plan-name">{w.name}</span>
                <span className="plan-meta">
                  {w.planned_distance_m ? `${km(w.planned_distance_m)} km` : ""}
                  {w.planned_distance_m && w.planned_duration_s ? " · " : ""}
                  {w.planned_duration_s ? duration(w.planned_duration_s) : ""}
                </span>
                {w.description && <pre className="plan-steps">{w.description}</pre>}
                {w.notes && <span className="muted small">{w.notes}</span>}
              </button>
            ))}
          </div>
        )}
      </section>

      <MealsToday refreshKey={refreshKey} onOpen={() => { try { localStorage.setItem("th.fuelView", "meals"); } catch { /* ignore */ } onGoFuel(); }} />

      <div className="today-grid">
        {/* Körper & Form */}
        <section className="card">
          <h2>Körper & Form</h2>
          {!latest ? (
            <p className="muted small">Noch keine Werte – einmal oben auf Sync tippen.</p>
          ) : (
            <div className="kv">
              <KV
                label="Schlaf"
                value={todayW?.sleep_secs ? duration(todayW.sleep_secs) : "–"}
                sub={todayW?.sleep_score ? `Score ${Math.round(todayW.sleep_score)}` : ""}
              />
              <KV
                label="HRV"
                value={todayW?.hrv ? `${Math.round(todayW.hrv)} ms` : "–"}
                sub={todayW?.hrv && hrvAvg ? delta(todayW.hrv, hrvAvg, false) : ""}
              />
              <KV
                label="Ruhepuls"
                value={todayW?.resting_hr ? `${todayW.resting_hr}` : "–"}
                sub={todayW?.resting_hr && rhrAvg ? delta(todayW.resting_hr, rhrAvg, true) : ""}
              />
              <KV
                label="Form"
                value={tsb != null ? `${tsb > 0 ? "+" : ""}${Math.round(tsb)}` : "–"}
                sub={form?.text ?? ""}
                tone={form?.tone}
              />
              <KV label="Fitness" value={latest.ctl != null ? `${Math.round(latest.ctl)}` : "–"} sub="CTL" />
              <KV label="Ermüdung" value={latest.atl != null ? `${Math.round(latest.atl)}` : "–"} sub="ATL" />
            </div>
          )}
        </section>

        {/* Wetter */}
        <section className="card">
          <h2>Wetter · {place.name}</h2>
          {weatherError ? (
            <p className="muted small">{weatherError}</p>
          ) : strip.length === 0 ? (
            <p className="muted small">Für heute keine Stunden mehr.</p>
          ) : (
            <>
              <div className="wx-strip">
                {strip.map((h) => (
                  <div key={h.time} className="wx">
                    <span className="muted small">{h.time.slice(11, 13)} Uhr</span>
                    <span className="wx-icon">{weatherIcon(h.code)}</span>
                    <strong>{Math.round(h.temp)}°</strong>
                    <span className="muted small">{h.rain}% · {Math.round(h.wind)} km/h</span>
                  </div>
                ))}
              </div>
              {tips.length > 0 && (
                <ul className="tips">
                  {tips.map((t) => <li key={t}>{t}</li>)}
                </ul>
              )}
            </>
          )}
        </section>
      </div>

      {/* Woche */}
      <section className="card clickable" onClick={onGoTraining}>
        <div className="card-head">
          <h2>Diese Woche</h2>
          <span className="muted small">Zum Wochenplan ›</span>
        </div>
        <div className="progress-row">
          <strong className="mono">{km(doneKm * 1000)} km</strong>
          <span className="muted">{plannedKm > 0 ? `von ${km(plannedKm * 1000)} km geplant` : "gelaufen"}</span>
        </div>
        {plannedKm > 0 && (
          <div className="progress"><div style={{ width: `${pct}%` }} /></div>
        )}
        {lastRun && (
          <p className="muted small">
            Zuletzt: {TYPE_LABEL[lastRun.type ?? ""] ?? lastRun.type} „{lastRun.name}“ ·{" "}
            {lastRun.distance_m ? `${km(lastRun.distance_m)} km · ` : ""}
            {duration(lastRun.moving_time_s)}
            {isRun(lastRun.type) ? ` · ${pace(lastRun.distance_m, lastRun.moving_time_s)}` : ""}
          </p>
        )}
      </section>

      {editor && (
        <WorkoutEditor date={today} existing={editor.existing} onClose={() => setEditor(null)} onSaved={load} />
      )}
    </div>
  );
}

function delta(value: number, average: number, lowerIsBetter: boolean) {
  const d = ((value - average) / average) * 100;
  if (Math.abs(d) < 3) return "≈ Ø 7 Tage";
  const better = lowerIsBetter ? d < 0 : d > 0;
  return `${d > 0 ? "▲" : "▼"} ${Math.abs(Math.round(d))}% ${better ? "besser" : "schlechter"} als Ø`;
}

function KV({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className={`kv-item ${tone ?? ""}`}>
      <span className="muted small">{label}</span>
      <strong className="mono">{value}</strong>
      {sub && <span className="kv-sub">{sub}</span>}
    </div>
  );
}
