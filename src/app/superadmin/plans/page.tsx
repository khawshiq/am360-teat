"use client";
import { useEffect, useState } from "react";
import { sa } from "@/lib/saclient";

const NUM_FIELDS: [string, string][] = [
  ["max_branches", "Branches"], ["max_students", "Students"],
  ["max_trainers", "Trainers"], ["max_courses", "Courses"],
  ["price_monthly", "Price / month"], ["price_yearly", "Price / year"],
];

export default function Plans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [err, setErr] = useState(""); const [saved, setSaved] = useState("");

  const load = () => sa.listPlans().then((p: any[]) => {
    setPlans(p);
    const d: Record<string, any> = {};
    p.forEach(pl => { d[pl.id] = { ...pl }; });
    setDrafts(d);
  }).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);

  const set = (id: string, k: string) => (e: any) => setDrafts(s => ({ ...s, [id]: { ...s[id], [k]: e.target.value } }));
  const save = async (id: string) => {
    setErr(""); setSaved("");
    const d = drafts[id];
    try {
      await sa.updatePlan(id, {
        name: d.name,
        max_branches: d.max_branches, max_students: d.max_students,
        max_trainers: d.max_trainers, max_courses: d.max_courses,
        price_monthly: d.price_monthly, price_yearly: d.price_yearly,
      });
      setSaved(id); load();
    } catch (e: any) { setErr(e.message); }
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
      {err && <div className="err">{err}</div>}
      {plans.map(p => {
        const d = drafts[p.id] || p;
        return (
          <div className="card" key={p.id}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <b>{p.name}</b><span className="badge">{p.code}</span>
            </div>
            <p className="muted" style={{ fontSize: 12, margin: "6px 0 12px" }}>Use -1 for unlimited.</p>
            {NUM_FIELDS.map(([k, label]) => (
              <div className="field" key={k}><label>{label}</label>
                <input type="number" value={d[k] ?? 0} onChange={set(p.id, k)} />
              </div>
            ))}
            <div className="row">
              <button onClick={() => save(p.id)}>Save</button>
              {saved === p.id && <span className="muted" style={{ color: "var(--ok)" }}>Saved ✓</span>}
            </div>
          </div>
        );
      })}
      {!plans.length && <p className="muted">Loading plans…</p>}
    </div>
  );
}
