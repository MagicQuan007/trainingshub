import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import Calendar from "./Calendar";

export type Member = { user_id: string; name: string; status: "pending" | "approved" | "admin" | "blocked" };

const ERR: Record<string, string> = {
  "Invalid login credentials": "E-Mail oder Passwort falsch",
  "User already registered": "Diese E-Mail ist schon registriert – bitte anmelden",
  "Signups not allowed for this instance": "Registrierung ist gerade geschlossen – bitte Merlin Bescheid geben",
  "Password should be at least 6 characters.": "Passwort muss mindestens 6 Zeichen haben",
};
const msgOf = (m: string) => ERR[m] ?? m;

export default function CrewApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Member | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadMe = useCallback(async () => {
    if (!session) return setMe(undefined);
    const { data } = await supabase.from("crew_members").select("user_id,name,status").eq("user_id", session.user.id).maybeSingle();
    setMe((data as Member) ?? null);
  }, [session]);

  useEffect(() => { loadMe(); }, [loadMe]);

  if (!ready) return <div className="center muted">Lädt …</div>;
  if (!session) return <Auth />;
  if (me === undefined) return <div className="center muted">Lädt …</div>;

  if (!me || me.status === "pending" || me.status === "blocked") {
    return (
      <main className="login">
        <div className="login-card crew-wait">
          <Brand />
          {me?.status === "blocked" ? (
            <p className="muted">Dein Zugang ist gesperrt.</p>
          ) : (
            <>
              <h2>Fast geschafft{me?.name ? `, ${me.name}` : ""}!</h2>
              <p className="muted">Dein Konto wartet auf Freischaltung durch die Crew-Orga. Sobald du freigeschaltet bist, siehst du hier alle Termine.</p>
              <button onClick={loadMe}>Neu prüfen</button>
            </>
          )}
          <button className="link-btn" onClick={() => supabase.auth.signOut()}>Abmelden</button>
        </div>
      </main>
    );
  }

  return <Calendar me={me} onMeChanged={loadMe} />;
}

export function Brand() {
  return (
    <div className="brand crew-brand">
      <span className="brand-mark" />
      <span>Runcrew <em>Oerlinghausen</em></span>
    </div>
  );
}

function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setError(msgOf(error.message));
    } else {
      if (!name.trim()) { setBusy(false); return setError("Bitte deinen Namen angeben"); }
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { name: name.trim() } } });
      if (error) setError(msgOf(error.message));
      else if (!data.session) setInfo("Konto angelegt. Bitte bestätige ggf. die E-Mail und melde dich dann an.");
    }
    setBusy(false);
  }

  return (
    <main className="login">
      <div className="login-card">
        <Brand />
        <p className="muted small" style={{ marginTop: 8 }}>Gemeinsamer Laufkalender: wer läuft wo mit, und wo wollen wir hin?</p>
        <div className="seg" style={{ marginTop: 16 }}>
          <button className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>Anmelden</button>
          <button className={mode === "signup" ? "on" : ""} onClick={() => setMode("signup")}>Registrieren</button>
        </div>
        <form onSubmit={submit}>
          {mode === "signup" && (
            <>
              <label htmlFor="name">Name (so sehen dich die anderen)</label>
              <input id="name" autoComplete="nickname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vorname" />
            </>
          )}
          <label htmlFor="email">E-Mail</label>
          <input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <label htmlFor="pw">Passwort</label>
          <input id="pw" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" disabled={busy}>{busy ? "…" : mode === "login" ? "Anmelden" : "Konto anlegen"}</button>
          {error && <p className="error">{error}</p>}
          {info && <p className="muted small">{info}</p>}
        </form>
      </div>
    </main>
  );
}
