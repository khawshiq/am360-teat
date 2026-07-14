"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sa, saToken } from "@/lib/saclient";
import NavTabs, { type Tab } from "@/components/NavTabs";
import Logo from "@/components/Logo";

const TABS: Tab[] = [
  { label: "Dashboard", href: "/superadmin", icon: "dashboard" },
  { label: "Academies", href: "/superadmin/academies", icon: "academies" },
  { label: "Plans", href: "/superadmin/plans", icon: "plans" },
  { label: "Announcements", href: "/superadmin/announcements", icon: "announcements" },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const path = usePathname();
  const [me, setMe] = useState<any | null>(null);
  const [ready, setReady] = useState(false);
  const isLogin = path === "/superadmin/login";

  useEffect(() => {
    if (isLogin) { setReady(true); return; }
    if (!saToken.get()) { router.replace("/superadmin/login"); return; }
    sa.me().then(u => { setMe(u); setReady(true); })
      .catch(() => { saToken.set(null); router.replace("/superadmin/login"); });
  }, [isLogin, router]);

  if (isLogin) return <>{children}</>;
  if (!ready || !me) return <div className="center muted">Loading…</div>;
  const logout = () => { saToken.set(null); router.push("/superadmin/login"); };
  const isActive = (href: string) => href === "/superadmin" ? path === href : path.startsWith(href);

  return (
    <div className="container">
      <div className="topbar">
        <Link href="/superadmin">
          <div className="logo">
            <Logo variant="white" compact height={38} />
            <span className="badge on-blue">Platform</span>
          </div>
        </Link>
        <div className="topbar-user">
          <span className="muted" style={{ fontSize: 13.5 }}>{me.name}</span>
          <button className="secondary" onClick={logout} style={{ padding: "7px 14px", minHeight: 0 }}>Logout</button>
        </div>
      </div>
      <NavTabs tabs={TABS} isActive={isActive} />
      {children}
    </div>
  );
}
