import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import Login from "./Login";
import Shell from "./Shell";

const OWNER_ID = "d3cb85e2-30e3-415d-9b7e-f03d49b53d78";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <div className="center muted">Lädt …</div>;
  if (session && session.user.id !== OWNER_ID) {
    return (
      <div className="center">
        <div className="login-card" style={{ display: "grid", gap: 12 }}>
          <p>Dieser Bereich ist privat.</p>
          <a href={import.meta.env.BASE_URL + "crew.html"}><button>Zum Runcrew-Kalender</button></a>
          <button className="link-btn" onClick={() => supabase.auth.signOut()}>Abmelden</button>
        </div>
      </div>
    );
  }
  return session ? <Shell session={session} /> : <Login />;
}
