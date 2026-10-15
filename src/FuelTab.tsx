import { useState } from "react";
import MealPlan from "./MealPlan";
import Fuel from "./Fuel";

export default function FuelTab() {
  const [view, setView] = useState<"meals" | "sport">(() => (localStorageGet("th.fuelView") === "sport" ? "sport" : "meals"));
  function go(v: "meals" | "sport") {
    setView(v);
    try { localStorage.setItem("th.fuelView", v); } catch { /* ignore */ }
  }
  return (
    <div className="training">
      <div className="seg sub-tabs">
        <button className={view === "meals" ? "on" : ""} onClick={() => go("meals")}>Essensplan</button>
        <button className={view === "sport" ? "on" : ""} onClick={() => go("sport")}>Sport-Verpflegung</button>
      </div>
      {view === "meals" ? <MealPlan /> : <Fuel />}
    </div>
  );
}

function localStorageGet(k: string) {
  try { return localStorage.getItem(k); } catch { return null; }
}
