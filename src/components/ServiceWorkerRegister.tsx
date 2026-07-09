"use client";
import { useEffect } from "react";

// Registers the PWA service worker once, on the client, after load. Silent no-op
// where service workers aren't supported.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch((e) => console.warn("SW registration failed:", e));
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
