"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/auth";
import UpgradeModal from "@/components/UpgradeModal";
import NavTabs, { type Tab } from "@/components/NavTabs";
import Logo from "@/components/Logo";

const TABS: Tab[] = [
  { label: "Dashboard", href: "/admin", icon: "dashboard" },
  { label: "Branches", href: "/admin/branches", icon: "branches" },
  { label: "Trainers", href: "/admin/trainers", icon: "trainers" },
  { label: "Courses", href: "/admin/courses", icon: "courses" },
  { label: "Audit", href: "/admin/audit", icon: "audit" },
  { label: "Settings", href: "/admin/settings", icon: "settings" },
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
          <Logo variant="white" compact height={38} />
        </Link>
        <div className="topbar-user">
          <div className="avatar" title={user.name}>{initials}</div>
          <span className="muted" style={{ fontSize: 13.5 }}>{user.name}</span>
          <button className="secondary" onClick={logout} style={{ padding: "7px 14px", minHeight: 0 }}>Logout</button>
        </div>
      </div>
      <NavTabs tabs={TABS} isActive={isActive} />
      {children}
      <UpgradeModal />
    </div>
  );
}
