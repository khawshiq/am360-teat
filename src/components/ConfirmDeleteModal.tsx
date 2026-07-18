"use client";
import { useState } from "react";
import Modal from "./Modal";

// A guarded delete: the action only unlocks once the user types the confirm word
// (default "delete"). Used for irreversible row deletes — a branch and everything
// under it — where a plain confirm() click is too cheap for how much it destroys.
export default function ConfirmDeleteModal({
  title, message, confirmWord = "delete", busy, error, onConfirm, onClose,
}: {
  title: string;
  message: React.ReactNode;
  confirmWord?: string;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const matches = text.trim().toLowerCase() === confirmWord.toLowerCase();
  const ready = matches && !busy;
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ fontSize: 14, marginTop: 0 }}>{message}</p>
      <div className="field">
        <label>Type <b>{confirmWord}</b> to confirm</label>
        <input autoFocus value={text} placeholder={confirmWord}
               onChange={e => setText(e.target.value)}
               onKeyDown={e => { if (e.key === "Enter" && ready) onConfirm(); }} />
      </div>
      {error && <div className="err">{error}</div>}
      <div className="row">
        <button className="danger" onClick={onConfirm} disabled={!ready}>{busy ? "Deleting…" : "Delete"}</button>
        <button className="secondary" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}
