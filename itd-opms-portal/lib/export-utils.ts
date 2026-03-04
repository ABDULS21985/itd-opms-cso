export interface ExportColumn {
  key: string;
  header: string;
  format?: (value: any, row: any) => string;
}

function escapeCSV(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function extractValue<T extends Record<string, any>>(
  row: T,
  key: string,
): string {
  const parts = key.split(".");
  let val: any = row;
  for (const part of parts) {
    if (val == null) return "";
    val = val[part];
  }
  if (val == null) return "";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  filename: string,
): void {
  const headers = columns.map((c) => escapeCSV(c.header));
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const raw = extractValue(row, col.key);
        const val = col.format ? col.format(raw, row) : raw;
        return escapeCSV(val);
      })
      .join(","),
  );
  const csv = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, `${filename}.csv`);
}

export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  filename: string,
  sheetName = "Sheet1",
): void {
  const escapeXML = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const headerCells = columns
    .map(
      (c) =>
        `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXML(c.header)}</Data></Cell>`,
    )
    .join("");

  const dataRows = data
    .map((row) => {
      const cells = columns
        .map((col) => {
          const raw = extractValue(row, col.key);
          const val = col.format ? col.format(raw, row) : raw;
          const isNum = !isNaN(Number(val)) && val.trim() !== "";
          const type = isNum ? "Number" : "String";
          return `<Cell><Data ss:Type="${type}">${escapeXML(val)}</Data></Cell>`;
        })
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Font ss:FontName="Calibri" ss:Size="11"/>
    </Style>
    <Style ss:ID="header">
      <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
      <Interior ss:Color="#F3F4F6" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
      </Borders>
    </Style>
  </Styles>
  <Worksheet ss:Name="${escapeXML(sheetName)}">
    <Table>
      <Row ss:StyleID="header">${headerCells}</Row>
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
  triggerDownload(blob, `${filename}.xls`);
}

export function exportToPDF<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn[],
  title: string,
): void {
  const escapeHTML = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const headerCells = columns
    .map((c) => `<th>${escapeHTML(c.header)}</th>`)
    .join("");

  const dataRows = data
    .map((row, i) => {
      const cells = columns
        .map((col) => {
          const raw = extractValue(row, col.key);
          const val = col.format ? col.format(raw, row) : raw;
          return `<td>${escapeHTML(val)}</td>`;
        })
        .join("");
      return `<tr class="${i % 2 === 1 ? "alt" : ""}">${cells}</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHTML(title)}</title>
  <style>
    @media print {
      @page { margin: 1cm; size: landscape; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; color: #1a1a1a; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .meta { font-size: 11px; color: #6b7280; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f3f4f6; text-align: left; padding: 8px 10px; border-bottom: 2px solid #d1d5db; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
    td { padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
    tr.alt td { background: #f9fafb; }
    .footer { margin-top: 16px; font-size: 10px; color: #9ca3af; text-align: right; }
  </style>
</head>
<body>
  <h1>${escapeHTML(title)}</h1>
  <div class="meta">Exported on ${new Date().toLocaleString()} &middot; ${data.length} records</div>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${dataRows}</tbody>
  </table>
  <div class="footer">ITD-OPMS &middot; Generated Report</div>
  <script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)}</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
