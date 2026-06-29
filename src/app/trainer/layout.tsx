"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/auth";

const TABS = [["Workspace", "/trainer"], ["Schedule", "/trainer/schedule"], ["Profile", "/trainer/profile"]];

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter(); const path = usePathname();
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && user.role !== "trainer") router.replace("/admin");
  }, [user, loading, router]);
  if (loading || !user) return <div className="center muted">Loading…</div>;

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="brand">AM <span>360</span></div>
        <div className="row"><span className="muted">{user.name}</span><button className="secondary" onClick={logout}>Logout</button></div>
      </div>
      <nav className="nav">
        {TABS.map(([l, h]) => <Link key={h} href={h} className={path === h ? "active" : ""}>{l}</Link>)}
      </nav>
      {children}
    </div>
  );
}
