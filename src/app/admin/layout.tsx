"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/auth";
import UpgradeModal from "@/components/UpgradeModal";

const TABS = [
  ["Dashboard", "/admin"], ["Branches", "/admin/branches"],
  ["Trainers", "/admin/trainers"], ["Courses", "/admin/courses"],
  ["Audit", "/admin/audit"], ["Settings", "/admin/settings"],
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

  const initials = (user.name || "?").split(" ").map((s: string) => s[0]).slice(0, 2).join("");
  return (
    <div className="container">
      <div className="topbar">
        <Link href="/admin">
          <div className="logo"><span className="mark">A</span><span>AM<span className="grad"> 360</span></span></div>
        </Link>
        <div className="topbar-user">
          <div className="avatar" title={user.name}>{initials}</div>
          <span className="muted" style={{ fontSize: 13.5 }}>{user.name}</span>
          <button className="secondary" onClick={logout} style={{ padding: "7px 14px" }}>Logout</button>
        </div>
      </div>
      <nav className="nav">
        {TABS.map(([label, href]) => (
          <Link key={href} href={href} className={isActive(href) ? "active" : ""}>{label}</Link>
        ))}
      </nav>
      {children}
      <UpgradeModal />
    </div>
  );
}
