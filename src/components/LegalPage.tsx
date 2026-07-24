import React from "react";
import Link from "next/link";
import Logo from "./Logo";

// Shared frame for the public legal pages (/privacy-policy, /terms, /data-deletion).
// These exist because Meta's App Dashboard requires reachable, public URLs before it
// will issue a permanent WhatsApp access token — a reviewer (and a crawler) must be
// able to load them with no session, so nothing here may touch useAuth or fetch.
// Server components on purpose: static HTML, no client JS, no auth context.
export default function LegalPage({
  title, updated, children,
}: {
  title: string;
  /** Human date, day-month-year like the rest of the app. */
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="legal-wrap">
      <header className="legal-head">
        <Link href="/" aria-label="AM 360 home"><Logo height={40} /></Link>
        <h1 className="legal-title">{title}</h1>
        <p className="muted" style={{ fontSize: 13.5 }}>Last updated {updated}</p>
      </header>

      <main className="card legal-body">{children}</main>

      <footer className="legal-foot muted">
        <Link href="/privacy-policy">Privacy Policy</Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms">Terms of Service</Link>
        <span aria-hidden="true">·</span>
        <Link href="/data-deletion">Data Deletion</Link>
        <span aria-hidden="true">·</span>
        <Link href="/">Home</Link>
      </footer>
    </div>
  );
}
