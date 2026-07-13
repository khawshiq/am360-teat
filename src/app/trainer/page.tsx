"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import BranchWorkspace from "@/components/BranchWorkspace";
import Announcements from "@/components/Announcements";

export default function TrainerWorkspace() {
  const [branches, setBranches] = useState<any[]>([]);
  const [active, setActive] = useState<string>("");
  const [err, setErr] = useState("");
  useEffect(() => {
    api.listBranches().then(bs => { setBranches(bs); if (bs[0]) setActive(bs[0].id); }).catch(e => setErr(e.message));
  }, []);
  if (err) return <div className="err">{err}</div>;
  if (!branches.length) return <p className="muted">You have no assigned branches yet.</p>;
  return (
    <div className="grid">
      <Announcements />
      {branches.length > 1 && (
        <div className="field" style={{ maxWidth: 280 }}>
          <label>Branch</label>
          <select value={active} onChange={e => setActive(e.target.value)}>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}
      {active && <BranchWorkspace branchId={active} isAdmin={false} />}
    </div>
  );
}
