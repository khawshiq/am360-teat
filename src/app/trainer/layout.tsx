"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/auth";
import NavTabs, { type Tab } from "@/components/NavTabs";
import Logo from "@/components/Logo";

const TABS: Tab[] = [
  { label: "Workspace", href: "/trainer", icon: "workspace" },
  { label: "Schedule", href: "/trainer/schedule", icon: "schedule" },
  { label: "Profile", href: "/trainer/profile", icon: "profile" },
];

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter(); const path = usePathname();
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && user.role !== "trainer") router.replace("/admin");
    if (!loading && user?.must_change_password) router.replace("/change-password");
  }, [user, loading, router]);
  if (loading || !user || user.must_change_password) return <div className="center muted">Loading…</div>;

  const initials = (user.name || "?").split(" ").map((s: string) => s[0]).slice(0, 2).join("");
  return (
    <div className="container">
      <div className="topbar">
        <Link href="/trainer">
          <Logo variant="white" compact height={38} />
        </Link>
        <div className="topbar-user">
          <div className="avatar" title={user.name}>{initials}</div>
          <span className="muted" style={{ fontSize: 13.5 }}>{user.name}</span>
          <button className="secondary" onClick={logout} style={{ padding: "7px 14px", minHeight: 0 }}>Logout</button>
        </div>
      </div>
      <NavTabs tabs={TABS} isActive={h => path === h} />
      {children}
    </div>
  );
}
