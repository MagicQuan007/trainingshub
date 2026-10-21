import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { callFunction, supabase } from "./supabase";
import type { FuelProduct } from "./fuel";
import { TOLERANCE } from "./fuel";
import {
  ensureSeedRaces, ensureCourseProfiles, syncRacesOnce, clockAt, computeSplits, fetchRaceWeather, fetchTerrain, fmtHMS, fmtPaceS, gainLoss, hydration, parseGpx, planFuel,
  type Race as RaceT, type RaceSettings, type RaceWeather, type FuelStep, type Profile,
} from "./race";
import { carbGuidance } from "./fuel";

const parseHMS = (s: string) => {
  const p = s.trim().split(":").map(Number);
  if (p.some((x) => !Number.isFinite(x))) return null;
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 3600 + p[1] * 60;
  return null;
};

export default function Race() {
  const [races, setRaces] = useState<RaceT[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [products, setProducts] = useState<FuelProduct[]>([]);
  const [weight, setWeight] = useState(75);
  const [weather, setWeather] = useState<RaceWeather | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [edit, setEdit] = useState<RaceT | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    await ensureSeedRaces(supabase);
    await ensureCourseProfiles(supabase);
    syncRacesOnce(supabase, callFunction);
    const { data } = await supabase.from("races").select("*").order("date");
    const list = (data as RaceT[]) ?? [];
    setRaces(list);
    setSelId((cur) => cur ?? list.find((r) => r.date >= new Date().toISOString().slice(0, 10))?.id ?? list[0]?.id ?? null);
    const [p, w] = await Promise.all([
      supabase.from("fuel_products").select("*").order("name"),
      supabase.from("wellness").select("weight").not("weight", "is", null).order("date", { ascending: false }).limit(1),
    ]);
    setProducts((p.data as FuelProduct[]) ?? []);
    if (w.data?.[0]?.weight) setWeight(w.data[0].weight);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const race = races.find((r) => r.id === selId) ?? null;
  const st: RaceSettings = race?.settings ?? {};
  const target = st.targetTimeS ?? Math.round((race?.distance_km ?? 10) * 330);
  const segKm = (race?.distance_km ?? 0) > 45 ? 5 : 1;
  const splits = useMemo(() => (race ? computeSplits(race, target, segKm) : []), [race, target, segKm]);

  useEffect(() => {
    if (!race) return;
    setWeather(undefined);
    fetchRaceWeather(race, target).then(setWeather).catch(() => setWeather(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [race?.id, race?.date, race?.lat, race?.start_time]);

  const hyd = hydration(weather?.tempMax ?? null);
  const guide = carbGuidance(target / 60);
  const settings = {
    ...st,
    carbRate: st.carbRate ?? Math.min(guide.range[1], target > 2 * 3600 ? 70 : 60),
    fluidMlH: st.fluidMlH ?? hyd.fluid,
  };

  const drinks = products.filter((p) => (p.kind === "drink" || p.kind === "electrolyte") && p.tolerance !== "schlecht");
  const gels = products.filter((p) => ["gel", "chew", "bar", "food"].includes(p.kind) && (p.carbs_g ?? 0) > 0 && p.tolerance !== "schlecht");
  const boosters = products.filter((p) => (p.caffeine_mg ?? 0) > 0 && (p.carbs_g ?? 0) < 5);

  // Standardauswahl, falls noch nichts gewählt: gut vertragene Produkte
  const effective = {
    ...settings,
    drinkId: settings.drinkId === undefined ? drinks[0]?.id ?? null : settings.drinkId,
    gelIds: settings.gelIds ?? gels.filter((g) => g.tolerance !== "mittel").slice(0, 2).map((g) => g.id),
    boosterId: settings.boosterId ?? null,
  };
  const plan = useMemo(() => (race ? planFuel(target, splits, products, effective, weight) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [race, target, splits, products, weight, JSON.stringify(effective)]);

  function patchSettings(patch: Partial<RaceSettings>) {
    if (!race) return;
    const next = { ...race.settings, ...patch };
    setRaces((rs) => rs.map((r) => (r.id === race.id ? { ...r, settings: next } : r)));
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const { error } = await supabase.from("races").update({ settings: next, updated_at: new Date().toISOString() }).eq("id", race.id);
      if (error) setMsg({ kind: "error", text: error.message });
    }, 600);
  }

  async function saveProfile(id: string, profile: Profile, extra: Record<string, unknown> = {}) {
    const { gain, loss } = gainLoss(profile.points);
    const { error } = await supabase.from("races").update({
      profile, gain_m: gain, loss_m: loss, ...extra, updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw new Error(error.message);
    return { gain, loss };
  }

  /** Geländehöhen holen und als aktive Quelle setzen; GPS-Höhen bleiben zum Umschalten erhalten */
  async function withTerrain(p: Profile): Promise<Profile> {
    const dem = await fetchTerrain(p.coords!, p.step);
    return { ...p, dem, points: dem, source: "dem" };
  }

  async function onGpx(file: File) {
    if (!race) return;
    setMsg(null);
    setBusy(true);
    try {
      const g = parseGpx(await file.text());
      let profile = g.profile;
      let note = "";
      try {
        profile = await withTerrain(profile);
      } catch {
        note = " – Geländehöhen gerade nicht abrufbar, GPS-Höhen verwendet";
      }
      const gps = gainLoss(g.profile.points);
      const { gain, loss } = await saveProfile(race.id, profile, { distance_km: g.distanceKm, lat: g.start.lat, lon: g.start.lon });
      setMsg({
        kind: "ok",
        text: profile.source === "dem"
          ? `GPX geladen: ${g.distanceKm} km · Gelände +${gain} / −${loss} Hm (GPS-Datei: +${gps.gain} / −${gps.loss})`
          : `GPX geladen: ${g.distanceKm} km, +${gain} / −${loss} Hm${note}`,
      });
      load();
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function setSource(src: "gps" | "dem") {
    if (!race?.profile) return;
    setMsg(null);
    setBusy(true);
    try {
      let p = race.profile;
      if (src === "dem" && !p.dem) p = await withTerrain({ ...p, gps: p.gps ?? p.points });
      else p = { ...p, gps: p.gps ?? p.points, points: src === "dem" ? p.dem! : (p.gps ?? p.points), source: src };
      const { gain, loss } = await saveProfile(race.id, p);
      setMsg({ kind: "ok", text: `${src === "dem" ? "Geländehöhen" : "GPS-Höhen"} aktiv: +${gain} / −${loss} Hm` });
      load();
    } catch (e) {
      setMsg({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Lädt …</p>;

  return (
    <div className="race">
      <div className="chips">
        {races.map((r) => (
          <button key={r.id} className={`chip ${r.id === selId ? "on" : ""}`} onClick={() => setSelId(r.id)}>{r.name}</button>
        ))}
        <button className="chip" onClick={() => setEdit("new")}>+ Rennen</button>
      </div>

      {msg && <div className={`notice ${msg.kind}`} onClick={() => setMsg(null)}>{msg.text}</div>}

      {!race ? (
        <section className="card empty"><p className="muted">Noch kein Rennen angelegt.</p></section>
      ) : (
        <>
          {/* Kopf */}
          <section className="card race-head">
            <div className="card-head">
              <div>
                <h2 className="race-title">{race.name}</h2>
                <span className="muted small">
                  {new Date(race.date + "T12:00:00").toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  {race.start_time ? ` · Start ${race.start_time.slice(0, 5)}` : ""}
                </span>
              </div>
              <button className="ghost icon" onClick={() => setEdit(race)} aria-label="Rennen bearbeiten">✎</button>
            </div>
            <div className="race-stats">
              <Stat l="Distanz" v={`${race.distance_km.toLocaleString("de-DE")} km`} />
              <Stat l="Höhenmeter" v={`+${race.gain_m ?? "–"} / −${race.loss_m ?? "–"}`} />
              <div className="rstat">
                <span className="muted small">Zielzeit</span>
                <input
                  className="mono target"
                  defaultValue={fmtHMS(target)}
                  key={race.id + target}
                  onBlur={(e) => { const v = parseHMS(e.target.value); if (v && v > 600) patchSettings({ targetTimeS: v }); else e.target.value = fmtHMS(target); }}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  aria-label="Zielzeit"
                />
              </div>
              <Stat l="Ø Pace" v={`${fmtPaceS(target / race.distance_km)} /km`} />
              <Stat l="Zieleinlauf" v={race.start_time ? `~${clockAt(race.start_time, target)} Uhr` : "–"} />
            </div>
            {race.notes && <p className="muted small">{race.notes}</p>}
          </section>

          {/* Profil */}
          <section className="card">
            <div className="card-head">
              <h2>Strecke & Pacing</h2>
              <button className="ghost small" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? "Lädt …" : race.profile ? "GPX ersetzen" : "GPX hochladen"}</button>
              <input ref={fileRef} type="file" accept=".gpx,application/gpx+xml" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onGpx(f); }} />
            </div>
            {race.profile && (
              race.profile.coords ? (
                <div className="elev-src">
                  <span className="muted small">Höhen:</span>
                  <div className="seg">
                    <button className={race.profile.source === "dem" ? "on" : ""} disabled={busy} onClick={() => race.profile!.source !== "dem" && setSource("dem")}>Gelände</button>
                    <button className={race.profile.source !== "dem" ? "on" : ""} disabled={busy} onClick={() => race.profile!.source === "dem" && setSource("gps")}>GPS-Datei</button>
                  </div>
                  <span className="muted small">{race.profile.source === "dem" ? "Copernicus-Höhenmodell – unabhängig vom Uhren-/GPS-Rauschen" : "Höhen wie in der Datei aufgezeichnet"}</span>
                </div>
              ) : (
                <p className="hint small">Lade die GPX-Datei einmal neu hoch, dann können die Höhen mit dem Geländemodell korrigiert werden.</p>
              )
            )}
            {race.profile ? (
              <ProfileChart race={race} steps={plan?.steps ?? []} />
            ) : (
              <p className="hint small">Ohne GPX wird das Tempo gleichmäßig verteilt. Lade den Track hoch (z. B. von der Veranstalter-Seite, Komoot oder Strava), dann wird das Tempo je nach Steigung angepasst und das Höhenprofil angezeigt.</p>
            )}
            <div className="splits-wrap">
              <table className="splits">
                <thead><tr><th>km</th><th>Hm</th><th>Pace</th><th>Abschnitt</th><th>Gesamt</th><th>Uhr</th></tr></thead>
                <tbody>
                  {splits.map((s) => (
                    <tr key={s.km} className={s.paceS > target / race.distance_km * 1.12 ? "slow" : s.paceS < target / race.distance_km * 0.9 ? "fast" : ""}>
                      <td>{segKm === 1 ? s.km : `${Math.round(s.fromKm)}–${Math.round(s.toKm)}`}</td>
                      <td className="muted">{race.profile ? `+${s.gainM}/−${s.lossM}` : "–"}</td>
                      <td className="mono">{fmtPaceS(s.paceS)}</td>
                      <td className="mono muted">{fmtHMS(s.timeS).replace(/^0:/, "")}</td>
                      <td className="mono">{fmtHMS(s.cumS)}</td>
                      <td className="mono muted">{race.start_time ? clockAt(race.start_time, s.cumS) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted small">Tempo nach Steigung verteilt (gleicher Aufwand, Energiekosten nach Minetti 2002). Bergab ist der Vorteil begrenzt – dort locker laufen lassen, nicht bremsen, aber auch nicht jagen.</p>
          </section>

          {/* Wetter */}
          <section className="card">
            <h2>Wetter am Renntag</h2>
            {weather === undefined ? (
              <p className="muted small">Lädt …</p>
            ) : weather === null ? (
              <p className="muted small">Kein Wetter verfügbar (Startort fehlt – GPX hochladen).</p>
            ) : (
              <>
                <div className="race-stats">
                  <Stat l="Start" v={`${Math.round(weather.tempStart)} °C`} />
                  <Stat l="Max" v={`${Math.round(weather.tempMax)} °C`} />
                  <Stat l="Luftfeuchte" v={`${Math.round(weather.humidity)} %`} />
                  <Stat l="Wind" v={`${Math.round(weather.wind)} km/h`} />
                  {weather.rainChance != null ? <Stat l="Regen" v={`${weather.rainChance} %`} /> : <Stat l="Niederschlag" v={`${(weather.precipMm ?? 0).toFixed(1)} mm`} />}
                </div>
                <p className="muted small">
                  {weather.kind === "forecast" ? "Vorhersage (Open-Meteo)." : `Noch keine Vorhersage – Durchschnitt der letzten ${weather.years} Jahre am gleichen Tag zur Rennzeit. Ab 2 Wochen vorher zeigt die App die echte Vorhersage.`}
                  {" "}Empfehlung: ~{hyd.fluid} ml und ~{hyd.sodium} mg Natrium pro Stunde.
                  {weather.tempMax >= 20 ? " Bei Wärme Zielzeit um 1–3 % lockern." : ""}
                </p>
              </>
            )}
          </section>

          {/* Verpflegung */}
          <section className="card">
            <h2>Verpflegungsplan</h2>
            <div className="fuel-setup">
              <label className="field">
                <span>Kohlenhydrate: <strong>{settings.carbRate} g/h</strong> <em className="muted">(Empfehlung {guide.range[0]}–{guide.range[1]})</em></span>
                <input type="range" min={30} max={100} step={5} value={settings.carbRate} onChange={(e) => patchSettings({ carbRate: Number(e.target.value) })} />
              </label>
              <label className="field">
                <span>Trinken: <strong>{settings.fluidMlH} ml/h</strong></span>
                <input type="range" min={250} max={1000} step={50} value={settings.fluidMlH} onChange={(e) => patchSettings({ fluidMlH: Number(e.target.value) })} />
              </label>
            </div>

            {products.length === 0 ? (
              <p className="hint small">Dein Verpflegungsschrank ist leer – unter Fuel → Sport-Verpflegung Produkte anlegen.</p>
            ) : (
              <div className="fuel-pick">
                <div>
                  <span className="muted small">Getränk</span>
                  <div className="chips">
                    <button className={`chip ${!effective.drinkId ? "on" : ""}`} onClick={() => patchSettings({ drinkId: null })}>Nur Wasser</button>
                    {drinks.map((d) => (
                      <button key={d.id} className={`chip ${effective.drinkId === d.id ? "on" : ""}`} onClick={() => patchSettings({ drinkId: d.id })}>{d.name}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="muted small">Gels & Co.</span>
                  <div className="chips">
                    {gels.map((g) => {
                      const on = effective.gelIds.includes(g.id);
                      return (
                        <button key={g.id} className={`chip ${on ? "on" : ""}`} onClick={() => patchSettings({ gelIds: on ? effective.gelIds.filter((x) => x !== g.id) : [...effective.gelIds, g.id] })}>
                          {g.name}{g.tolerance ? <span className={`tol ${TOLERANCE[g.tolerance]?.tone}`}> ●</span> : null}
                        </button>
                      );
                    })}
                    {gels.length === 0 && <span className="muted small">Keine Gels im Schrank.</span>}
                  </div>
                </div>
                {boosters.length > 0 && (
                  <div>
                    <span className="muted small">Koffein vor dem Start</span>
                    <div className="chips">
                      <button className={`chip ${!effective.boosterId ? "on" : ""}`} onClick={() => patchSettings({ boosterId: null })}>Keins</button>
                      {boosters.map((b) => (
                        <button key={b.id} className={`chip ${effective.boosterId === b.id ? "on" : ""}`} onClick={() => patchSettings({ boosterId: b.id })}>{b.name} ({b.caffeine_mg} mg)</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {plan && (
              <>
                <div className="race-stats fuel-totals">
                  <Stat l="KH gesamt" v={`${plan.totals.carbs} g`} />
                  <Stat l="KH/h" v={`${plan.carbsPerHour} g`} tone={Math.abs(plan.carbsPerHour - settings.carbRate) <= 8 ? "ok" : "warn"} />
                  <Stat l="Natrium" v={`${plan.totals.sodium} mg`} />
                  <Stat l="Flüssigkeit" v={`${(plan.totals.fluidMl / 1000).toFixed(1)} l`} />
                  <Stat l="Koffein" v={`${plan.totals.caffeine} mg`} />
                </div>
                {plan.warnings.map((w) => <p key={w} className="hint small">{w}</p>)}

                <ol className="timeline">
                  {plan.steps.map((s, i) => (
                    <li key={i} className={`tl-${s.kind}`}>
                      <span className="tl-time mono">{s.tS < 0 ? `${fmtHMS(s.tS).replace(/^−0:/, "−")}` : fmtHMS(s.tS).replace(/^0:/, "")}</span>
                      <span className="tl-km mono muted">{s.tS >= 0 ? `km ${s.km.toFixed(1)}` : race.start_time ? clockAt(race.start_time, s.tS) : ""}</span>
                      <span className="tl-label">{s.label}</span>
                      <span className="tl-meta muted small">{[s.carbs ? `${s.carbs} g KH` : "", s.caffeine ? `${s.caffeine} mg Koffein` : ""].filter(Boolean).join(" · ")}</span>
                    </li>
                  ))}
                  <li className="tl-info">
                    <span className="tl-time mono">{fmtHMS(target).replace(/^0:/, "")}</span>
                    <span className="tl-km mono muted">Ziel</span>
                    <span className="tl-label">Innerhalb 1 h: Kohlenhydrate + Protein (z. B. Kakao, Brötchen), viel trinken</span>
                  </li>
                </ol>

                {plan.pack.length > 0 && (
                  <div className="pack">
                    <h3>Packliste</h3>
                    <ul>{plan.pack.map((p) => <li key={p.name}><span className="mono">{p.count}×</span> {p.name}</li>)}</ul>
                    {settings.aidStations !== false && <p className="muted small">Mit Verpflegungsstellen kannst du Wasser unterwegs nachfüllen – Pulver portioniert mitnehmen.</p>}
                  </div>
                )}
              </>
            )}
            <p className="muted small">Grundlage: 60–90 g KH/h bei Belastungen &gt; 2 h, Glukose + Fruktose für hohe Mengen (Jeukendrup 2014); Koffein 3–6 mg/kg (ISSN 2021). Alles vorher in langen Läufen testen – am Renntag nichts Neues.</p>
          </section>
        </>
      )}

      {edit && (
        <RaceForm
          existing={edit === "new" ? undefined : edit}
          onClose={() => setEdit(null)}
          onSaved={(id) => { if (id) setSelId(id); load(); }}
        />
      )}
    </div>
  );
}

function Stat({ l, v, tone }: { l: string; v: string; tone?: string }) {
  return (
    <div className={`rstat ${tone ?? ""}`}>
      <span className="muted small">{l}</span>
      <strong className="mono">{v}</strong>
    </div>
  );
}

function ProfileChart({ race, steps }: { race: RaceT; steps: FuelStep[] }) {
  const p = race.profile!;
  const W = 800, H = 180, padL = 36, padB = 22, padT = 10;
  const min = Math.min(...p.points), max = Math.max(...p.points);
  const span = Math.max(50, max - min);
  const totalKm = ((p.points.length - 1) * p.step) / 1000;
  const x = (km: number) => padL + (km / totalKm) * (W - padL - 6);
  const y = (e: number) => padT + (1 - (e - min) / span) * (H - padT - padB);
  const line = p.points.map((e, i) => `${i ? "L" : "M"}${x((i * p.step) / 1000).toFixed(1)},${y(e).toFixed(1)}`).join(" ");
  const area = `${line} L${x(totalKm)},${H - padB} L${x(0)},${H - padB} Z`;
  const tick = totalKm > 45 ? 10 : 5;
  const ticks = Array.from({ length: Math.floor(totalKm / tick) + 1 }, (_, i) => i * tick);
  const eleAt = (km: number) => p.points[Math.min(p.points.length - 1, Math.round((km * 1000) / p.step))];
  const gels = steps.filter((s) => s.kind === "gel");
  return (
    <svg className="profile" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Höhenprofil ${race.name}`}>
      <path d={area} className="pf-area" />
      <path d={line} className="pf-line" />
      {ticks.map((k) => (
        <g key={k}>
          <line x1={x(k)} x2={x(k)} y1={padT} y2={H - padB} className="pf-grid" />
          <text x={x(k)} y={H - 6} className="pf-label" textAnchor="middle">{k} km</text>
        </g>
      ))}
      <text x={4} y={y(max) + 4} className="pf-label">{Math.round(max)} m</text>
      <text x={4} y={y(min)} className="pf-label">{Math.round(min)} m</text>
      {gels.map((g, i) => (
        <g key={i}>
          <circle cx={x(g.km)} cy={y(eleAt(g.km)) - 8} r={5} className={g.caffeine ? "pf-gel caf" : "pf-gel"} />
          <title>{`km ${g.km.toFixed(1)}: ${g.label}`}</title>
        </g>
      ))}
    </svg>
  );
}

function RaceForm({ existing, onClose, onSaved }: { existing?: RaceT; onClose: () => void; onSaved: (id?: string) => void }) {
  const [f, setF] = useState({
    name: existing?.name ?? "",
    date: existing?.date ?? "",
    start: existing?.start_time?.slice(0, 5) ?? "",
    km: existing ? String(existing.distance_km) : "",
    gain: existing?.gain_m != null ? String(existing.gain_m) : "",
    loss: existing?.loss_m != null ? String(existing.loss_m) : "",
    notes: existing?.notes ?? "",
  });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function save() {
    const km = Number(f.km.replace(",", "."));
    if (!f.name.trim() || !f.date || !(km > 0)) return setErr("Name, Datum und Distanz sind Pflicht");
    const row = {
      name: f.name.trim(), date: f.date, start_time: f.start || null, distance_km: km,
      gain_m: f.gain ? Number(f.gain) : null, loss_m: f.loss ? Number(f.loss) : null, notes: f.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const res = existing
      ? await supabase.from("races").update(row).eq("id", existing.id).select("id").single()
      : await supabase.from("races").insert(row).select("id").single();
    if (res.error) return setErr(res.error.message);
    onSaved(res.data?.id);
    onClose();
  }

  async function remove() {
    if (!existing || !confirm(`„${existing.name}“ löschen?`)) return;
    const { error } = await supabase.from("races").delete().eq("id", existing.id);
    if (error) return setErr(error.message);
    onSaved();
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal narrow" role="dialog" aria-modal="true" aria-label="Rennen">
        <div className="modal-head">
          <h2>{existing ? "Rennen bearbeiten" : "Neues Rennen"}</h2>
          <button className="ghost icon" onClick={onClose} aria-label="Schließen">✕</button>
        </div>
        <div className="modal-body">
          <label className="field"><span>Name</span><input value={f.name} onChange={set("name")} /></label>
          <div className="grid-fuel">
            <label className="field"><span>Datum</span><input type="date" value={f.date} onChange={set("date")} /></label>
            <label className="field"><span>Startzeit</span><input type="time" value={f.start} onChange={set("start")} /></label>
            <label className="field"><span>Distanz (km)</span><input inputMode="decimal" value={f.km} onChange={set("km")} /></label>
            <label className="field"><span>Höhenmeter +</span><input inputMode="numeric" value={f.gain} onChange={set("gain")} /></label>
            <label className="field"><span>Höhenmeter −</span><input inputMode="numeric" value={f.loss} onChange={set("loss")} /></label>
          </div>
          <label className="field"><span>Notizen</span><textarea rows={2} value={f.notes} onChange={set("notes")} /></label>
          <p className="muted small">Startort und genaues Profil kommen aus der GPX-Datei.</p>
          {err && <p className="error">{err}</p>}
        </div>
        <div className="modal-foot">
          {existing && !existing.key ? <button className="ghost danger" onClick={remove}>Löschen</button> : <span />}
          <button onClick={save}>Speichern</button>
        </div>
      </div>
    </div>
  );
}
