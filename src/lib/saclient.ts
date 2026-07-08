"use client";
// Separate API client for the platform Super Admin console. Uses its own token key
// so it never collides with the tenant (academy) session.
const SA_TOKEN_KEY = "am360_sa_token";
export const saToken = {
  get: () => (typeof window !== "undefined" ? localStorage.getItem(SA_TOKEN_KEY) : null),
  set: (t: string | null) => {
    if (typeof window === "undefined") return;
    t ? localStorage.setItem(SA_TOKEN_KEY, t) : localStorage.removeItem(SA_TOKEN_KEY);
  },
};

async function request(path: string, options: RequestInit = {}, withAuth = true) {
  const headers: any = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (withAuth) { const t = saToken.get(); if (t) headers.Authorization = `Bearer ${t}`; }
  const res = await fetch(`/api/admin${path}`, { ...options, headers });
  const text = await res.text();
  let data: any = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) { const err: any = new Error((data && data.detail) || `Request failed (${res.status})`); err.status = res.status; throw err; }
  return data;
}
const body = (b: any) => ({ body: JSON.stringify(b) });

export const sa = {
  login: (b: any) => request("/auth/login", { method: "POST", ...body(b) }, false),
  me: () => request("/me"),
  analytics: () => request("/analytics"),
  listAcademies: () => request("/academies"),
  updateAcademy: (id: string, b: any) => request(`/academies/${id}`, { method: "PATCH", ...body(b) }),
  deleteAcademy: (id: string) => request(`/academies/${id}`, { method: "DELETE" }),
  listPlans: () => request("/plans"),
  updatePlan: (id: string, b: any) => request(`/plans/${id}`, { method: "PATCH", ...body(b) }),
  listAnnouncements: () => request("/announcements"),
  createAnnouncement: (b: any) => request("/announcements", { method: "POST", ...body(b) }),
};
