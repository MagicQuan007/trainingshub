import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { addDays, parseYmd, ymd } from "./dates";
import { weekStart } from "./format";
import { byId, type Slot } from "./recipes";
import { ensureDetoxPlans } from "./detoxPlan";
import { DETOX_FROM, DETOX_ID, DETOX_TO } from "./detox-recipes";
import {
  CAT_ORDER, DAY_LABEL, DEFAULT_PROFILE, applyDetox, dayTotals, generatePlan, nextAlternative, shoppingList,
  type MealPlan as Plan, type NutritionProfile,
} from "./nutrition";
import type { PlannedWorkout } from "./workout";

const SLOT_LABEL: Record<Slot, string> = { breakfast: "Frühstück", lunch: "Mittag", dinner: "Abendessen (Familie)", snack: "Snack", kids: "Kinder abends" };
const DETOX_LABEL: Partial<Record<Slot, string>> = { breakfast: "Morgens · Smoothie", lunch: "Mittags · warm", dinner: "Abends · Salat" };
const fmtDm = (iso: string) => parseYmd(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

export default function MealPlan() {
  const [profile, setProfile] = useState<NutritionProfile | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [start, setStart] = useState(() => weekStart(new Date()));
  const [plan, setPlan] = useState<Plan | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [showShop, setShowShop] = useState(false);
  const ws = ymd(start);

  const loadProfile = useCallback(async () => {
    const [st, w] = await Promise.all([
      supabase.from("user_settings").select("nutrition").maybeSingle(),
      supabase.from("wellness").select("weight").not("weight", "is", null).order("date", { ascending: false }).limit(1),
    ]);
    const saved = st.data?.nutrition as NutritionProfile | null;
    const latestWeight = w.data?.[0]?.weight as number | undefined;
    if (saved) setProfile({ ...DEFAULT_PROFILE, ...saved, weightKg: latestWeight ?? saved.weightKg });
    else {
      setProfile({ ...DEFAULT_PROFILE, weightKg: latestWeight ?? DEFAULT_PROFILE.weightKg });
      setNeedsProfile(true);
    }
  }, []);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    await ensureDetoxPlans();
    const { data } = await supabase.from("meal_plans").select("plan,checked").eq("week_start", ws).maybeSingle();
    setPlan((data?.plan as Plan) ?? null);
    setChecked((data?.checked as Record<string, boolean>) ?? {});
    setLoading(false);
  }, [ws]);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => { loadPlan(); }, [loadPlan]);

  async function savePlan(p: Plan, c = checked) {
    setPlan(p);
    const { error } = await supabase.from("meal_plans").upsert({ week_start: ws, plan: p, checked: c, updated_at: new Date().toISOString() });
    if (error) setMsg(error.message);
  }

  async function create() {
    if (!profile) return;
    if (plan && !confirm("Plan für diese Woche neu erstellen? Getauschte Gerichte gehen verloren.")) return;
    setBusy(true);
    setMsg(null);
    const to = ymd(addDays(start, 6));
    const { data } = await supabase.from("planned_workouts").select("*").gte("date", ws).lte("date", to);
    const by: Record<string, PlannedWorkout[]> = {};
    for (const w of (data as PlannedWorkout[]) ?? []) (by[w.date] ??= []).push(w);
    if (!data?.length) setMsg("Für diese Woche ist noch kein Training geplant – Ziele basieren auf Ruhetagen. Tipp: erst im Coach die Woche übernehmen.");
    const p = applyDetox(generatePlan(ws, by, profile), by, profile);
    setChecked({});
    await savePlan(p, {});
    setBusy(false);
  }

  function swap(dayIdx: number, mealIdx: number) {
    if (!plan) return;
    const days = plan.days.map((d) => ({ ...d, meals: d.meals.map((m) => ({ ...m })) }));
    const m = days[dayIdx].meals[mealIdx];
    const cur = byId[m.id];
    const used = cur.prog
      ? new Set(days.flatMap((d) => d.meals.filter((x) => x.slot === m.slot).map((x) => x.id)))
      : new Set(days.flatMap((d) => d.meals.filter((x) => x.slot === "dinner").map((x) => x.id)));
    const oldId = m.id;
    m.id = nextAlternative(cur, used).id;
    // Mittagessen für 2 Tage: Restetag mittauschen
    if (m.tag === "cook") {
      const nm = days[dayIdx + 1]?.meals.find((x) => x.slot === "lunch" && x.id === oldId && x.tag === "rest");
      if (nm) nm.id = m.id;
    } else if (m.tag === "rest") {
      const pm = days[dayIdx - 1]?.meals.find((x) => x.slot === "lunch" && x.id === oldId && x.tag === "cook");
      if (pm) pm.id = m.id;
    }
    savePlan({ ...plan, days });
  }

  async function toggle(key: string) {
    const c = { ...checked, [key]: !checked[key] };
    setChecked(c);
    await supabase.from("meal_plans").update({ checked: c }).eq("week_start", ws);
  }

  const shop = useMemo(() => (plan && profile ? shoppingList(plan, profile) : null), [plan, profile]);
  const today = ymd(new Date());

  if (needsProfile && profile) {
    return <ProfileForm initial={profile} onSaved={(p) => { setProfile(p); setNeedsProfile(false); }} />;
  }

  return (
    <div className="mealplan">
      <div className="week-head">
        <div className="week-nav">
          <button className="ghost icon" onClick={() => setStart(addDays(start, -7))} aria-label="Vorige Woche">‹</button>
          <div>
            <div className="week-title">Essensplan</div>
            <div className="muted small">{start.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })} – {addDays(start, 6).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</div>
          </div>
          <button className="ghost icon" onClick={() => setStart(addDays(start, 7))} aria-label="Nächste Woche">›</button>
        </div>
        <div className="chips">
          <button className="ghost small" onClick={() => setNeedsProfile(true)}>Profil</button>
          <button className={plan ? "ghost small" : "small"} onClick={create} disabled={busy}>{busy ? "Plane …" : plan ? "Neu erstellen" : "Essensplan erstellen"}</button>
        </div>
      </div>

      {msg && <div className="notice" onClick={() => setMsg(null)}>{msg}</div>}

      {plan?.program === DETOX_ID && (
        <section className="card detox-banner">
          <strong>Detox-Phase {fmtDm(DETOX_FROM)} – {fmtDm(DETOX_TO)}</strong>
          <p className="small">Morgens Smoothie + Skyr/Haferflocken · mittags warm, immer für 2 Tage gekocht · abends Salat mit Eiweiß. Kinder bekommen abends etwas Sättigendes, an harten und langen Tagen isst du davon mit.</p>
        </section>
      )}

      {loading ? (
        <p className="muted">Lädt …</p>
      ) : !plan ? (
        <section className="card empty">
          <p className="muted">Noch kein Plan für diese Woche. Der Plan richtet sich nach deinen geplanten Einheiten: mehr Kohlenhydrate an harten und langen Tagen, leichtes Defizit nur an Ruhe-/lockeren Tagen.</p>
        </section>
      ) : (
        <>
          <div className="meal-days">
            {plan.days.map((d, di) => {
              const t = dayTotals(d);
              return (
                <section key={d.date} className={`card meal-day ${d.date === today ? "today" : ""}`}>
                  <div className="card-head">
                    <div>
                      <strong>{parseYmd(d.date).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit" })}</strong>
                      <span className={`day-type t-${d.type}`}>{DAY_LABEL[d.type]}</span>
                    </div>
                    <span className="mono small">{d.targets.kcal} kcal</span>
                  </div>
                  {d.note && <p className="hint small">{d.note}</p>}
                  <ul className="meals">
                    {d.meals.map((m, mi) => {
                      const r = byId[m.id];
                      if (!r) return null;
                      const key = `${d.date}-${mi}`;
                      const slotLabel = r.prog && !r.addon ? (DETOX_LABEL[m.slot] ?? SLOT_LABEL[m.slot]) : r.addon && m.slot !== "kids" ? "" : SLOT_LABEL[m.slot];
                      const portions = (profile?.adults ?? 2) * (m.days ?? 1);
                      return (
                        <li key={key} className={`meal ${r.addon ? "addon" : ""} ${m.slot === "kids" ? "kids" : ""}`}>
                          <button className="meal-main" onClick={() => setOpen(open === key ? null : key)}>
                            <span className="meal-slot muted">{slotLabel}</span>
                            <span className="meal-name">
                              {r.name}{m.mult !== 1 && <em> ×{m.mult}</em>}
                              {r.page && r.page !== "Buch" && <span className="muted small"> · {r.page}</span>}
                              {m.tag === "cook" && <span className="meal-tag cook">Kochtag{m.days === 2 ? " · für 2 Tage" : ""}</span>}
                              {m.tag === "rest" && <span className="meal-tag rest">Reste von gestern</span>}
                            </span>
                            {m.slot !== "kids" && <span className="mono small muted">{Math.round(r.kcal * m.mult)} kcal · {Math.round(r.carbs * m.mult)} g KH · {Math.round(r.protein * m.mult)} g P</span>}
                          </button>
                          {m.slot !== "snack" && !r.addon && m.tag !== "rest" && <button className="ghost icon" onClick={() => swap(di, mi)} title="Anderes Gericht" aria-label="Gericht tauschen">↻</button>}
                          {open === key && (
                            <div className="meal-detail">
                              <span className="muted small">{r.min} min · {r.type === "veg" ? "vegetarisch" : r.type === "fish" ? "Fisch" : "Fleisch"}{r.prep ? " · Meal Prep" : ""}{r.page ? ` · Kochbuch ${r.page}` : ""}</span>
                              {m.tag === "cook" && <p className="small"><strong>Heute {portions} Portionen kochen</strong> ({profile?.adults ?? 2} Erwachsene × {m.days ?? 1} {m.days === 2 ? "Tage" : "Tag"}) – Zutaten unten mal {portions}.</p>}
                              {m.tag === "rest" && <p className="small">Reste vom Kochtag aufwärmen (Reis/Quinoa richtig heiß).</p>}
                              <ul>{r.ing.map((i) => <li key={i.n}>{fmtQ(i.q * m.mult)} {i.u} {i.n}</li>)}</ul>
                              {r.prog ? <p className="muted small">{m.slot === "kids" ? "Mengen pro Kind." : r.serves === "me" ? "Nur für dich." : "Mengen pro Portion – die Einkaufsliste rechnet alle Erwachsenen mit ein."}</p>
                                : m.slot === "dinner" && <p className="muted small">Mengen für deine Portion – die Einkaufsliste rechnet die Familie mit ein.</p>}
                              {r.tip && <p className="small">💡 {r.tip}</p>}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="macro-bars">
                    <Bar label="kcal" v={t.kcal} target={d.targets.kcal} />
                    <Bar label="KH" v={t.carbs} target={d.targets.carbs} unit="g" />
                    <Bar label="Protein" v={t.protein} target={d.targets.protein} unit="g" />
                    <Bar label="Fett" v={t.fat} target={d.targets.fat} unit="g" />
                  </div>
                </section>
              );
            })}
          </div>

          <section className="card">
            <div className="card-head">
              <h2>Einkaufsliste (Familie)</h2>
              <button className="ghost small" onClick={() => setShowShop(!showShop)}>{showShop ? "Einklappen" : "Anzeigen"}</button>
            </div>
            {showShop && shop && (
              <div className="shop">
                {CAT_ORDER.filter((c) => shop[c]?.length).map((c) => (
                  <div key={c}>
                    <h3>{c}</h3>
                    <ul>
                      {shop[c].map((it) => (
                        <li key={it.key} className={checked[it.key] ? "done" : ""}>
                          <label>
                            <input type="checkbox" checked={!!checked[it.key]} onChange={() => toggle(it.key)} />
                            <span className="mono">{fmtQ(it.q)} {it.u}</span> {it.n}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {plan.program === DETOX_ID
                  ? <p className="muted small">Detox: Smoothies, Mittagessen und Salate mit Eiweiß für {profile?.adults} Erwachsene, Kinderbeilagen für {profile?.kids} Kinder, Skyr und Trainings-Extras nur für dich. Gewürze (Curry, Kreuzkümmel, Zimt …), Salz und Öl-Grundvorrat nicht enthalten.</p>
                  : <p className="muted small">Abendessen für {profile?.adults} Erwachsene + {profile?.kids} Kinder, Frühstück/Mittag/Snacks nur für dich. Gewürze, Salz und Öl-Grundvorrat nicht enthalten.</p>}
              </div>
            )}
          </section>
        </>
      )}

      <section className="card">
        <details className="science">
          <summary><h2>Warum so? Die Wissenschaft dahinter</h2></summary>
          <ul>
            <li><strong>Kohlenhydrate nach Belastung</strong> („fuel for the work“): 3 g/kg an Ruhetagen bis 7 g/kg an langen Tagen, plus Extra am Vortag langer Läufe (ACSM/IOC Position Stand, Thomas et al. 2016; Impey et al. 2018).</li>
            <li><strong>Abnehmen ohne Leistungsverlust:</strong> Defizit (~400 kcal) nur an Ruhe-, Kraft- und lockeren Tagen. Harte und lange Tage sind voll versorgt – das schützt vor niedriger Energieverfügbarkeit (RED-S, IOC-Konsens 2023). Ziel: max. ~0,5 kg pro Woche.</li>
            <li><strong>Protein 2,0 g/kg</strong> im Defizit erhält die Muskulatur (Helms et al. 2014; ISSN 2017), verteilt auf mehrere Mahlzeiten.</li>
            <li><strong>Nach harten/langen Einheiten:</strong> Kohlenhydrate + Protein innerhalb von 1–2 h beschleunigen die Erholung.</li>
            <li>Nährwerte sind gerundete Richtwerte pro Portion. Bei Beschwerden oder Vorerkrankungen: ärztlich bzw. mit einer Ernährungsfachkraft abklären.</li>
          </ul>
        </details>
      </section>
    </div>
  );
}

function fmtQ(q: number) {
  return Number.isInteger(q) ? String(q) : q.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

function Bar({ label, v, target, unit = "" }: { label: string; v: number; target: number; unit?: string }) {
  const pct = target > 0 ? (v / target) * 100 : 0;
  const tone = pct < 85 ? "low" : pct > 115 ? "high" : "ok";
  return (
    <div className={`mbar ${tone}`}>
      <span className="muted small">{label}</span>
      <div className="mbar-track"><div style={{ width: `${Math.min(100, pct)}%` }} /></div>
      <span className="mono small">{Math.round(v)}{unit} / {target}{unit}</span>
    </div>
  );
}

function ProfileForm({ initial, onSaved }: { initial: NutritionProfile; onSaved: (p: NutritionProfile) => void }) {
  const [p, setP] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const num = (k: keyof NutritionProfile) => (e: React.ChangeEvent<HTMLInputElement>) => setP({ ...p, [k]: Number(e.target.value.replace(",", ".")) || 0 });
  async function save() {
    if (!(p.weightKg > 30 && p.heightCm > 120 && p.age > 10)) return setErr("Bitte Gewicht, Größe und Alter prüfen");
    const { error } = await supabase.from("user_settings").upsert({ nutrition: p, updated_at: new Date().toISOString() });
    if (error) return setErr(error.message);
    onSaved(p);
  }
  return (
    <section className="card profile-form">
      <h2>Dein Ernährungsprofil</h2>
      <p className="muted small">Wird nur in deiner Datenbank gespeichert. Das Gewicht wird automatisch aus Intervals/Garmin übernommen, sobald dort Werte vorliegen.</p>
      <div className="grid-fuel">
        <label className="field"><span>Gewicht (kg)</span><input inputMode="decimal" value={p.weightKg || ""} onChange={num("weightKg")} /></label>
        <label className="field"><span>Größe (cm)</span><input inputMode="numeric" value={p.heightCm || ""} onChange={num("heightCm")} /></label>
        <label className="field"><span>Alter</span><input inputMode="numeric" value={p.age || ""} onChange={num("age")} /></label>
        <label className="field"><span>Erwachsene im Haushalt</span><input inputMode="numeric" value={p.adults} onChange={num("adults")} /></label>
        <label className="field"><span>Kinder</span><input inputMode="numeric" value={p.kids} onChange={num("kids")} /></label>
        <label className="field"><span>Fisch pro Woche</span><input inputMode="numeric" value={p.fishPerWeek} onChange={num("fishPerWeek")} /></label>
        <label className="field"><span>Fleisch pro Woche</span><input inputMode="numeric" value={p.meatPerWeek} onChange={num("meatPerWeek")} /></label>
      </div>
      <div className="chips">
        <span className="muted small">Ziel:</span>
        <button className={`chip ${p.goal === "lose" ? "on" : ""}`} onClick={() => setP({ ...p, goal: "lose" })}>Leicht abnehmen</button>
        <button className={`chip ${p.goal === "maintain" ? "on" : ""}`} onClick={() => setP({ ...p, goal: "maintain" })}>Gewicht halten</button>
      </div>
      {err && <p className="error">{err}</p>}
      <button onClick={save}>Speichern</button>
    </section>
  );
}
