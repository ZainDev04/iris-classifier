/* ==========================================================================
   Iris // KNN theme switch
   Loaded in the head, before the first paint, so a saved choice never flashes
   the wrong colours. Dark is the default. A visitor's own choice wins; with no
   choice saved the page follows the system setting.
   ========================================================================== */
(() => {
  "use strict";

  const KEY = "iris-theme";
  const root = document.documentElement;
  const BAR = { dark: "#000000", light: "#ffffff" };
  const lightQuery = window.matchMedia("(prefers-color-scheme: light)");

  function saved() {
    try {
      const value = localStorage.getItem(KEY);
      return value === "light" || value === "dark" ? value : null;
    } catch (err) {
      return null; // private mode, or storage turned off
    }
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    const bar = document.getElementById("theme-color");
    if (bar) bar.setAttribute("content", BAR[theme]);
    const button = document.getElementById("theme-toggle");
    if (button) {
      button.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
    }
  }

  apply(saved() || (lightQuery.matches ? "light" : "dark"));

  lightQuery.addEventListener("change", (e) => {
    if (!saved()) apply(e.matches ? "light" : "dark");
  });

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("theme-toggle");
    if (!button) return;
    apply(root.getAttribute("data-theme"));
    button.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(KEY, next);
      } catch (err) {
        // the choice still applies for this visit
      }
      apply(next);
      root.dispatchEvent(new CustomEvent("themechange", { detail: { theme: next } }));
    });
  });
})();
