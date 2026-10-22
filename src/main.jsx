import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles.css";
import "./mentor.css";
import "./design-system.css";
import App from "./App";
import "./accessibility-overrides.css";
import "./motion.css";
import "./dark-mode.css";

createRoot(document.getElementById("root")).render(<StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>);
