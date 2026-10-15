import type { ReactNode } from "react";

export default function Placeholder({ icon, title, intro, items }: { icon: ReactNode; title: string; intro: string; items: string[] }) {
  return (
    <section className="card placeholder">
      <div className="ph-icon">{icon}</div>
      <h2>{title}</h2>
      <p className="muted">{intro}</p>
      <ul>
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
      <span className="badge">Kommt als Nächstes</span>
    </section>
  );
}
