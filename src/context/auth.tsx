"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, tokenStore } from "@/lib/client";

type AuthCtx = {
  user: any | null; loading: boolean;
  login: (e: string, p: string) => Promise<void>;
  register: (b: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};
const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      if (tokenStore.get()) { try { setUser(await api.me()); } catch { tokenStore.set(null); } }
      setLoading(false);
    })();
  }, []);

  const afterAuth = (res: any) => {
    tokenStore.set(res.access_token); setUser(res.user);
    if (res.user.must_change_password) { router.push("/change-password"); return; }
    router.push(res.user.role === "trainer" ? "/trainer" : "/admin");
  };
  const login = async (email: string, password: string) => afterAuth(await api.login({ email, password }));
  const register = async (b: any) => afterAuth(await api.registerOwner(b));
  const logout = () => { tokenStore.set(null); setUser(null); router.push("/login"); };
  const refreshUser = async () => { setUser(await api.me()); };

  return <Ctx.Provider value={{ user, loading, login, register, logout, refreshUser }}>{children}</Ctx.Provider>;
}
