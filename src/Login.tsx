import { useState, type FormEvent } from "react";
import { supabase } from "./supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false, // nur bereits angelegte Nutzer dürfen rein
        emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
      },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else {
      setState("sent");
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
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="du@beispiel.de"
            />
            <button type="submit" disabled={state === "sending"}>
              {state === "sending" ? "Sende …" : "Login-Link schicken"}
            </button>
            {state === "error" && <p className="error">{message}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
