"use client";

// Hand a fetched blob to the browser as a download. The bytes are built on the server
// (see /api/exports) — this file only does the click-a-hidden-anchor dance.
//
// Replaces the old src/lib/csv.ts, which built the CSV in the browser from whatever the
// screen happened to have loaded. That is why the old export had no academy name and no
// derived fee status: the browser didn't have either.
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
