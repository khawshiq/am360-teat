"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TrainerSchedule() {
  const [sched, setSched] = useState<any[]>([]);
  useEffect(() => { api.listSchedules().then(setSched).catch(() => {}); }, []);
  const todayDow = (new Date().getDay() + 6) % 7;
  return (
    <div>
      <h3>My Timetable</h3>
      {sched.map(s => (
        <div className="list-item" key={s.id} style={s.day_of_week === todayDow ? { borderColor: "var(--accent2)" } : {}}>
          <div><b>{s.title}</b><div className="muted" style={{ fontSize: 13 }}>{DAYS[s.day_of_week]} · {s.start_time}–{s.end_time}</div></div>
          {s.day_of_week === todayDow && <span className="badge" style={{ color: "var(--accent2)" }}>TODAY</span>}
        </div>
      ))}
      {!sched.length && <p className="muted">No classes scheduled yet.</p>}
    </div>
  );
}
