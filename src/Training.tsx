import { useState } from "react";
import Week from "./Week";
import Dashboard from "./Dashboard";

type Props = { refreshKey: number; onImport: () => void; syncing: boolean; onGoRace: () => void };

export default function Training({ refreshKey, onImport, syncing, onGoRace }: Props) {
  const [view, setView] = useState<"week" | "stats">("week");
  return (
    <div className="training">
      <div className="seg sub-tabs">
        <button className={view === "week" ? "on" : ""} onClick={() => setView("week")}>Woche</button>
        <button className={view === "stats" ? "on" : ""} onClick={() => setView("stats")}>Statistik</button>
      </div>
      {view === "week" ? (
        <Week refreshKey={refreshKey} onGoRace={onGoRace} />
      ) : (
        <Dashboard refreshKey={refreshKey} onImport={onImport} syncing={syncing} />
      )}
    </div>
  );
}
