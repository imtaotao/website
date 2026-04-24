import React from "react";
import ReactDOM from "react-dom/client";
import { Routes, Route, BrowserRouter } from "react-router";
import { Theme } from "@radix-ui/themes";
import { App } from "#app/App";
import "@radix-ui/themes/styles.css";
import "#app/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route
          index
          element={
            <Theme>
              <App />
            </Theme>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
