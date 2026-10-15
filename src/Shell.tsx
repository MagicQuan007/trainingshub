import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { callFunction } from "./supabase";
import Today from "./Today";
import Training from "./Training";
import Placeholder from "./Placeholder";
import Coach from "./Coach";
import Fuel from "./Fuel";
import Settings from "./Settings";
import { IconCoach, IconFuel, IconGear, IconRace, IconSync, IconToday, IconTraining } from "./icons";

type Tab = "heute" | "training" | "coach" | "race" | "fuel";

const TABS: { key: Tab; label: string; icon: JSX.Element }[] = [
  { key: "heute", label: "Heute", icon: <IconToday /> },
  { key: "training", label: "Training", icon: <IconTraining /> },
  { key: "coach", label: "Coach", icon: <IconCoach /> },
  { key: "race", label: "Race", icon: <IconRace /> },
  { key: "fuel", label: "Fuel", icon: <IconFuel /> },
];

const fromHash = (): Tab => {
  const h = location.hash.replace("#", "") as Tab;
  return TABS.some((t) => t.key === h) ? h : "heute";
};

export default function Shell({ session }: { session: Session }) {
  const [tab, setTab] = useState<Tab>(fromHash);
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [settings, setSettings] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const autoSynced = useRef(false);

  async function sync(days = 14, silent = false) {
    setSyncing(true);
    if (!silent) setNotice(null);
    const { data, error } = await callFunction<{ synced: number; wellness: number; wellness_error: string | null }>(
      "intervals-sync",
      { days },
    );
    setSyncing(false);
    if (error) setNotice({ kind: "error", text: `Sync fehlgeschlagen: ${error}` });
    else if (!silent) {
      setNotice({
        kind: data?.wellness_error ? "error" : "ok",
        text: `${data?.synced ?? 0} Aktivitäten, ${data?.wellness ?? 0} Tageswerte synchronisiert` +
          (data?.wellness_error ? ` (Tageswerte: ${data.wellness_error})` : ""),
      });
    }
    setRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    if (autoSynced.current) return;
    autoSynced.current = true;
    sync(14, true);
  }, []);

  useEffect(() => {
    const onHash = () => setTab(fromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function go(t: Tab) {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="shell with-nav">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Trainingshub
        </div>
        <div className="topbar-actions">
          <button className={`ghost icon ${syncing ? "spin" : ""}`} onClick={() => sync(30)} disabled={syncing} aria-label="Synchronisieren" title="Synchronisieren">
            <IconSync size={18} />
          </button>
          <button className="ghost icon" onClick={() => setSettings(true)} aria-label="Einstellungen" title="Einstellungen">
            <IconGear size={18} />
          </button>
        </div>
      </header>

      {notice && (
        <div className={`notice ${notice.kind}`} onClick={() => setNotice(null)}>
          {notice.text}
        </div>
      )}

      <main>
        {tab === "heute" && <Today refreshKey={refreshKey} onGoTraining={() => go("training")} />}
        {tab === "training" && <Training refreshKey={refreshKey} onImport={() => sync(365)} syncing={syncing} />}
        {tab === "coach" && <Coach refreshKey={refreshKey} />}
        {tab === "race" && (
          <Placeholder
            icon={<IconRace size={28} />}
            title="Race"
            intro="Rennen durchplanen, bevor du an der Startlinie stehst."
            items={[
              "Strecke & Höhenprofil (GPX), Pacing pro Abschnitt",
              "Wetter am Renntag zur Startzeit, Trink- und Salzbedarf",
              "Verpflegungsplan aus deinem Fuel-Schrank: was, wann, wie viel Kohlenhydrate",
            ]}
          />
        )}
        {tab === "fuel" && <Fuel />}
      </main>

      <nav className="bottom-nav" aria-label="Hauptnavigation">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? "on" : ""} onClick={() => go(t.key)} aria-current={tab === t.key ? "page" : undefined}>
            <span className="nav-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {settings && <Settings session={session} onClose={() => setSettings(false)} onSync={(d) => sync(d)} syncing={syncing} />}
    </div>
  );
}
