import { useCallback, useEffect, useMemo, useState } from "react";
import { callFunction, supabase } from "./supabase";
import { addDays, isoWeek, parseYmd, ymd } from "./dates";
import { duration, km } from "./format";
import {
  DEFAULT_SETTINGS, PHASES, RACES, SEASON, fmtPace, proposeWeek, tidSeconds, weekFor, zones,
  type CoachSettings, type PlanWeek, type Proposal,
} from "./coach";

const ZONE_COLOR: Record<string, string> = { Z1: "var(--run)", Z2: "#f5c04a", Z3: "var(--danger)", Kraft: "#7d8cff" };
const DAY = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export default function Coach({ refreshKey }: { refreshKey: number }) {
  const [settings, setSettings] = useState<CoachSettings>(DEFAULT_SETTINGS);
  const [tid, setTid] = useState<[number, number, number] | null>(null);
  const [weekIdx, setWeekIdx] = useState(() => {
    const cur = weekFor(new Date());
    const i = cur ? SEASON.indexOf(cur) : 0;
    return Math.min(SEASON.length - 1, i + 1); // standardmäßig: nächste Woche
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [editZones, setEditZones] = useState(false);

  const current = weekFor(new Date());
  const selected = SEASON[weekIdx];
  const proposals = useMemo(() => proposeWeek(selected, settings), [selected, settings]);
  const proposedKm = proposals.filter((p) => p.sport === "Run").reduce((s, p) => s + (p.distance_m ?? 0), 0) / 1000;

  const load = useCallback(async () => {
    const [st, acts] = await Promise.all([
      supabase.from("user_settings").select("coach").maybeSingle(),
      supabase.from("activities").select("type,moving_time_s,avg_hr,raw").gte("start_date", addDays(new Date(), -28).toISOString()),
    ]);
    const s = { ...DEFAULT_SETTINGS, ...((st.data?.coach as Partial<CoachSettings>) ?? {}) };
    setSettings(s);
    setTid(tidSeconds(acts.data ?? [], s));
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function adopt() {
    setBusy(true);
    setMsg(null);
    const from = selected.start;
    const to = ymd(addDays(parseYmd(from), 6));
    const { data: existing } = await supabase.from("planned_workouts").select("date,sport").gte("date", from).lte("date", to);
    const taken = new Set((existing ?? []).map((e) => `${e.date}|${e.sport === "WeightTraining" ? "K" : "R"}`));
    const todo = proposals.filter((p) => !taken.has(`${p.date}|${p.sport === "WeightTraining" ? "K" : "R"}`));
    if (todo.length === 0) {
      setBusy(false);
      return setMsg({ kind: "ok", text: "Diese Woche ist schon komplett geplant." });
    }
    const rows = todo.map((p) => ({
      date: p.date,
      sport: p.sport,
      name: p.name,
      structure: p.structure,
      description: p.description,
      notes: p.notes || null,
      planned_distance_m: p.distance_m,
      planned_duration_s: p.duration_s,
    }));
    const ins = await supabase.from("planned_workouts").insert(rows).select("id");
    if (ins.error || !ins.data) {
      setBusy(false);
      return setMsg({ kind: "error", text: ins.error?.message ?? "Speichern fehlgeschlagen" });
    }
    let failed = 0;
    for (const r of ins.data) {
      const res = await callFunction("intervals-plan", { action: "push", id: r.id });
      if (res.error) failed++;
    }
    setBusy(false);
    setMsg(
      failed
        ? { kind: "error", text: `${ins.data.length - failed} Einheiten übertragen, ${failed} fehlgeschlagen – im Wochenplan erneut senden.` }
        : { kind: "ok", text: `${ins.data.length} Einheiten in den Wochenplan übernommen und an Intervals geschickt.` },
    );
  }

  async function saveSettings(s: CoachSettings) {
    const { error } = await supabase.from("user_settings").upsert({ coach: s, updated_at: new Date().toISOString() });
    if (error) return setMsg({ kind: "error", text: error.message });
    setSettings(s);
    setEditZones(false);
    load();
  }

  const tidTotal = tid ? tid[0] + tid[1] + tid[2] : 0;
  const tidPct = tid && tidTotal > 0 ? tid.map((x) => Math.round((x / tidTotal) * 100)) : null;
  const target = current ? PHASES[current.phase].tid : PHASES.base.tid;
  const maxKm = Math.max(...SEASON.map((w) => w.km));
  const today = ymd(new Date());

  return (
    <div className="coach">
      {/* Ziele */}
      <section className="races">
        {RACES.map((r) => {
          const days = Math.ceil((parseYmd(r.date).getTime() - parseYmd(today).getTime()) / 86_400_000);
          return (
            <div key={r.key} className={`race-card ${r.primary ? "primary" : ""}`}>
              <span className="muted small">{r.primary ? "Hauptziel" : "Zweitziel"}</span>
              <strong>{r.name}</strong>
              <span className="muted small">{parseYmd(r.date).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })} · {r.detail}</span>
              <span className="countdown mono">{Math.floor(days / 7)} Wo. {days % 7} T.</span>
            </div>
          );
        })}
      </section>

      {/* Aktuelle Phase + Intensitätsverteilung */}
      <section className="card">
        <div className="card-head">
          <h2>Jetzt: {current ? PHASES[current.phase].name : "–"}{current?.recovery ? " · Entlastung" : ""}</h2>
          {current && <span className="phase-dot" style={{ background: PHASES[current.phase].color }} />}
        </div>
        {current && <p className="muted">{PHASES[current.phase].focus}{current.note ? ` – ${current.note}` : ""}</p>}

        <div className="tid">
          <TidBar label="Soll (Phase)" pct={target} />
          {tidPct ? <TidBar label="Ist (letzte 4 Wochen)" pct={tidPct as [number, number, number]} /> : <p className="muted small">Noch keine Pulsdaten.</p>}
          <div className="tid-legend">
            <span><i style={{ background: ZONE_COLOR.Z1 }} />Z1 locker</span>
            <span><i style={{ background: ZONE_COLOR.Z2 }} />Z2 Schwelle</span>
            <span><i style={{ background: ZONE_COLOR.Z3 }} />Z3 hart</span>
          </div>
          {tidPct && tidPct[1] > target[1] + 8 && (
            <p className="hint">Zu viel Zeit in Z2 („graue Zone“). Lockere Läufe langsamer, harte Einheiten wirklich hart – das ist der Kern des polarisierten Modells.</p>
          )}
        </div>
      </section>

      {/* Wochenvorschlag */}
      <section className="card">
        <div className="card-head">
          <div className="week-nav">
            <button className="ghost icon" onClick={() => setWeekIdx(Math.max(0, weekIdx - 1))} disabled={weekIdx === 0} aria-label="Vorige Woche">‹</button>
            <div>
              <div className="week-title">KW {isoWeek(parseYmd(selected.start))} · {PHASES[selected.phase].name}{selected.recovery ? " · Entlastung" : ""}</div>
              <div className="muted small">
                Ziel {selected.km} km · Vorschlag ≈ {Math.round(proposedKm)} km{selected.note ? ` · ${selected.note}` : ""}
              </div>
            </div>
            <button className="ghost icon" onClick={() => setWeekIdx(Math.min(SEASON.length - 1, weekIdx + 1))} disabled={weekIdx === SEASON.length - 1} aria-label="Nächste Woche">›</button>
          </div>
        </div>

        <ul className="proposals">
          {proposals.map((p, i) => (
            <ProposalRow key={i} p={p} />
          ))}
        </ul>

        {msg && <div className={`notice ${msg.kind}`}>{msg.text}</div>}
        <div className="row-between">
          <span className="muted small">Bereits geplante Tage werden nicht überschrieben.</span>
          <button onClick={adopt} disabled={busy || selected.start < ymd(addDays(parseYmd(today), -6))}>
            {busy ? "Übertrage …" : "Woche übernehmen"}
          </button>
        </div>
      </section>

      {/* Saisonplan */}
      <section className="card">
        <h2>Saisonplan</h2>
        <div className="season" role="img" aria-label="Wochenumfang bis Hermannslauf und Rennsteig">
          {SEASON.map((w, i) => (
            <button
              key={w.start}
              className={`season-col ${current === w ? "now" : ""} ${i === weekIdx ? "sel" : ""}`}
              onClick={() => setWeekIdx(i)}
              title={`KW ${isoWeek(parseYmd(w.start))}: ${PHASES[w.phase].name}, ${w.km} km`}
            >
              <span className="season-km mono">{w.km}</span>
              <span className="season-bar" style={{ height: `${(w.km / maxKm) * 100}%`, background: PHASES[w.phase].color, opacity: w.recovery ? 0.45 : 1 }} />
              <span className="season-kw">{isoWeek(parseYmd(w.start))}</span>
            </button>
          ))}
        </div>
        <div className="phase-legend">
          {(["base", "build", "specific", "taper", "ultra"] as const).map((k) => (
            <span key={k}><i style={{ background: PHASES[k].color }} />{PHASES[k].name} <em>{PHASES[k].tid.join("/")}</em></span>
          ))}
          <span><i style={{ background: "var(--muted)", opacity: 0.45 }} />Entlastung</span>
        </div>
      </section>

      {/* Zonen */}
      <section className="card">
        <div className="card-head">
          <h2>Deine Zonen</h2>
          <button className="ghost small" onClick={() => setEditZones(!editZones)}>{editZones ? "Abbrechen" : "Anpassen"}</button>
        </div>
        {editZones ? (
          <ZoneForm initial={settings} onSave={saveSettings} />
        ) : (
          <table className="zones">
            <thead><tr><th>Zone</th><th>Puls</th><th>Pace</th><th>Wofür</th></tr></thead>
            <tbody>
              {zones(settings).map((z) => (
                <tr key={z.key}><td>{z.name}</td><td className="mono">{z.hr}</td><td className="mono">{z.pace}</td><td className="muted">{z.use}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted small">
          Startwerte aus Garmin (Laktatschwelle {settings.lt2Hr} bpm, Prognose 5 km/HM). LT1 ist geschätzt – genauer wird es mit einem Leistungstest
          (Laktat oder Atemgas) oder einem 30-min-Schwellentest.
        </p>
      </section>

      {/* Wissenschaft */}
      <section className="card">
        <details className="science">
          <summary><h2>Warum so? Die Wissenschaft dahinter</h2></summary>
          <ul>
            <li><strong>3-Zonen-Modell</strong> mit LT1/VT1 und LT2/VT2 als Grenzen – Standard in der Ausdauerforschung (Seiler 2010).</li>
            <li><strong>Polarisiert ≈ 80/5/15</strong>: viel locker, wenig Schwelle, gezielt hart. Kurzfristig gute VO₂max-Zuwächse (Stöggl & Sperlich 2014).</li>
            <li><strong>Polarisiert vs. pyramidal</strong>: Über viele Studien gemittelt kein klarer Sieger (Rosenblat et al., Netzwerk-Metaanalyse 2025). Der beste direkte Vergleich bei Läufern: erst pyramidal, dann polarisiert (je 8 Wo.) brachte die größten Zuwächse (Filipas et al. 2022). Darum: Basis mit etwas mehr Z2, ab Aufbau konsequent polarisiert.</li>
            <li><strong>Spezifität</strong>: Der Hermannslauf wird nahe der Schwelle gelaufen – in der spezifischen Phase kommt deshalb gezielt Renntempo (Z2) dazu.</li>
            <li><strong>Krafttraining schwer</strong> (≤ 5 Wiederholungen, ≥ 10 Wochen) verbessert die Laufökonomie stärker als Sprungtraining (Eihara et al. 2022). Exzentrik für die 710 Hm bergab.</li>
            <li><strong>3:1-Belastungsrhythmus</strong> und Steigerung des Umfangs in kleinen Schritten senken das Verletzungsrisiko.</li>
          </ul>
        </details>
      </section>
    </div>
  );
}

function TidBar({ label, pct }: { label: string; pct: [number, number, number] }) {
  return (
    <div className="tid-row">
      <span className="muted small">{label}</span>
      <div className="tid-bar">
        <div style={{ width: `${pct[0]}%`, background: ZONE_COLOR.Z1 }}>{pct[0] >= 10 ? `${pct[0]}%` : ""}</div>
        <div style={{ width: `${pct[1]}%`, background: ZONE_COLOR.Z2 }}>{pct[1] >= 8 ? `${pct[1]}%` : ""}</div>
        <div style={{ width: `${pct[2]}%`, background: ZONE_COLOR.Z3 }}>{pct[2] >= 8 ? `${pct[2]}%` : ""}</div>
      </div>
    </div>
  );
}

function ProposalRow({ p }: { p: Proposal }) {
  const [open, setOpen] = useState(false);
  const d = parseYmd(p.date);
  return (
    <li className="proposal">
      <button className="proposal-main" onClick={() => setOpen(!open)}>
        <span className="proposal-day">{DAY[(d.getDay() + 6) % 7]} <span className="muted">{d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</span></span>
        <span className="zone-chip" style={{ background: ZONE_COLOR[p.zone] }}>{p.zone}</span>
        <span className="proposal-name">{p.name}</span>
        <span className="plan-meta">
          {p.distance_m ? `${km(p.distance_m)} km` : ""}
          {p.distance_m && p.duration_s ? " · " : ""}
          {p.duration_s ? duration(p.duration_s) : ""}
        </span>
      </button>
      {open && (
        <div className="proposal-detail">
          {p.description && <pre>{p.description}</pre>}
          {p.notes && <p className="muted small">{p.notes}</p>}
        </div>
      )}
    </li>
  );
}

function ZoneForm({ initial, onSave }: { initial: CoachSettings; onSave: (s: CoachSettings) => void }) {
  const [v, setV] = useState({
    lt1Hr: String(initial.lt1Hr),
    lt2Hr: String(initial.lt2Hr),
    lt1Pace: fmtPace(initial.lt1Pace),
    lt2Pace: fmtPace(initial.lt2Pace),
    vo2Pace: fmtPace(initial.vo2Pace),
  });
  const [err, setErr] = useState<string | null>(null);
  const toSec = (s: string) => {
    const m = /^(\d{1,2}):([0-5]\d)$/.exec(s.trim());
    return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
  };
  function submit() {
    const s: CoachSettings = {
      lt1Hr: Number(v.lt1Hr), lt2Hr: Number(v.lt2Hr),
      lt1Pace: toSec(v.lt1Pace), lt2Pace: toSec(v.lt2Pace), vo2Pace: toSec(v.vo2Pace),
    };
    if (Object.values(s).some((x) => !Number.isFinite(x) || x <= 0)) return setErr("Bitte alle Felder ausfüllen (Pace als m:ss)");
    if (s.lt1Hr >= s.lt2Hr) return setErr("LT1-Puls muss unter LT2-Puls liegen");
    if (!(s.lt1Pace > s.lt2Pace && s.lt2Pace > s.vo2Pace)) return setErr("Pace: LT1 langsamer als LT2, LT2 langsamer als 5-km-Tempo");
    onSave(s);
  }
  const F = (k: keyof typeof v, label: string) => (
    <label className="field"><span>{label}</span><input value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></label>
  );
  return (
    <div className="zone-form">
      <div className="grid-zones">
        {F("lt1Hr", "Puls LT1 (bpm)")}
        {F("lt2Hr", "Puls LT2 / Schwelle (bpm)")}
        {F("lt1Pace", "Pace LT1 (/km)")}
        {F("lt2Pace", "Pace LT2 / Schwelle (/km)")}
        {F("vo2Pace", "5-km-Renntempo (/km)")}
      </div>
      {err && <p className="error">{err}</p>}
      <button onClick={submit}>Speichern</button>
    </div>
  );
}

export type { PlanWeek };
