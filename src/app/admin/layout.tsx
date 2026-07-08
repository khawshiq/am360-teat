"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/auth";

const TABS = [
  ["Dashboard", "/admin"], ["Branches", "/admin/branches"],
  ["Trainers", "/admin/trainers"], ["Audit", "/admin/audit"], ["Settings", "/admin/settings"],
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter(); const path = usePathname();
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user?.role === "trainer") router.replace("/trainer");
    if (!loading && user?.must_change_password) router.replace("/change-password");
  }, [user, loading, router]);
  if (loading || !user || user.must_change_password) return <div className="center muted">Loading…</div>;
  const isActive = (href: string) => href === "/admin" ? path === href : path.startsWith(href);

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <Link href="/admin"><div className="brand">AM <span>360</span></div></Link>
        <div className="row"><span className="muted">{user.name}</span><button className="secondary" onClick={logout}>Logout</button></div>
      </div>
      <nav className="nav">
        {TABS.map(([label, href]) => (
          <Link key={href} href={href} className={isActive(href) ? "active" : ""}>{label}</Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
