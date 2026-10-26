import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { ymd } from "./dates";
import { weekStart } from "./format";
import { byId } from "./recipes";
import { DAY_LABEL, dayTotals, type MealPlan } from "./nutrition";
import { ensureDetoxPlans } from "./detoxPlan";
import { DETOX_ID } from "./detox-recipes";

/** Kompakte Übersicht „Essen heute“ für das Briefing */
export default function MealsToday({ refreshKey, onOpen }: { refreshKey: number; onOpen: () => void }) {
  const [plan, setPlan] = useState<MealPlan | null | undefined>(undefined);
  const today = ymd(new Date());

  useEffect(() => {
    ensureDetoxPlans()
      .then(() => supabase.from("meal_plans").select("plan").eq("week_start", ymd(weekStart(new Date()))).maybeSingle())
      .then(({ data }) => setPlan((data?.plan as MealPlan) ?? null));
  }, [refreshKey]);

  if (plan === undefined) return null;
  const day = plan?.days.find((d) => d.date === today);

  return (
    <section className="card clickable" onClick={onOpen}>
      <div className="card-head">
        <h2>Essen heute</h2>
        <span className="muted small">Zum Essensplan ›</span>
      </div>
      {!day ? (
        <p className="muted small">Noch kein Essensplan für diese Woche – unter Fuel → Essensplan erstellen.</p>
      ) : (
        <>
          <p className="small">
            {plan?.program === DETOX_ID && <><strong>Detox</strong> · </>}<strong>{DAY_LABEL[day.type]}</strong> · Ziel {day.targets.kcal} kcal · {day.targets.carbs} g KH · {day.targets.protein} g Protein
            <span className="muted"> (Plan: {Math.round(dayTotals(day).kcal)} kcal)</span>
          </p>
          <ul className="today-meals">
            {day.meals.map((m, i) => byId[m.id] && (
              <li key={i} className={byId[m.id].addon && m.slot !== "kids" ? "addon" : ""}><span className="muted small">{byId[m.id].addon && m.slot !== "kids" ? "" : m.slot === "breakfast" ? "Früh" : m.slot === "lunch" ? "Mittag" : m.slot === "dinner" ? "Abend" : m.slot === "kids" ? "Kinder" : "Snack"}</span> {byId[m.id].name}{m.mult !== 1 ? ` ×${m.mult}` : ""}{m.tag === "cook" ? (m.days === 2 ? " · heute für 2 Tage kochen" : " · heute kochen") : m.tag === "rest" ? " · Reste" : ""}</li>
            ))}
          </ul>
          {day.note && <p className="hint small">{day.note}</p>}
        </>
      )}
    </section>
  );
}
