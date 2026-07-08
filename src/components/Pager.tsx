"use client";
import { useEffect, useState } from "react";

const PAGE_SIZE = 20;

export function usePager(itemCount: number) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(itemCount / PAGE_SIZE));
  useEffect(() => { if (page >= totalPages) setPage(0); }, [itemCount, totalPages, page]);
  const start = page * PAGE_SIZE;
  return { page, setPage, totalPages, start, end: start + PAGE_SIZE };
}

export default function Pager({ page, setPage, totalPages }: { page: number; setPage: (p: number) => void; totalPages: number }) {
  if (totalPages <= 1) return null;
  return (
    <div className="row" style={{ justifyContent: "space-between", marginTop: 14 }}>
      <button className="secondary" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>Prev</button>
      <span className="muted" style={{ fontSize: 13 }}>Page {page + 1} of {totalPages}</span>
      <button className="secondary" onClick={() => setPage(page + 1)} disabled={page + 1 >= totalPages}>Next</button>
    </div>
  );
}
