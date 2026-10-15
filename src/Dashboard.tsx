import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, type Activity } from "./supabase";
import { dayLabel, duration, isRun, km, pace, TYPE_LABEL, weekStart } from "./format";

const WEEKS = 8;

type Props = { refreshKey: number; onImport: () => void; syncing: boolean };

export default function Dashboard({ refreshKey, onImport, syncing }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 120 * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from("activities")
      .select("id,start_date,start_date_local,type,name,distance_m,moving_time_s,elevation_gain_m,avg_hr,training_load,avg_speed_ms")
      .gte("start_date", since)
      .order("start_date", { ascending: false });
    setError(error ? error.message : null);
    setActivities(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const weeks = useMemo(() => {
    const thisWeek = weekStart(new Date());
    const buckets = Array.from({ length: WEEKS }, (_, i) => {
      const start = new Date(thisWeek);
      start.setDate(start.getDate() - (WEEKS - 1 - i) * 7);
      return { start, km: 0, load: 0, runs: 0 };
    });
    for (const a of activities) {
      const ws = weekStart(new Date(a.start_date)).getTime();
      const b = buckets.find((x) => x.start.getTime() === ws);
      if (!b) continue;
      b.load += a.training_load ?? 0;
      if (isRun(a.type)) {
        b.km += (a.distance_m ?? 0) / 1000;
        b.runs += 1;
      }
    }
    return buckets;
  }, [activities]);

  const current = weeks[weeks.length - 1];
  const prev = weeks[weeks.length - 2];
  const maxKm = Math.max(10, ...weeks.map((w) => w.km));
  const avg4 = weeks.slice(-5, -1).reduce((s, w) => s + w.km, 0) / 4;

  return (
    <>
      {error && <div className="notice error">{error}</div>}

      <section className="stats">
        <Stat label="Diese Woche" value={`${km(current.km * 1000)} km`} sub={`${current.runs} Läufe · Load ${current.load}`} />
        <Stat label="Letzte Woche" value={`${km(prev.km * 1000)} km`} sub={`${prev.runs} Läufe · Load ${prev.load}`} />
        <Stat label="Ø 4 Wochen" value={`${km(avg4 * 1000)} km`} sub="Laufumfang pro Woche" />
      </section>

      <section className="card">
        <h2>Laufumfang pro Woche</h2>
        <div className="bars" role="img" aria-label="Kilometer pro Woche der letzten 8 Wochen">
          {weeks.map((w, i) => (
            <div className="bar-col" key={w.start.toISOString()}>
              <span className="bar-value">{w.km >= 0.05 ? Math.round(w.km) : ""}</span>
              <div className={`bar ${i === weeks.length - 1 ? "current" : ""}`} style={{ height: `${(w.km / maxKm) * 100}%` }} />
              <span className="bar-label">{w.start.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Aktivitäten</h2>
        {loading ? (
          <p className="muted">Lädt …</p>
        ) : activities.length === 0 ? (
          <div className="empty">
            <p className="muted">Noch keine Aktivitäten gespeichert.</p>
            <button onClick={onImport} disabled={syncing}>Letztes Jahr importieren</button>
          </div>
        ) : (
          <ul className="list">
            {activities.slice(0, 40).map((a) => (
              <li key={a.id} className="row">
                <div className="row-main">
                  <span className={`tag ${isRun(a.type) ? "run" : ""}`}>{TYPE_LABEL[a.type ?? ""] ?? a.type ?? "–"}</span>
                  <div>
                    <div className="row-title">{a.name ?? "Ohne Titel"}</div>
                    <div className="row-sub">{dayLabel(a.start_date_local ?? a.start_date)}</div>
                  </div>
                </div>
                <div className="row-metrics">
                  <Metric v={a.distance_m ? `${km(a.distance_m, 2)} km` : "–"} l="Distanz" />
                  <Metric v={duration(a.moving_time_s)} l="Zeit" />
                  <Metric v={isRun(a.type) ? pace(a.distance_m, a.moving_time_s) : "–"} l="Pace" />
                  <Metric v={a.avg_hr ? `${a.avg_hr}` : "–"} l="Ø HF" />
                  <Metric v={a.training_load != null ? `${a.training_load}` : "–"} l="Load" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

function Metric({ v, l }: { v: string; l: string }) {
  return (
    <div className="metric">
      <span className="metric-v">{v}</span>
      <span className="metric-l">{l}</span>
    </div>
  );
}
