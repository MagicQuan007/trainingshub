import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import Login from "./Login";
import Shell from "./Shell";

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
  return session ? <Shell session={session} /> : <Login />;
}
