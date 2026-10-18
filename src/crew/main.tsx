import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CrewApp from "./CrewApp";
import "../styles.css";
import "./crew.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CrewApp />
  </StrictMode>,
);
