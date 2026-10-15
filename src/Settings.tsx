import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { getPlace, setPlace } from "./weather";

type Props = { session: Session; onClose: () => void; onSync: (days: number) => void; syncing: boolean };

export default function Settings({ session, onClose, onSync, syncing }: Props) {
  const [place, setPlaceState] = useState(getPlace());
  const [locMsg, setLocMsg] = useState<string | null>(null);

  function useLocation() {
    if (!navigator.geolocation) return setLocMsg("Standort wird von diesem Browser nicht unterstützt");
    setLocMsg("Ermittle Standort …");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: Math.round(pos.coords.latitude * 100) / 100, lon: Math.round(pos.coords.longitude * 100) / 100, name: "Mein Standort" };
        setPlace(p);
        setPlaceState(p);
        setLocMsg("Gespeichert – gilt ab dem nächsten Öffnen von „Heute“");
      },
      () => setLocMsg("Standort nicht freigegeben"),
      { timeout: 10_000 },
    );
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal narrow" role="dialog" aria-modal="true" aria-label="Einstellungen">
        <div className="modal-head">
          <h2>Einstellungen</h2>
          <button className="ghost icon" onClick={onClose} aria-label="Schließen">✕</button>
        </div>
        <div className="modal-body">
          <div className="setting">
            <div>
              <strong>Daten aus Intervals</strong>
              <p className="muted small">Aktivitäten, Schlaf, HRV und Form werden beim Öffnen automatisch für 14 Tage geholt.</p>
            </div>
            <div className="chips">
              <button className="ghost small" disabled={syncing} onClick={() => onSync(30)}>30 Tage syncen</button>
              <button className="ghost small" disabled={syncing} onClick={() => onSync(365)}>1 Jahr importieren</button>
            </div>
          </div>

          <div className="setting">
            <div>
              <strong>Ort fürs Wetter</strong>
              <p className="muted small">Aktuell: {place.name} ({place.lat}, {place.lon})</p>
            </div>
            <button className="ghost small" onClick={useLocation}>Aktuellen Standort verwenden</button>
            {locMsg && <p className="muted small">{locMsg}</p>}
          </div>

          <div className="setting">
            <div>
              <strong>Konto</strong>
              <p className="muted small">{session.user.email}</p>
            </div>
            <button className="ghost small danger" onClick={() => supabase.auth.signOut()}>Abmelden</button>
          </div>
        </div>
      </div>
    </div>
  );
}
