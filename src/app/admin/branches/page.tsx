"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import Pager, { usePager } from "@/components/Pager";
import RowMenu from "@/components/RowMenu";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";

const emptyForm = { name: "", address: "", phone: "", branch_code: "", working_hours: "" };

export default function Branches() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [delTarget, setDelTarget] = useState<any>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState("");

  const load = () => api.listBranches(showInactive).then(setItems).catch(e => setErr(e.message));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [showInactive]);
  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });
  const reset = () => { setForm(emptyForm); setEditId(null); };
  const save = async () => {
    setErr("");
    try { editId ? await api.updateBranch(editId, form) : await api.createBranch(form); reset(); load(); }
    catch (e: any) { setErr(e.message); }
  };
  const edit = (b: any) => { setEditId(b.id); setForm({ name: b.name, address: b.address || "", phone: b.phone || "", branch_code: b.branch_code || "", working_hours: b.working_hours || "" }); };
  const openDelete = (b: any) => { setDelTarget(b); setDelErr(""); };
  const confirmDelete = async () => {
    setDelBusy(true); setDelErr("");
    try { await api.deleteBranch(delTarget.id); setDelTarget(null); load(); }
    catch (e: any) { setDelErr(e.message); }
    finally { setDelBusy(false); }
  };
  const toggleStatus = async (b: any) => { try { await api.updateBranch(b.id, { status: b.status === "active" ? "inactive" : "active" }); load(); } catch (e: any) { setErr(e.message); } };
  const { page, setPage, totalPages, start, end } = usePager(items.length);

  return (
    <div className="split sidebar">
      <div className="card" style={{ alignSelf: "start" }}>
        <div className="section-title">{editId ? "Edit branch" : "Add branch"}</div>
        <div>
          <div className="field"><label>Name</label><input value={form.name} onChange={set("name")} /></div>
          <div className="field"><label>Branch code</label><input value={form.branch_code} onChange={set("branch_code")} /></div>
          <div className="field"><label>Address</label><input value={form.address} onChange={set("address")} /></div>
          <div className="field"><label>Phone</label><input value={form.phone} onChange={set("phone")} /></div>
          <div className="field"><label>Working hours</label><input placeholder="e.g. Mon–Sat 6am–9pm" value={form.working_hours} onChange={set("working_hours")} /></div>
          {err && <div className="err">{err}</div>}
          <div className="row">
            <button onClick={save} disabled={!form.name}>{editId ? "Update" : "Add"}</button>
            {editId && <button className="secondary" onClick={reset}>Cancel</button>}
          </div>
        </div>
      </div>
      <div>
        <label className="row" style={{ fontSize: 13, gap: 6, marginBottom: 10 }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} /> Show inactive
        </label>
        {items.slice(start, end).map(b => (
          <div className="list-item" key={b.id}>
            <Link href={`/admin/branch/${b.id}`} style={{ flex: 1 }}>
              <div><b>{b.name}</b> {b.branch_code && <span className="muted" style={{ fontSize: 12 }}>({b.branch_code})</span>} {b.status !== "active" && <span className="badge inactive">inactive</span>} <span className="muted" style={{ fontSize: 12 }}>→ open</span></div>
              <div className="muted" style={{ fontSize: 13 }}>{b.address || "—"} · {b.phone || "—"}{b.working_hours ? ` · ${b.working_hours}` : ""}</div>
            </Link>
            <RowMenu label={`Actions for ${b.name}`}>
              {close => (
                <>
                  <button className="menu-item" role="menuitem" onClick={() => { edit(b); close(); }}><span>Edit</span></button>
                  <button className="menu-item" role="menuitem" onClick={() => { toggleStatus(b); close(); }}>
                    <span>{b.status === "active" ? "Deactivate" : "Activate"}</span>
                  </button>
                  <button className="menu-item" role="menuitem" onClick={() => { openDelete(b); close(); }}>
                    <span style={{ color: "var(--danger)" }}>Delete</span>
                  </button>
                </>
              )}
            </RowMenu>
          </div>
        ))}
        {!items.length && <p className="muted">No branches yet — add your first one.</p>}
        <Pager page={page} setPage={setPage} totalPages={totalPages} />
      </div>
      {delTarget && (
        <ConfirmDeleteModal
          title="Delete branch"
          message={<>This permanently deletes <b>{delTarget.name}</b> along with all of its students, attendance and fees. This cannot be undone.</>}
          busy={delBusy}
          error={delErr}
          onConfirm={confirmDelete}
          onClose={() => setDelTarget(null)}
        />
      )}
    </div>
  );
}
