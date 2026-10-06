"use client";

import { useSyncExternalStore } from "react";

const THEME_INIT = `(function(){try{var t=localStorage.getItem("theme");if(!t){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return false;
}

function getServerSnapshot() {
  return true;
}

/** Script anti-flash : rendu uniquement côté serveur (React 19 n'aime pas les <script> côté client). */
export default function ThemeScript() {
  const isServer = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  if (!isServer) return null;

  return (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_INIT }}
    />
  );
}
