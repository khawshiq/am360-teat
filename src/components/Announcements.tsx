"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";

// Announcements sent by the platform Super Admin — either broadcast to everyone
// (academy_id null) or addressed to this academy. Renders nothing when there are
// none, and stays silent on failure: news is not worth breaking the page it sits on.
export default function Announcements() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => { api.listAnnouncements().then(setItems).catch(() => setItems([])); }, []);

  if (!items.length) return null;
  return (
    <div className="card">
      <div className="section-head">
        <span className="section-title">Announcements</span>
      </div>
      {items.map(a => (
        <div className="list-item" key={a.id} style={{ flexDirection: "column", alignItems: "stretch" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <b>{a.title}</b>
            <span className="muted" style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>
              {String(a.created_at).replace("T", " ").slice(0, 16)}
            </span>
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4, whiteSpace: "pre-wrap" }}>{a.body}</div>
        </div>
      ))}
    </div>
  );
}
