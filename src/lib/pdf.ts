// A real PDF writer, with no dependency.
//
// PDF is a text format with a byte-offset table at the end, and the 14 "standard"
// fonts (Helvetica among them) need no embedding — every reader already has them. So
// a paginated table report is a few hundred lines, not a 1MB serverless dependency.
//
// ⚠️ Two limits that come with skipping font embedding, both deliberate:
//   1. Text is WinAnsi (Latin-1). A rupee sign (₹, U+20B9) does not exist in it, so the
//      PDF prints "Rs" where the screen and the .xlsx print "₹". Anything else outside
//      Latin-1 — a Telugu or Devanagari academy name — becomes "?".
//   2. Fixing that means embedding and subsetting a TrueType font, which is a different
//      order of complexity. If academies start needing non-Latin PDFs, that is the
//      moment to reach for a library — not before.

import type { Column, ColType } from "./xlsx";

// Helvetica advance widths (units/1000) for ASCII 32–126. Without these you cannot
// know how wide a string renders, so columns either overflow into each other or get
// padded by guesswork. Bold is approximated at +6%, then truncated, so a slight
// under-estimate can never overflow — it only truncates a character early.
const W: Record<string, number> = {};
{
  const widths = [
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
    1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
    667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
    333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
    556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
  ];
  for (let i = 0; i < widths.length; i++) W[String.fromCharCode(32 + i)] = widths[i];
}

const charW = (ch: string, bold: boolean) => (W[ch] ?? 500) * (bold ? 1.06 : 1);
const textWidth = (s: string, size: number, bold = false) => {
  let w = 0;
  for (const ch of s) w += charW(ch, bold);
  return (w * size) / 1000;
};

// Drop to Latin-1; anything else would render as garbage, so make the loss explicit.
function toWinAnsi(s: string): string {
  return String(s ?? "")
    .replace(/₹/g, "Rs")
    .replace(/[–—]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/·/g, "-")
    .split("")
    .map(c => (c.charCodeAt(0) <= 255 ? c : "?"))
    .join("");
}

const pdfStr = (s: string) => toWinAnsi(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

function fit(s: string, max: number, size: number, bold = false): string {
  const t = toWinAnsi(s);
  if (textWidth(t, size, bold) <= max) return t;
  let out = "";
  for (const ch of t) {
    if (textWidth(out + ch + "...", size, bold) > max) break;
    out += ch;
  }
  return out.trimEnd() + "...";
}

// The route hands money over as a raw number, because the .xlsx needs it summable. A PDF
// is read, not calculated: format it here. "Rs" rather than "₹" — see the WinAnsi note
// above — and Indian digit grouping (3,000 / 1,00,000), which is what an academy in
// Hyderabad expects to see on a fee sheet.
function cellText(v: any, type?: ColType): string {
  if (v == null || v === "") return "";
  if (type === "money") return "Rs " + Math.round(Number(v) || 0).toLocaleString("en-IN");
  if (type === "number") return (Number(v) || 0).toLocaleString("en-IN");
  return String(v);
}

export type Doc = {
  academy: string;
  title: string;
  subtitle: string;
  columns: Column[];
  rows: Record<string, any>[];
  /** Wide tables get landscape; the caller decides from the column count. */
  landscape?: boolean;
};

const A4 = { w: 595.28, h: 841.89 };

// PDF wants 0–1 RGB, so the design tokens are restated here rather than referenced.
// Keep them in step with globals.css — the export is the academy's letterhead, and a
// blue header band on a violet-branded app looks like someone else's document.
const INK = "0.11 0.106 0.227";      // --text   #1c1b3a
const MUTED = "0.388 0.388 0.549";   // --muted  #63638c
const FAINT = "0.612 0.612 0.733";   // --faint  #9c9cbb
const ACCENT = "0.424 0.361 0.906";  // --accent #6c5ce7
const ZEBRA = "0.961 0.969 0.984";   // --surface-2 #f5f7fb
const LINE = "0.859 0.878 0.925";    // --border #dbe0ec

export function buildPdf(doc: Doc): Buffer {
  const PW = doc.landscape ? A4.h : A4.w;
  const PH = doc.landscape ? A4.w : A4.h;
  const M = 36;                       // margin
  const CW = PW - M * 2;              // content width

  const FS = 8.5;                     // body size
  const ROW_H = 17;
  const HEAD_H = 20;

  // Column widths: proportional to the widest thing in each column (header included),
  // then scaled to exactly fill the content width.
  // Measure the RENDERED text, not the raw value — a money column holds 3000 but prints
  // "Rs 3,000", and sizing on the former truncates the latter.
  const natural = doc.columns.map(c => {
    const header = textWidth(toWinAnsi(c.label), FS, true);
    const body = doc.rows.reduce((m, r) => Math.max(m, textWidth(toWinAnsi(cellText(r[c.key], c.type)), FS)), 0);
    return Math.max(38, Math.min(190, Math.max(header, body) + 12));
  });
  const total = natural.reduce((a, b) => a + b, 0);
  const widths = natural.map(w => (w / total) * CW);

  const pages: string[] = [];
  let ops: string[] = [];
  let y = 0;

  const startPage = (first: boolean) => {
    ops = [];
    y = PH - M;

    if (first) {
      // Letterhead. The academy owns this document — its name leads, at 17pt, above
      // a brand rule. Then what the report is, then when it was run.
      ops.push(`BT /F2 17 Tf ${INK} rg 1 0 0 1 ${M} ${y - 14} Tm (${pdfStr(doc.academy)}) Tj ET`);
      y -= 20;
      ops.push(`${ACCENT} RG 2 w ${M} ${y - 4} m ${M + 46} ${y - 4} l S`);
      y -= 16;
      ops.push(`BT /F2 12 Tf ${INK} rg 1 0 0 1 ${M} ${y - 10} Tm (${pdfStr(doc.title)}) Tj ET`);
      y -= 16;
      ops.push(`BT /F1 8.5 Tf ${MUTED} rg 1 0 0 1 ${M} ${y - 8} Tm (${pdfStr(doc.subtitle)}) Tj ET`);
      y -= 20;
    } else {
      ops.push(`BT /F2 10 Tf ${MUTED} rg 1 0 0 1 ${M} ${y - 10} Tm (${pdfStr(doc.academy + " - " + doc.title)}) Tj ET`);
      y -= 22;
    }

    // Header band — repeated on every page, so page 4 of a fee export is still readable.
    ops.push(`${ACCENT} rg ${M} ${y - HEAD_H} ${CW} ${HEAD_H} re f`);
    let x = M;
    doc.columns.forEach((c, i) => {
      const t = fit(c.label, widths[i] - 10, FS, true);
      ops.push(`BT /F2 ${FS} Tf 1 1 1 rg 1 0 0 1 ${x + 5} ${y - HEAD_H + 6} Tm (${pdfStr(t)}) Tj ET`);
      x += widths[i];
    });
    y -= HEAD_H;
  };

  const endPage = () => { pages.push(ops.join("\n")); };

  startPage(true);

  doc.rows.forEach((r, ri) => {
    if (y - ROW_H < M + 24) { endPage(); startPage(false); }

    // Zebra striping: the eye tracks a 9-column row across a page far better with it.
    if (ri % 2 === 1) ops.push(`${ZEBRA} rg ${M} ${y - ROW_H} ${CW} ${ROW_H} re f`);
    ops.push(`${LINE} RG 0.5 w ${M} ${y - ROW_H} m ${M + CW} ${y - ROW_H} l S`);

    let x = M;
    doc.columns.forEach((c, i) => {
      const money = c.type === "money" || c.type === "number";
      const t = fit(cellText(r[c.key], c.type), widths[i] - 10, FS);
      // Numbers right-align. A column of amounts that doesn't line up on the decimal
      // is unreadable, and this is a document people add up.
      const tx = money ? x + widths[i] - 5 - textWidth(t, FS) : x + 5;
      ops.push(`BT /F1 ${FS} Tf ${INK} rg 1 0 0 1 ${tx.toFixed(2)} ${y - ROW_H + 5.5} Tm (${pdfStr(t)}) Tj ET`);
      x += widths[i];
    });
    y -= ROW_H;
  });

  if (!doc.rows.length) {
    ops.push(`BT /F1 9 Tf ${MUTED} rg 1 0 0 1 ${M + 5} ${y - 16} Tm (No records.) Tj ET`);
  }
  endPage();

  // Footers need the total, so they go on after every page exists.
  const total_pages = pages.length;
  const withFooters = pages.map((content, i) => {
    const left = pdfStr(`Generated ${doc.subtitle.split("·").pop()?.trim() || ""}`);
    const right = pdfStr(`Page ${i + 1} of ${total_pages}`);
    const rw = textWidth(toWinAnsi(`Page ${i + 1} of ${total_pages}`), 8);
    return content +
      `\nBT /F1 8 Tf ${FAINT} rg 1 0 0 1 ${M} ${M - 12} Tm (${left}) Tj ET` +
      `\nBT /F1 8 Tf ${FAINT} rg 1 0 0 1 ${(PW - M - rw).toFixed(2)} ${M - 12} Tm (${right}) Tj ET`;
  });

  return assemble(withFooters, PW, PH);
}

// Object 1 catalog, 2 pages, 3/4 fonts, then a page + content stream per page.
function assemble(pages: string[], PW: number, PH: number): Buffer {
  const objs: string[] = [];
  const pageIds = pages.map((_, i) => 5 + i * 2);

  objs[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objs[2] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objs[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
  objs[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;

  pages.forEach((content, i) => {
    const pid = pageIds[i];
    objs[pid] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW.toFixed(2)} ${PH.toFixed(2)}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pid + 1} 0 R >>`;
    objs[pid + 1] = `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`;
  });

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 1; i < objs.length; i++) {
    if (!objs[i]) continue;
    offsets[i] = Buffer.byteLength(out, "latin1");
    out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }

  const xrefAt = Buffer.byteLength(out, "latin1");
  const count = objs.length;
  out += `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let i = 1; i < count; i++) {
    out += objs[i]
      ? `${String(offsets[i]).padStart(10, "0")} 00000 n \n`
      : `0000000000 65535 f \n`;   // a free slot, so the table still lines up
  }
  out += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;

  return Buffer.from(out, "latin1");
}
