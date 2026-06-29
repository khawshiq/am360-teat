"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth";

export default function Welcome() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && user) router.replace(user.role === "trainer" ? "/trainer" : "/admin");
  }, [user, loading, router]);

  return (
    <div className="center">
      <div className="card" style={{ maxWidth: 420, textAlign: "center" }}>
        <div className="brand">AM <span>360</span></div>
        <p className="muted" style={{ marginTop: 8 }}>Complete Academy Management</p>
        <div className="grid" style={{ marginTop: 24 }}>
          <Link href="/register"><button style={{ width: "100%" }}>Create an academy</button></Link>
          <Link href="/login"><button className="secondary" style={{ width: "100%" }}>Sign in</button></Link>
        </div>
      </div>
    </div>
  );
}
