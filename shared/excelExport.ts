export type ExcelCell = string | number | null | undefined;

export type ExcelWorkbookOptions = {
  filename: string;
  sheetName?: string;
  rows: ReadonlyArray<ReadonlyArray<ExcelCell>>;
  headerRows?: ReadonlyArray<number>;
  titleRows?: ReadonlyArray<number>;
  freezeRows?: number;
  autoFilter?: boolean;
};

const encoder = new TextEncoder();

function xml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cleanXmlText(value: string) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function columnName(index: number) {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function safeSheetName(value: string) {
  const cleaned = value.replace(/[\\/*?:[\]]/g, " ").trim() || "Data";
  return cleaned.slice(0, 31);
}

function replaceExtension(filename: string, extension: string) {
  return /\.[^.]+$/.test(filename)
    ? filename.replace(/\.[^.]+$/, extension)
    : `${filename}${extension}`;
}

function asExcelFilename(filename: string) {
  return replaceExtension(filename, ".xlsx");
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number) {
  return Uint8Array.of(value & 0xff, (value >>> 8) & 0xff);
}

function u32(value: number) {
  return Uint8Array.of(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
}

function concat(parts: ReadonlyArray<Uint8Array>) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

type ZipEntry = { name: string; data: Uint8Array };

function zipStore(entries: ReadonlyArray<ZipEntry>) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const localHeader = concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(entry.data.length), u32(entry.data.length),
      u16(name.length), u16(0), name,
    ]);
    localParts.push(localHeader, entry.data);

    centralParts.push(concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(entry.data.length), u32(entry.data.length),
      u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    ]));
    offset += localHeader.length + entry.data.length;
  }

  const central = concat(centralParts);
  const local = concat(localParts);
  const end = concat([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(central.length), u32(local.length), u16(0),
  ]);
  return concat([local, central, end]);
}

function widthForColumn(rows: ReadonlyArray<ReadonlyArray<ExcelCell>>, column: number) {
  let longest = 0;
  for (const row of rows) {
    const value = row[column];
    const text = value === null || value === undefined ? "" : String(value);
    longest = Math.max(longest, ...text.split(/\r?\n/).map(part => part.length));
  }
  return Math.min(40, Math.max(12, Math.ceil(longest * 1.08 + 2)));
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><name val="Outfit"/><color rgb="FF000633"/></font>
    <font><b/><sz val="11"/><name val="Outfit"/><color rgb="FFFFFFFF"/></font>
    <font><b/><sz val="15"/><name val="Outfit"/><color rgb="FFFFFFFF"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF000633"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF4F4F7"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFDFDFDF"/></left>
      <right style="thin"><color rgb="FFDFDFDF"/></right>
      <top style="thin"><color rgb="FFDFDFDF"/></top>
      <bottom style="thin"><color rgb="FFDFDFDF"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="4">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function worksheetXml(options: ExcelWorkbookOptions) {
  const rows = options.rows.length ? options.rows : [[""]];
  const headerRows = new Set(options.headerRows ?? [0]);
  const titleRows = new Set(options.titleRows ?? []);
  const maxColumns = Math.max(1, ...rows.map(row => row.length));
  const lastColumn = columnName(maxColumns - 1);
  const lastRow = rows.length;
  const cols = Array.from({ length: maxColumns }, (_, index) =>
    `<col min="${index + 1}" max="${index + 1}" width="${widthForColumn(rows, index)}" customWidth="1"/>`,
  ).join("");

  const sheetRows = rows.map((row, rowIndex) => {
    const title = titleRows.has(rowIndex);
    const header = headerRows.has(rowIndex);
    const style = title ? 3 : header ? 1 : rowIndex % 2 === 0 ? 2 : 0;
    const height = title ? 30 : header ? 26 : 22;
    const cells = Array.from({ length: maxColumns }, (_, columnIndex) => {
      const value = row[columnIndex];
      const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
      if (typeof value === "number" && Number.isFinite(value)) {
        return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
      }
      const text = cleanXmlText(value === null || value === undefined ? "" : String(value));
      return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(text)}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}" ht="${height}" customHeight="1">${cells}</row>`;
  }).join("");

  const freezeRows = Math.max(0, Math.min(options.freezeRows ?? 1, rows.length));
  const pane = freezeRows
    ? `<pane ySplit="${freezeRows}" topLeftCell="A${freezeRows + 1}" activePane="bottomLeft" state="frozen"/>`
    : "";
  const autoFilter = options.autoFilter === false || rows.length < 2
    ? ""
    : `<autoFilter ref="A1:${lastColumn}${lastRow}"/>`;
  const merges = [...titleRows]
    .filter(row => row >= 0 && row < rows.length && maxColumns > 1)
    .map(row => `<mergeCell ref="A${row + 1}:${lastColumn}${row + 1}"/>`);
  const mergeXml = merges.length ? `<mergeCells count="${merges.length}">${merges.join("")}</mergeCells>` : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0">${pane}</sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="22"/>
  <cols>${cols}</cols>
  <sheetData>${sheetRows}</sheetData>
  ${mergeXml}
  ${autoFilter}
  <pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
</worksheet>`;
}

export function buildExcelWorkbook(options: ExcelWorkbookOptions) {
  const sheetName = safeSheetName(options.sheetName ?? "Data");
  const files: ZipEntry[] = [
    {
      name: "[Content_Types].xml",
      data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`),
    },
    {
      name: "_rels/.rels",
      data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    },
    {
      name: "xl/workbook.xml",
      data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${xml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    },
    { name: "xl/styles.xml", data: encoder.encode(stylesXml()) },
    { name: "xl/worksheets/sheet1.xml", data: encoder.encode(worksheetXml(options)) },
  ];
  return zipStore(files);
}

export function downloadExcelWorkbook(options: ExcelWorkbookOptions) {
  const content = buildExcelWorkbook(options);
  const url = URL.createObjectURL(new Blob([content], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }));
  const link = document.createElement("a");
  try {
    link.href = url;
    link.download = asExcelFilename(options.filename);
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}

export function csvToRows(csv: string): ExcelCell[][] {
  let source = csv.startsWith("\uFEFF") ? csv.slice(1) : csv;
  source = source.replace(/^sep=,\r?\n/i, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell || row.length || source.endsWith(",")) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}
