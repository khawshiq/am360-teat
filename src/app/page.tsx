"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth";
import AuthShell from "@/components/AuthShell";

const ARROW = (
  <svg className="cta-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export default function Welcome() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && user) router.replace(user.role === "trainer" ? "/trainer" : "/admin");
  }, [user, loading, router]);

  return (
    // The same stage as login and register — this is the first screen anyone sees, and
    // it should not look like a different product from the one it hands you to.
    // <AuthShell> already draws the lockup, so no separate logo here: two marks is no mark.
    <AuthShell
      title={<>Welcome to <em>AM360</em></>}
      subtitle="Manage your academy smarter, faster and better."
    >
      <div className="grid" style={{ marginTop: 4 }}>
        <Link href="/register">
          <button className="btn-cta btn-grad">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                 strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 21h18" /><path d="M5 21V9l7-5 7 5v12" /><path d="M10 21v-6h4v6" />
            </svg>
            <span className="cta-label">Create an academy</span>
            {ARROW}
          </button>
        </Link>
        <Link href="/login">
          <button className="btn-cta btn-outline">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                 strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" />
            </svg>
            <span className="cta-label">Sign in</span>
            {ARROW}
          </button>
        </Link>
      </div>
    </AuthShell>
  );
}
