"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth";
import Logo from "@/components/Logo";

export default function Welcome() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && user) router.replace(user.role === "trainer" ? "/trainer" : "/admin");
  }, [user, loading, router]);

  return (
    <div className="center">
      <div className="card" style={{ maxWidth: 420, textAlign: "center" }}>
        {/* The lockup already says "Complete Academy Management" — no tagline under it. */}
        <div style={{ display: "flex", justifyContent: "center" }}><Logo height={56} /></div>
        <div className="grid" style={{ marginTop: 24 }}>
          <Link href="/register"><button style={{ width: "100%" }}>Create an academy</button></Link>
          <Link href="/login"><button className="secondary" style={{ width: "100%" }}>Sign in</button></Link>
        </div>
      </div>
    </div>
  );
}
