import { csvCell } from "./adminOperations";
import { csvToRows, downloadExcelWorkbook } from "../shared/excelExport";

/** Same encoder for reservation, physical-loan and access exports. */
export function transactionCsv(rows: ReadonlyArray<ReadonlyArray<string | number>>) {
  const encode = (value: string | number) => {
    const text = String(value ?? "");
    return csvCell(/^[\s]*[=+\-@]|^[\t\r\n]/.test(text) ? `'${text}` : text);
  };
  return `\uFEFF${rows.map(row => row.map(encode).join(",")).join("\r\n")}`;
}

export function excelTransactionCsv(csv: string) {
  const content = csv.startsWith("\uFEFF") ? csv.slice(1) : csv;
  const excelReady = content.startsWith("sep=,\r\n")
    ? content
    : `sep=,\r\n${content}`;
  return `\uFEFF${excelReady}`;
}

/**
 * Existing callers keep this name for compatibility, but human-facing exports are
 * downloaded as styled XLSX workbooks because CSV cannot retain table styling.
 */
export function downloadTransactionCsv(csv: string, filename: string) {
  downloadExcelWorkbook({
    filename,
    sheetName: "Data",
    rows: csvToRows(csv),
    headerRows: [0],
    freezeRows: 1,
    autoFilter: true,
  });
}
