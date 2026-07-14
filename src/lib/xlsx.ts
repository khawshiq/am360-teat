// A real .xlsx writer, with no dependency.
//
// An .xlsx IS a ZIP of XML parts, and Node already ships the only hard part (DEFLATE,
// in node:zlib). So instead of pulling in exceljs/SheetJS — hundreds of KB of
// serverless bundle to write six small XML files — we write the six XML files.
//
// What this buys over CSV, and why it is worth the code: money lands as a NUMBER with
// a ₹ format, so Excel can SUM a column. A CSV of "₹3,000" is a string, and the first
// thing an academy owner does with a fee export is try to total it.
//
// Not a general spreadsheet library. One sheet, inline strings (no sharedStrings
// table), a header band, a frozen header row and an autofilter. That is the report.

import { deflateRawSync } from "node:zlib";

export type ColType = "text" | "money" | "number";
export type Column = { key: string; label: string; type?: ColType };

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// Minimal ZIP (deflate, no data descriptors, no zip64 — a report is never 4GB).
function zip(entries: { name: string; data: Buffer }[]): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");
    const comp = deflateRawSync(e.data);
    const crc = crc32(e.data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);          // version needed
    local.writeUInt16LE(0, 6);           // flags
    local.writeUInt16LE(8, 8);           // method: deflate
    local.writeUInt16LE(0, 10);          // mod time
    local.writeUInt16LE(0, 12);          // mod date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);          // extra length
    parts.push(local, name, comp);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);             // version made by
    cd.writeUInt16LE(20, 6);             // version needed
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(comp.length, 20);
    cd.writeUInt32LE(e.data.length, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, name);

    offset += local.length + name.length + comp.length;
  }

  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cdBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...parts, cdBuf, end]);
}

const esc = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    // Excel rejects raw control characters outright — the file just won't open.
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");

// 0 -> A, 25 -> Z, 26 -> AA
function colName(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; ) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

// Style indices into cellXfs below. Keep in sync with STYLES.
const S = { body: 0, academy: 1, title: 2, meta: 3, header: 4, money: 5 } as const;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;₹&quot;#,##0"/></numFmts>
<fonts count="5">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="16"/><color rgb="FF10233F"/><name val="Calibri"/></font>
<font><b/><sz val="12"/><color rgb="FF10233F"/><name val="Calibri"/></font>
<font><sz val="10"/><color rgb="FF5D7086"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1461CE"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="4" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
</styleSheet>`;

export type Sheet = {
  academy: string;
  title: string;
  subtitle: string;
  columns: Column[];
  rows: Record<string, any>[];
};

export function buildXlsx(s: Sheet): Buffer {
  const nCols = s.columns.length;
  const last = colName(nCols - 1);

  // Rows 1-3 are the letterhead, 4 is blank, 5 is the header band, data from 6.
  const HEADER_ROW = 5;
  const cells: string[] = [];

  const textCell = (ref: string, style: number, v: string) =>
    `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  const numCell = (ref: string, style: number, v: number) =>
    `<c r="${ref}" s="${style}"><v>${Number.isFinite(v) ? v : 0}</v></c>`;

  cells.push(`<row r="1" ht="21" customHeight="1">${textCell("A1", S.academy, s.academy)}</row>`);
  cells.push(`<row r="2" ht="16" customHeight="1">${textCell("A2", S.title, s.title)}</row>`);
  cells.push(`<row r="3">${textCell("A3", S.meta, s.subtitle)}</row>`);
  cells.push(`<row r="4"/>`);

  cells.push(`<row r="${HEADER_ROW}" ht="20" customHeight="1">${
    s.columns.map((c, i) => textCell(`${colName(i)}${HEADER_ROW}`, S.header, c.label)).join("")
  }</row>`);

  s.rows.forEach((r, ri) => {
    const rowNum = HEADER_ROW + 1 + ri;
    const cs = s.columns.map((c, ci) => {
      const ref = `${colName(ci)}${rowNum}`;
      const v = r[c.key];
      // Money and numbers go in as NUMBERS. This is the whole point of the format:
      // a column you can sum, not text that looks like money.
      if (c.type === "money") return numCell(ref, S.money, Number(v) || 0);
      if (c.type === "number") return numCell(ref, S.body, Number(v) || 0);
      return textCell(ref, S.body, v == null ? "" : String(v));
    }).join("");
    cells.push(`<row r="${rowNum}">${cs}</row>`);
  });

  // Width from the widest cell in the column, clamped so one long address doesn't
  // blow the sheet out to 200 characters.
  const cols = s.columns.map((c, i) => {
    const widest = s.rows.reduce((m, r) => Math.max(m, String(r[c.key] ?? "").length), c.label.length);
    const w = Math.min(46, Math.max(10, widest + 3));
    return `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`;
  }).join("");

  // NOTE: the schema fixes this order — cols, sheetData, autoFilter, THEN mergeCells.
  // Swap autoFilter and mergeCells and Excel calls the file corrupt.
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetViews><sheetView workbookViewId="0" showGridLines="0">
<pane ySplit="${HEADER_ROW}" topLeftCell="A${HEADER_ROW + 1}" activePane="bottomLeft" state="frozen"/>
</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${cells.join("")}</sheetData>
<autoFilter ref="A${HEADER_ROW}:${last}${HEADER_ROW}"/>
<mergeCells count="3">
<mergeCell ref="A1:${last}1"/><mergeCell ref="A2:${last}2"/><mergeCell ref="A3:${last}3"/>
</mergeCells>
</worksheet>`;

  const B = (str: string) => Buffer.from(str, "utf8");

  return zip([
    { name: "[Content_Types].xml", data: B(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`) },
    { name: "_rels/.rels", data: B(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`) },
    { name: "xl/workbook.xml", data: B(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${esc(sheetName(s.title))}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`) },
    { name: "xl/_rels/workbook.xml.rels", data: B(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`) },
    { name: "xl/styles.xml", data: B(STYLES) },
    { name: "xl/worksheets/sheet1.xml", data: B(sheet) },
  ]);
}

// Excel sheet names: max 31 chars, and : \ / ? * [ ] are illegal.
function sheetName(title: string): string {
  return (title.replace(/[:\\/?*\[\]]/g, "-").slice(0, 31) || "Report");
}
