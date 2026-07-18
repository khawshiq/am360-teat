"use client";
const TOKEN_KEY = "am360_token";
export const tokenStore = {
  get: () => (typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null),
  set: (t: string | null) => {
    if (typeof window === "undefined") return;
    t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);
  },
};

async function request(path: string, options: RequestInit = {}, withAuth = true) {
  const headers: any = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (withAuth) { const t = tokenStore.get(); if (t) headers.Authorization = `Bearer ${t}`; }
  const res = await fetch(`/api${path}`, { ...options, headers });
  const text = await res.text();
  let data: any = null; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err: any = new Error((data && data.detail) || `Request failed (${res.status})`);
    err.status = res.status;
    if (data && typeof data === "object") { err.code = data.code; err.resource = data.resource; err.limit = data.limit; }
    // Plan-limit breaches (402) fire a global event so a single UpgradeModal can react,
    // no matter which form triggered the create. The error still throws for local handling.
    if (err.code === "PLAN_LIMIT" && typeof window !== "undefined")
      window.dispatchEvent(new CustomEvent("am360:plan-limit", { detail: { resource: err.resource, limit: err.limit, message: err.message } }));
    throw err;
  }
  return data;
}
const body = (b: any) => ({ body: JSON.stringify(b) });

// File downloads (exports). Can't be a plain <a href> — the API is Bearer-authed, and a
// link sends no Authorization header. So we fetch the bytes, then hand the browser a
// blob. On failure the body is still JSON, so a 402 keeps driving the upgrade popup.
async function requestFile(path: string): Promise<{ blob: Blob; filename: string }> {
  const t = tokenStore.get();
  const res = await fetch(`/api${path}`, { headers: t ? { Authorization: `Bearer ${t}` } : {} });
  if (!res.ok) {
    let data: any = null;
    try { data = await res.json(); } catch { /* non-JSON error body */ }
    const err: any = new Error((data && data.detail) || `Export failed (${res.status})`);
    err.status = res.status; err.code = data?.code; err.feature = data?.feature;
    err.resource = data?.resource; err.limit = data?.limit;
    if (err.code === "PLAN_LIMIT" && typeof window !== "undefined")
      window.dispatchEvent(new CustomEvent("am360:plan-limit", {
        detail: { resource: err.resource, limit: err.limit, feature: err.feature, message: err.message },
      }));
    throw err;
  }
  const cd = res.headers.get("Content-Disposition") || "";
  const filename = /filename="([^"]+)"/.exec(cd)?.[1] || "export";
  return { blob: await res.blob(), filename };
}

export const api = {
  registerOwner: (b: any) => request("/auth/register-owner", { method: "POST", ...body(b) }, false),
  login: (b: any) => request("/auth/login", { method: "POST", ...body(b) }, false),
  googleLogin: (credential: string) => request("/auth/google", { method: "POST", ...body({ credential }) }, false),
  forgotPassword: (email: string) => request("/auth/forgot-password", { method: "POST", ...body({ email }) }, false),
  resetPassword: (b: { token: string; password: string }) => request("/auth/reset-password", { method: "POST", ...body(b) }, false),
  me: () => request("/auth/me"),
  getAcademy: () => request("/academy"),
  updateAcademy: (b: any) => request("/academy", { method: "PUT", ...body(b) }),
  listBranches: (includeInactive = false) => request(`/branches${includeInactive ? "?include_inactive=1" : ""}`),
  createBranch: (b: any) => request("/branches", { method: "POST", ...body(b) }),
  updateBranch: (id: string, b: any) => request(`/branches/${id}`, { method: "PUT", ...body(b) }),
  deleteBranch: (id: string) => request(`/branches/${id}`, { method: "DELETE" }),
  listTrainers: (includeInactive = false) => request(`/trainers${includeInactive ? "?include_inactive=1" : ""}`),
  createTrainer: (b: any) => request("/trainers", { method: "POST", ...body(b) }),
  updateTrainer: (id: string, b: any) => request(`/trainers/${id}`, { method: "PUT", ...body(b) }),
  deleteTrainer: (id: string) => request(`/trainers/${id}`, { method: "DELETE" }),
  listStudents: (bid?: string, includeInactive = false) => {
    const q = new URLSearchParams(); if (bid) q.set("branch_id", bid); if (includeInactive) q.set("include_inactive", "1");
    return request(`/students${q.toString() ? `?${q}` : ""}`);
  },
  createStudent: (b: any) => request("/students", { method: "POST", ...body(b) }),
  updateStudent: (id: string, b: any) => request(`/students/${id}`, { method: "PUT", ...body(b) }),
  deleteStudent: (id: string) => request(`/students/${id}`, { method: "DELETE" }),
  markAttendance: (b: any) => request("/attendance/mark", { method: "POST", ...body(b) }),
  getAttendance: (bid: string, date: string) => request(`/attendance?branch_id=${bid}&date=${date}`),
  getSession: (bid: string, date: string) => request(`/sessions?branch_id=${bid}&date=${date}`),
  listSchedules: (p: { branch_id?: string; trainer_id?: string } = {}) => {
    const q = new URLSearchParams(); if (p.branch_id) q.set("branch_id", p.branch_id); if (p.trainer_id) q.set("trainer_id", p.trainer_id);
    return request(`/schedules${q.toString() ? `?${q}` : ""}`);
  },
  createSchedule: (b: any) => request("/schedules", { method: "POST", ...body(b) }),
  updateSchedule: (id: string, b: any) => request(`/schedules/${id}`, { method: "PUT", ...body(b) }),
  deleteSchedule: (id: string) => request(`/schedules/${id}`, { method: "DELETE" }),
  listFees: (bid?: string) => request(`/fees${bid ? `?branch_id=${bid}` : ""}`),
  createFee: (b: any) => request("/fees", { method: "POST", ...body(b) }),
  payFee: (id: string, b: any) => request(`/fees/${id}/pay`, { method: "POST", ...body(b) }),
  deleteFee: (id: string) => request(`/fees/${id}`, { method: "DELETE" }),
  dashboard: () => request("/analytics/dashboard"),
  // The rows behind a dashboard tile — what a tile shows when you click it.
  breakdown: (metric: string) => request(`/analytics/breakdown?metric=${encodeURIComponent(metric)}`),
  // Server-rendered export. CSV is free; xlsx/pdf need Plan.features.export (402 → popup).
  exportReport: (p: { type: "students" | "attendance" | "fees"; format: "csv" | "xlsx" | "pdf"; branch_id?: string; date?: string }) => {
    const q = new URLSearchParams({ type: p.type, format: p.format });
    if (p.branch_id) q.set("branch_id", p.branch_id);
    if (p.date) q.set("date", p.date);
    return requestFile(`/exports?${q}`);
  },
  listAnnouncements: () => request("/announcements"),
  // --- Courses & Batches ---
  listCourses: (includeInactive = false) => request(`/courses${includeInactive ? "?include_inactive=1" : ""}`),
  createCourse: (b: any) => request("/courses", { method: "POST", ...body(b) }),
  updateCourse: (id: string, b: any) => request(`/courses/${id}`, { method: "PUT", ...body(b) }),
  deleteCourse: (id: string) => request(`/courses/${id}`, { method: "DELETE" }),
  listBatches: (p: { branch_id?: string; course_id?: string } = {}) => {
    const q = new URLSearchParams(); if (p.branch_id) q.set("branch_id", p.branch_id); if (p.course_id) q.set("course_id", p.course_id);
    return request(`/batches${q.toString() ? `?${q}` : ""}`);
  },
  createBatch: (b: any) => request("/batches", { method: "POST", ...body(b) }),
  updateBatch: (id: string, b: any) => request(`/batches/${id}`, { method: "PUT", ...body(b) }),
  deleteBatch: (id: string) => request(`/batches/${id}`, { method: "DELETE" }),
  // --- Subscription (Razorpay) ---
  listPlans: () => request("/plans"),
  createSubscriptionOrder: (b: { plan_code: string; months: number }) => request("/subscription/order", { method: "POST", ...body(b) }),
  verifySubscription: (b: any) => request("/subscription/verify", { method: "POST", ...body(b) }),
  // --- PRD additions ---
  changePassword: (b: any) => request("/auth/change-password", { method: "POST", ...body(b) }),
  resetTrainerPassword: (id: string) => request(`/trainers/${id}/reset-password`, { method: "POST", ...body({}) }),
  transferStudent: (id: string, branch_id: string) => request(`/students/${id}/transfer`, { method: "POST", ...body({ branch_id }) }),
  listAudit: (skip = 0, limit = 50) => request(`/audit?skip=${skip}&limit=${limit}`),
  uploadSign: (folder = "am360") => request("/uploads/sign", { method: "POST", ...body({ folder }) }),
  // --- Notifications (WhatsApp) ---
  sendWhatsApp: (b: { branchId: string; recipientType: "PARENTS" | "STUDENTS" | "BOTH"; message: string }) =>
    request("/notifications/whatsapp/send", { method: "POST", ...body(b) }),
  listNotificationHistory: (skip = 0, limit = 50) => request(`/notifications/history?skip=${skip}&limit=${limit}`),
};

// Upload an image to Cloudinary (signed) and return its hosted URL. No base64 in the DB.
export async function uploadImage(file: File, folder = "am360"): Promise<string> {
  const sig = await api.uploadSign(folder);
  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", sig.api_key);
  fd.append("timestamp", String(sig.timestamp));
  fd.append("signature", sig.signature);
  fd.append("folder", sig.folder);
  const res = await fetch(sig.upload_url, { method: "POST", body: fd });
  const data = await res.json();
  if (!data.secure_url) throw new Error(data?.error?.message || "Upload failed");
  return data.secure_url as string;
}
