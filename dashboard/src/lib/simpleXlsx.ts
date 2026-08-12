export type XlsxCell = string | number | boolean | null | undefined;
export type XlsxSheet = {
  name: string;
  rows: XlsxCell[][];
  widths?: number[];
  freezeHeader?: boolean;
  autoFilter?: boolean;
  rtl?: boolean;
};

type ZipEntry = { name: string; data: Uint8Array; crc: number; offset: number };

const encoder = new TextEncoder();

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}
function u32(value: number) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]);
}
function concat(parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = (date.getDate() & 31) | (((date.getMonth() + 1) & 15) << 5) | (((year - 1980) & 127) << 9);
  return { time, day };
}

function zipStore(files: Array<{ name: string; content: string }>) {
  const localParts: Uint8Array[] = [];
  const entries: ZipEntry[] = [];
  const { time, day } = dosDateTime();
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const header = concat([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(time), u16(day),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name,
    ]);
    entries.push({ name: file.name, data, crc, offset });
    localParts.push(header, data);
    offset += header.length + data.length;
  }

  const centralStart = offset;
  const centralParts: Uint8Array[] = [];
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const header = concat([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(time), u16(day),
      u32(entry.crc), u32(entry.data.length), u32(entry.data.length), u16(name.length),
      u16(0), u16(0), u16(0), u16(0), u32(0), u32(entry.offset), name,
    ]);
    centralParts.push(header);
    offset += header.length;
  }
  const centralSize = offset - centralStart;
  const end = concat([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(centralSize), u32(centralStart), u16(0),
  ]);
  return concat([...localParts, ...centralParts, end]);
}

function columnName(index: number) {
  let n = index + 1;
  let result = "";
  while (n > 0) { n -= 1; result = String.fromCharCode(65 + (n % 26)) + result; n = Math.floor(n / 26); }
  return result;
}

function sheetXml(sheet: XlsxSheet) {
  const maxColumns = Math.max(1, ...sheet.rows.map(row => row.length));
  const lastRow = Math.max(1, sheet.rows.length);
  const dimension = `A1:${columnName(maxColumns - 1)}${lastRow}`;
  const cols = sheet.widths?.length
    ? `<cols>${sheet.widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${Math.max(5, width)}" customWidth="1"/>`).join("")}</cols>`
    : "";
  const rows = sheet.rows.map((row, rowIndex) => {
    const cells = row.map((value, colIndex) => {
      if (value === null || value === undefined || value === "") return "";
      const ref = `${columnName(colIndex)}${rowIndex + 1}`;
      if (typeof value === "number" && Number.isFinite(value)) return `<c r="${ref}" s="${rowIndex === 0 ? 1 : 0}"><v>${value}</v></c>`;
      if (typeof value === "boolean") return `<c r="${ref}" t="b" s="${rowIndex === 0 ? 1 : 0}"><v>${value ? 1 : 0}</v></c>`;
      return `<c r="${ref}" t="inlineStr" s="${rowIndex === 0 ? 1 : 0}"><is><t xml:space="preserve">${xmlEscape(String(value))}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  const pane = sheet.freezeHeader ? `<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>` : "";
  const autoFilter = sheet.autoFilter && sheet.rows.length > 0 ? `<autoFilter ref="${dimension}"/>` : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="${dimension}"/><sheetViews><sheetView workbookViewId="0" rightToLeft="${sheet.rtl === false ? 0 : 1}">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/>${cols}<sheetData>${rows}</sheetData>${autoFilter}</worksheet>`;
}

function safeSheetName(name: string, used: Set<string>) {
  const base = name.replace(/[\\/?*\[\]:]/g, " ").trim().slice(0, 31) || "Sheet";
  let candidate = base;
  let i = 2;
  while (used.has(candidate)) candidate = `${base.slice(0, Math.max(1, 27 - String(i).length))} ${i++}`;
  used.add(candidate);
  return candidate;
}

export function downloadXlsx(filename: string, inputSheets: XlsxSheet[]) {
  if (typeof window === "undefined") return;
  const used = new Set<string>();
  const sheets = inputSheets.map(sheet => ({ ...sheet, name: safeSheetName(sheet.name, used) }));
  const sheetOverrides = sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  const workbookSheets = sheets.map((sheet, i) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("");
  const workbookRels = sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("");
  const stylesRelId = `rId${sheets.length + 1}`;

  const files: Array<{ name: string; content: string }> = [
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheetOverrides}</Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${workbookSheets}</sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRels}<Relationship Id="${stylesRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><name val="Arial"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center" readingOrder="2"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="right" vertical="center" readingOrder="2"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>` },
  ];
  sheets.forEach((sheet, i) => files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, content: sheetXml(sheet) }));

  const bytes = zipStore(files);
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
