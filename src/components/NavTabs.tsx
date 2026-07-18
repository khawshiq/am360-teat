"use client";
import Link from "next/link";
import WhatsAppMark from "./WhatsAppMark";

// The console tab strip. One component, two shapes: a row of pills on a laptop,
// a fixed bottom tab bar on a phone. Which one you get is decided entirely by
// `.nav` in globals.css at 720px — there is no width state here, so it renders
// identically on the server and cannot flash the wrong layout on load.
//
// The icons exist for the phone: a bottom bar of bare text labels is unreadable
// at 10.5px. They are inline SVGs (no icon dependency), 24px grid, currentColor
// stroke, so a tab colours itself by setting `color`.

const ICONS: Record<string, JSX.Element> = {
  dashboard: <><path d="M3 12l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  branches: <><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M10 21v-6h4v6" /></>,
  trainers: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M17 8.2A2.8 2.8 0 0 0 17 13" /><path d="M18 20a5.6 5.6 0 0 0-2-4.3" /></>,
  courses: <><path d="M4 5.5A2 2 0 0 1 6 4h13v14H6a2 2 0 0 0-2 2z" /><path d="M8 8h7" /></>,
  audit: <><path d="M8 4h8a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="M9.5 9.5h5" /><path d="M9.5 13h5" /><path d="M9.5 16.5h3" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" /></>,
  workspace: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></>,
  schedule: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M8 3v4M16 3v4" /></>,
  profile: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
  academies: <><path d="M12 3l9 4.5-9 4.5-9-4.5z" /><path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5" /></>,
  plans: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /><path d="M7 15h4" /></>,
  announcements: <><path d="M4 9v6h3l6 4V5L7 9z" /><path d="M17 9a4 4 0 0 1 0 6" /></>,
  notifications: <><path d="M20.5 4.5a10 10 0 1 0-16.7 12.4L3 21l4.3-.9A10 10 0 0 0 20.5 4.5z" /><path d="M8.5 9.8c0 3.7 3 6.7 6.7 6.7l.2-1.2c.1-.5-.2-1-.6-1.2l-1.6-.7c-.4-.2-.9-.1-1.2.3l-.4.5a5 5 0 0 1-2.5-2.5l.5-.4c.4-.3.5-.8.3-1.2l-.7-1.6c-.2-.4-.7-.7-1.2-.6l-1.2.2z" /></>,
};

export type Tab = { label: string; href: string; icon: keyof typeof ICONS };

// Every tab gets its own color, darkened ~one step past the dashboard StatTile hues
// (Branches/Trainers/Audit/Settings started as the exact --c-cyan/--c-violet/--c-blue/
// --c-magenta tile colors, but "darker/more intense" was asked for here specifically —
// darkening the shared --c-* vars would also darken the dashboard tiles, so these are
// deliberately separate, nav-only values). Cyan needed a smaller step than the others:
// pushed as dark as Tailwind's cyan-800 it drops below the chroma floor (reads as gray,
// exactly the "--g-cyan" trap noted in frontend.md) — this stops one shade short of that.
// Re-validated with the dataviz skill's validate_palette.js in the REAL left-to-right nav
// order (dashboard, branches, trainers, courses, [notifications=WhatsApp green], audit,
// settings) — that's what's actually adjacent on screen. Kept as raw hex, not --c-* vars:
// validated for this one sequence, not for reuse anywhere a color is needed next.
const FIXED_ICON_COLOR: Record<string, string> = {
  dashboard: "#854d0e",
  branches: "#0a7fa0",
  trainers: "#5b21b6",
  courses: "#9a3412",
  audit: "#1d4ed8",
  settings: "#9d174d",
};

function Icon({ name }: { name: string }) {
  // The Notifications tab is WhatsApp specifically, so it gets the real brand mark
  // instead of the monochrome outline every other tab uses — same brand-identification
  // exception as elsewhere (see WhatsAppMark.tsx), scoped to just this one icon.
  if (name === "notifications") {
    return (
      <span className="nav-ico" aria-hidden="true">
        <WhatsAppMark size={19} />
      </span>
    );
  }
  return (
    <span className="nav-ico" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke={FIXED_ICON_COLOR[name] || "currentColor"} strokeWidth="1.7"
           strokeLinecap="round" strokeLinejoin="round">
        {ICONS[name]}
      </svg>
    </span>
  );
}

export default function NavTabs({ tabs, isActive }: { tabs: Tab[]; isActive: (href: string) => boolean }) {
  return (
    // `tabbar` is what opts this strip into the fixed bottom bar on a phone. An
    // in-page `.nav` (BranchWorkspace's tabs) deliberately does not have it.
    <nav className="nav tabbar">
      {tabs.map(t => {
        const active = isActive(t.href);
        return (
          <Link key={t.href} href={t.href} className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
