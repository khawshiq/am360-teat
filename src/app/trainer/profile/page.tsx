"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { useAuth } from "@/context/auth";

export default function TrainerProfile() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  useEffect(() => { api.listBranches().then(setBranches).catch(() => {}); }, []);
  if (!user) return null;
  return (
    <div className="card" style={{ maxWidth: 460 }}>
      <b>My profile</b>
      <div style={{ marginTop: 12 }}>
        <p><span className="muted">Name:</span> {user.name}</p>
        <p><span className="muted">Email:</span> {user.email}</p>
        <p><span className="muted">Phone:</span> {user.phone || "—"}</p>
        <p><span className="muted">Branches:</span> {branches.map(b => b.name).join(", ") || "—"}</p>
      </div>
      <Link href="/change-password"><button className="secondary" style={{ marginTop: 8 }}>Change Password</button></Link>
    </div>
  );
}
