"use client";
import { useEffect, useRef } from "react";

declare global {
  interface Window { google?: any; }
}

// Renders the official Google Identity Services button. On success it hands the
// returned ID token (credential) to `onCredential`. Renders nothing if
// NEXT_PUBLIC_GOOGLE_CLIENT_ID isn't configured, so the page degrades gracefully.
export default function GoogleSignIn({
  onCredential, onError,
}: { onCredential: (credential: string) => void; onError?: (msg: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || !window.google || !ref.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (resp: any) => { if (resp?.credential) onCredential(resp.credential); },
      });
      ref.current.innerHTML = "";
      window.google.accounts.id.renderButton(ref.current, {
        theme: "filled_black", size: "large", text: "continue_with", shape: "pill", width: 320,
      });
    };

    if (window.google?.accounts?.id) { render(); return; }

    const existing = document.getElementById("google-gsi") as HTMLScriptElement | null;
    if (existing) { existing.addEventListener("load", render); return () => existing.removeEventListener("load", render); }

    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true; s.id = "google-gsi";
    s.onload = render;
    s.onerror = () => onError?.("Failed to load Google Sign-In");
    document.head.appendChild(s);
    return () => { cancelled = true; };
  }, [clientId]);

  if (!clientId) return null;
  return <div ref={ref} style={{ display: "flex", justifyContent: "center", minHeight: 44 }} />;
}
