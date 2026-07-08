"use client";
import { useEffect, useState } from "react";
import { sa } from "@/lib/saclient";

export default function SuperAdminDashboard() {
  const [d, setD] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { sa.analytics().then(setD).catch(e => setErr(e.message)); }, []);
  if (err) return <div className="err">{err}</div>;
  if (!d) return <div className="muted">Loading platform stats…</div>;
  const inr = (n: number) => "₹" + (n || 0).toLocaleString("en-IN");
  return (
    <div className="grid">
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        <div className="stat"><div className="n">{d.academies}</div><div className="l">Academies</div></div>
        <div className="stat"><div className="n">{d.active}</div><div className="l">Active</div></div>
        <div className="stat"><div className="n">{d.suspended}</div><div className="l">Suspended</div></div>
        <div className="stat"><div className="n">{d.premium}</div><div className="l">Premium</div></div>
        <div className="stat"><div className="n">{d.free}</div><div className="l">Free</div></div>
        <div className="stat"><div className="n">{d.owners}</div><div className="l">Owners</div></div>
        <div className="stat"><div className="n">{d.trainers}</div><div className="l">Trainers</div></div>
        <div className="stat"><div className="n">{d.students}</div><div className="l">Students</div></div>
        <div className="stat"><div className="n">{inr(d.revenue_month)}</div><div className="l">Revenue this month</div></div>
        <div className="stat"><div className="n">{inr(d.revenue_total)}</div><div className="l">Revenue total</div></div>
      </div>
    </div>
  );
}
