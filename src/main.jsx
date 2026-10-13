import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./mentor.css";
import "./design-system.css";
import App from "./App";
import "./accessibility-overrides.css";

createRoot(document.getElementById("root")).render(<StrictMode><App /></StrictMode>);
