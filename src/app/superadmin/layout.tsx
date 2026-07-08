"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sa, saToken } from "@/lib/saclient";

const TABS = [
  ["Dashboard", "/superadmin"], ["Academies", "/superadmin/academies"],
  ["Plans", "/superadmin/plans"], ["Announcements", "/superadmin/announcements"],
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
      <div className="row" style={{ justifyContent: "space-between" }}>
        <Link href="/superadmin"><div className="brand">AM <span>360</span> <span className="badge">Platform</span></div></Link>
        <div className="row"><span className="muted">{me.name}</span><button className="secondary" onClick={logout}>Logout</button></div>
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
