import { useState, type FormEvent } from "react";
import { supabase } from "./supabase";

const ERRORS: Record<string, string> = {
  "Invalid login credentials": "E-Mail oder Passwort falsch",
  "email rate limit exceeded": "Zu viele Mails angefordert – bitte später erneut oder mit Passwort anmelden",
};

export default function Login() {
  const [mode, setMode] = useState<"password" | "link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState("busy");
    const { error } =
      mode === "password"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: {
              shouldCreateUser: false, // nur bereits angelegte Nutzer dürfen rein
              emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
            },
          });
    if (error) {
      setState("error");
      setMessage(ERRORS[error.message] ?? error.message);
    } else {
      setState(mode === "link" ? "sent" : "idle");
    }
  }

  return (
    <main className="login">
      <div className="login-card">
        <div className="brand">
          <span className="brand-mark" />
          Trainingshub
        </div>
        {state === "sent" ? (
          <p className="muted">Link ist unterwegs. Öffne die Mail auf diesem Gerät und tippe auf den Link.</p>
        ) : (
          <form onSubmit={submit}>
            <label htmlFor="email">E-Mail</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="du@beispiel.de"
            />
            {mode === "password" && (
              <>
                <label htmlFor="password">Passwort</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </>
            )}
            <button type="submit" disabled={state === "busy"}>
              {state === "busy" ? "…" : mode === "password" ? "Anmelden" : "Login-Link schicken"}
            </button>
            {state === "error" && <p className="error">{message}</p>}
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setMode(mode === "password" ? "link" : "password");
                setState("idle");
              }}
            >
              {mode === "password" ? "Stattdessen Login-Link per Mail" : "Mit Passwort anmelden"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
