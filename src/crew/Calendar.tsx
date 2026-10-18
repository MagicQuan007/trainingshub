import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { Brand, type Member } from "./CrewApp";
import EventForm, { type CrewEvent } from "./EventForm";

type Rsvp = { event_id: string; user_id: string; status: "going" | "maybe" | "interested"; distance: string | null };
type Tab = "termine" | "wunsch" | "mitglieder";

const KIND: Record<string, string> = { race: "Rennen", group: "Gruppenlauf", other: "Sonstiges" };
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function Calendar({ me, onMeChanged }: { me: Member; onMeChanged: () => void }) {
  const [tab, setTab] = useState<Tab>("termine");
  const [events, setEvents] = useState<CrewEvent[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [form, setForm] = useState<{ existing?: CrewEvent; wish?: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = me.status === "admin";

  const load = useCallback(async () => {
    const [e, r, m] = await Promise.all([
      supabase.from("crew_events").select("*").order("date", { ascending: true, nullsFirst: false }),
      supabase.from("crew_rsvps").select("event_id,user_id,status,distance"),
      supabase.from("crew_members").select("user_id,name,status").order("name"),
    ]);
    if (e.error) setError(e.error.message);
    setEvents((e.data as CrewEvent[]) ?? []);
    setRsvps((r.data as Rsvp[]) ?? []);
    setMembers((m.data as Member[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const nameOf = useMemo(() => Object.fromEntries(members.map((m) => [m.user_id, m.name])), [members]);
  const rsvpsOf = (id: string) => rsvps.filter((r) => r.event_id === id);
  const myRsvp = (id: string) => rsvps.find((r) => r.event_id === id && r.user_id === me.user_id);

  async function setRsvp(ev: CrewEvent, status: Rsvp["status"] | null, distance?: string | null) {
    setError(null);
    const current = myRsvp(ev.id);
    // optimistisch
    setRsvps((rs) => {
      const rest = rs.filter((r) => !(r.event_id === ev.id && r.user_id === me.user_id));
      return status ? [...rest, { event_id: ev.id, user_id: me.user_id, status, distance: distance ?? current?.distance ?? null }] : rest;
    });
    const res = status
      ? await supabase.from("crew_rsvps").upsert({ event_id: ev.id, status, distance: distance ?? current?.distance ?? null, updated_at: new Date().toISOString() }, { onConflict: "event_id,user_id" })
      : await supabase.from("crew_rsvps").delete().eq("event_id", ev.id).eq("user_id", me.user_id);
    if (res.error) { setError(res.error.message); load(); }
  }

  const today = todayStr();
  const fixed = events.filter((e) => !e.wish);
  const upcoming = fixed.filter((e) => (e.date ?? "") >= today);
  const past = fixed.filter((e) => (e.date ?? "") < today).reverse();
  const listed = (showPast ? past : upcoming).filter((e) => !onlyMine || myRsvp(e.id));
  const wishes = events
    .filter((e) => e.wish)
    .map((e) => ({ e, n: rsvpsOf(e.id).length }))
    .sort((a, b) => b.n - a.n || (a.e.date ?? "9999").localeCompare(b.e.date ?? "9999"));
  const pending = members.filter((m) => m.status === "pending");

  // nach Monat gruppieren
  const byMonth = useMemo(() => {
    const groups: { key: string; label: string; items: CrewEvent[] }[] = [];
    for (const e of listed) {
      const d = new Date(e.date + "T12:00:00");
      const key = e.date!.slice(0, 7);
      let g = groups.find((x) => x.key === key);
      if (!g) groups.push((g = { key, label: d.toLocaleDateString("de-DE", { month: "long", year: "numeric" }), items: [] }));
      g.items.push(e);
    }
    return groups;
  }, [listed]);

  async function setStatus(m: Member, status: Member["status"]) {
    const { error } = await supabase.rpc("set_member_status", { target: m.user_id, new_status: status });
    if (error) setError(error.message);
    load();
  }

  async function renameMe() {
    const name = prompt("Dein Name in der Crew", me.name)?.trim();
    if (!name || name === me.name) return;
    const { error } = await supabase.from("crew_members").update({ name }).eq("user_id", me.user_id);
    if (error) setError(error.message);
    onMeChanged();
    load();
  }

  return (
    <div className="shell crew">
      <header className="topbar">
        <Brand />
        <div className="topbar-actions">
          <button className="ghost small" onClick={renameMe} title="Namen ändern">{me.name}</button>
          <button className="ghost small" onClick={() => supabase.auth.signOut()}>Abmelden</button>
        </div>
      </header>

      <div className="crew-bar">
        <nav className="tabs">
          <button className={tab === "termine" ? "on" : ""} onClick={() => setTab("termine")}>Termine</button>
          <button className={tab === "wunsch" ? "on" : ""} onClick={() => setTab("wunsch")}>Wunschliste</button>
          {isAdmin && (
            <button className={tab === "mitglieder" ? "on" : ""} onClick={() => setTab("mitglieder")}>
              Mitglieder{pending.length > 0 && <span className="badge-count">{pending.length}</span>}
            </button>
          )}
        </nav>
        {tab !== "mitglieder" && (
          <button onClick={() => setForm({ wish: tab === "wunsch" })}>{tab === "wunsch" ? "+ Rennen vorschlagen" : "+ Termin"}</button>
        )}
      </div>

      {error && <div className="notice error" onClick={() => setError(null)}>{error}</div>}

      {loading ? (
        <p className="muted">Lädt …</p>
      ) : tab === "termine" ? (
        <>
          <div className="chips">
            <button className={`chip ${!showPast ? "on" : ""}`} onClick={() => setShowPast(false)}>Kommende</button>
            <button className={`chip ${showPast ? "on" : ""}`} onClick={() => setShowPast(true)}>Vergangene</button>
            <button className={`chip ${onlyMine ? "on" : ""}`} onClick={() => setOnlyMine(!onlyMine)}>Nur meine</button>
          </div>
          {byMonth.length === 0 ? (
            <section className="card empty">
              <p className="muted">{showPast ? "Noch keine vergangenen Termine." : "Noch keine Termine. Leg den ersten an – Rennen oder Gruppenlauf."}</p>
            </section>
          ) : (
            byMonth.map((g) => (
              <section key={g.key} className="month">
                <h2 className="month-title">{g.label}</h2>
                {g.items.map((e) => (
                  <EventCard
                    key={e.id}
                    ev={e}
                    rsvps={rsvpsOf(e.id)}
                    mine={myRsvp(e.id)}
                    nameOf={nameOf}
                    canEdit={e.created_by === me.user_id || isAdmin}
                    onRsvp={(s, d) => setRsvp(e, s, d)}
                    onEdit={() => setForm({ existing: e })}
                  />
                ))}
              </section>
            ))
          )}
        </>
      ) : tab === "wunsch" ? (
        <>
          <p className="muted small">Rennen, die wir uns vorstellen könnten. Markier, wo du hin willst – mit genug Interesse wird ein fester Termin draus.</p>
          {wishes.length === 0 ? (
            <section className="card empty"><p className="muted">Noch keine Vorschläge.</p></section>
          ) : (
            wishes.map(({ e }) => (
              <EventCard
                key={e.id}
                ev={e}
                rsvps={rsvpsOf(e.id)}
                mine={myRsvp(e.id)}
                nameOf={nameOf}
                canEdit={e.created_by === me.user_id || isAdmin}
                onRsvp={(s, d) => setRsvp(e, s, d)}
                onEdit={() => setForm({ existing: e })}
              />
            ))
          )}
        </>
      ) : (
        <section className="card">
          <h2>Mitglieder</h2>
          {pending.length > 0 && <p className="small">{pending.length} warten auf Freischaltung.</p>}
          <ul className="members">
            {members.map((m) => (
              <li key={m.user_id}>
                <span className="avatar">{initials(m.name)}</span>
                <span className="m-name">{m.name}{m.user_id === me.user_id ? " (du)" : ""}</span>
                <span className={`m-status s-${m.status}`}>{m.status === "pending" ? "wartet" : m.status === "approved" ? "Mitglied" : m.status === "admin" ? "Orga" : "gesperrt"}</span>
                {m.user_id !== me.user_id && (
                  <span className="m-actions">
                    {m.status !== "approved" && m.status !== "admin" && <button className="small" onClick={() => setStatus(m, "approved")}>Freischalten</button>}
                    {m.status !== "blocked" && m.status !== "admin" && <button className="ghost small" onClick={() => setStatus(m, "blocked")}>Sperren</button>}
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="muted small">Link zum Teilen: <span className="mono">{location.origin + location.pathname}</span></p>
        </section>
      )}

      {form && (
        <EventForm
          existing={form.existing}
          defaultWish={form.wish}
          canDelete={!!form.existing}
          onClose={() => setForm(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

function EventCard({ ev, rsvps, mine, nameOf, canEdit, onRsvp, onEdit }: {
  ev: CrewEvent;
  rsvps: Rsvp[];
  mine?: Rsvp;
  nameOf: Record<string, string>;
  canEdit: boolean;
  onRsvp: (s: Rsvp["status"] | null, distance?: string | null) => void;
  onEdit: () => void;
}) {
  const d = ev.date ? new Date(ev.date + "T12:00:00") : null;
  const going = rsvps.filter((r) => r.status === "going");
  const maybe = rsvps.filter((r) => r.status === "maybe");
  const interested = rsvps.filter((r) => r.status === "interested");
  const past = ev.date ? ev.date < todayStr() : false;
  const daysTo = d ? Math.ceil((d.getTime() - Date.now()) / 86_400_000) : null;

  const byDistance = ev.distances.length > 1
    ? ev.distances.map((dist) => ({ dist, names: going.filter((r) => r.distance === dist).map((r) => nameOf[r.user_id] ?? "?") }))
    : [];

  return (
    <article className={`card crew-event k-${ev.kind} ${mine?.status === "going" ? "is-going" : ""}`}>
      <div className="ev-head">
        <div className="ev-date">
          {d ? (
            <>
              <span className="ev-day">{d.getDate()}</span>
              <span className="ev-mon">{d.toLocaleDateString("de-DE", { month: "short" })}</span>
              <span className="ev-wd">{d.toLocaleDateString("de-DE", { weekday: "short" })}</span>
            </>
          ) : (
            <span className="ev-mon">offen</span>
          )}
        </div>
        <div className="ev-main">
          <div className="ev-title-row">
            <h3>{ev.title}</h3>
            {canEdit && <button className="ghost icon" onClick={onEdit} aria-label="Bearbeiten">✎</button>}
          </div>
          <div className="ev-meta">
            <span className={`kind-chip k-${ev.kind}`}>{KIND[ev.kind]}</span>
            {ev.start_time && <span>{ev.start_time.slice(0, 5)} Uhr</span>}
            {ev.location && <span>📍 {ev.location}</span>}
            {daysTo != null && daysTo >= 0 && daysTo <= 60 && <span className="muted">in {daysTo === 0 ? "heute" : `${daysTo} T.`}</span>}
          </div>
          {ev.distances.length > 0 && <div className="ev-dist">{ev.distances.map((x) => <span key={x}>{x}</span>)}</div>}
          {ev.notes && <p className="ev-notes">{ev.notes}</p>}
          {ev.url && <a className="ev-link" href={ev.url} target="_blank" rel="noopener noreferrer">Ausschreibung / Anmeldung ↗</a>}
        </div>
      </div>

      {/* Wer ist dabei */}
      <div className="ev-people">
        {ev.wish ? (
          interested.length > 0 ? (
            <People label={`${interested.length} will hin`} names={interested.map((r) => nameOf[r.user_id] ?? "?")} />
          ) : <span className="muted small">Noch niemand – sei die/der Erste.</span>
        ) : (
          <>
            {byDistance.length > 0
              ? byDistance.filter((b) => b.names.length).map((b) => <People key={b.dist} label={`${b.dist}: ${b.names.length}`} names={b.names} />)
              : going.length > 0 && <People label={`${going.length} dabei`} names={going.map((r) => nameOf[r.user_id] ?? "?")} />}
            {byDistance.length > 0 && going.some((r) => !r.distance) && (
              <People label="Strecke offen" names={going.filter((r) => !r.distance).map((r) => nameOf[r.user_id] ?? "?")} />
            )}
            {maybe.length > 0 && <People label={`${maybe.length} vielleicht`} names={maybe.map((r) => nameOf[r.user_id] ?? "?")} muted />}
            {going.length === 0 && maybe.length === 0 && <span className="muted small">Noch keine Zusagen.</span>}
          </>
        )}
      </div>

      {/* Meine Antwort */}
      {!past && (
        <div className="ev-actions">
          {ev.wish ? (
            <button className={mine?.status === "interested" ? "rsvp on" : "rsvp"} onClick={() => onRsvp(mine?.status === "interested" ? null : "interested")}>
              {mine?.status === "interested" ? "✓ Will ich hin" : "Will ich hin"}
            </button>
          ) : (
            <>
              <button className={mine?.status === "going" ? "rsvp on" : "rsvp"} onClick={() => onRsvp(mine?.status === "going" ? null : "going")}>
                {mine?.status === "going" ? "✓ Dabei" : "Dabei"}
              </button>
              <button className={mine?.status === "maybe" ? "rsvp maybe on" : "rsvp maybe"} onClick={() => onRsvp(mine?.status === "maybe" ? null : "maybe")}>
                Vielleicht
              </button>
              {mine?.status === "going" && ev.distances.length > 1 && (
                <select value={mine.distance ?? ""} onChange={(e) => onRsvp("going", e.target.value || null)} aria-label="Meine Strecke">
                  <option value="">Strecke wählen</option>
                  {ev.distances.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              )}
            </>
          )}
        </div>
      )}
    </article>
  );
}

function People({ label, names, muted }: { label: string; names: string[]; muted?: boolean }) {
  return (
    <div className={`people ${muted ? "muted" : ""}`}>
      <span className="people-label">{label}</span>
      <span className="people-names">
        {names.map((n, i) => (
          <span key={i} className="person" title={n}>
            <span className="avatar sm">{initials(n)}</span>{n}
          </span>
        ))}
      </span>
    </div>
  );
}
