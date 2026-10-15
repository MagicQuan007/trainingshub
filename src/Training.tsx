import { useState } from "react";
import Week from "./Week";
import Dashboard from "./Dashboard";

type Props = { refreshKey: number; onImport: () => void; syncing: boolean };

export default function Training({ refreshKey, onImport, syncing }: Props) {
  const [view, setView] = useState<"week" | "stats">("week");
  return (
    <div className="training">
      <div className="seg sub-tabs">
        <button className={view === "week" ? "on" : ""} onClick={() => setView("week")}>Woche</button>
        <button className={view === "stats" ? "on" : ""} onClick={() => setView("stats")}>Statistik</button>
      </div>
      {view === "week" ? (
        <Week refreshKey={refreshKey} />
      ) : (
        <Dashboard refreshKey={refreshKey} onImport={onImport} syncing={syncing} />
      )}
    </div>
  );
}
