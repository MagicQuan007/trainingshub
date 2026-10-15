import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { callFunction, supabase } from "./supabase";
import Dashboard from "./Dashboard";
import Week from "./Week";

type Tab = "week" | "overview";

export default function Shell({ session }: { session: Session }) {
  const [tab, setTab] = useState<Tab>(() => (location.hash === "#uebersicht" ? "overview" : "week"));
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const autoSynced = useRef(false);

  async function sync(days = 14, silent = false) {
    setSyncing(true);
    if (!silent) setNotice(null);
    const { data, error } = await callFunction<{ synced: number }>("intervals-sync", { days });
    setSyncing(false);
    if (error) setNotice({ kind: "error", text: `Sync fehlgeschlagen: ${error}` });
    else if (!silent) setNotice({ kind: "ok", text: `${data?.synced ?? 0} Aktivitäten synchronisiert` });
    setRefreshKey((k) => k + 1);
  }

  // Beim Öffnen die letzten 14 Tage still nachladen
  useEffect(() => {
    if (autoSynced.current) return;
    autoSynced.current = true;
    sync(14, true);
  }, []);

  function go(t: Tab) {
    setTab(t);
    history.replaceState(null, "", t === "overview" ? "#uebersicht" : "#woche");
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Trainingshub
        </div>
        <nav className="tabs" aria-label="Bereiche">
          <button className={tab === "week" ? "on" : ""} onClick={() => go("week")}>Woche</button>
          <button className={tab === "overview" ? "on" : ""} onClick={() => go("overview")}>Übersicht</button>
        </nav>
        <div className="topbar-actions">
          <button className="ghost" onClick={() => sync(30)} disabled={syncing}>
            {syncing ? "Sync …" : "Sync"}
          </button>
          <button className="ghost" onClick={() => supabase.auth.signOut()} title={session.user.email}>
            Abmelden
          </button>
        </div>
      </header>

      {notice && (
        <div className={`notice ${notice.kind}`} onClick={() => setNotice(null)}>
          {notice.text}
        </div>
      )}

      {tab === "week" ? (
        <Week refreshKey={refreshKey} />
      ) : (
        <Dashboard refreshKey={refreshKey} onImport={() => sync(365)} syncing={syncing} />
      )}
    </div>
  );
}
