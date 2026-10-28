import { csvCell } from "./adminOperations";

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

export function downloadTransactionCsv(csv: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([excelTransactionCsv(csv)], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  try {
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}
