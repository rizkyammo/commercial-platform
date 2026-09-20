import type { ReportColumn, ReportRow } from "./pdf-report";

// ============================ TYPES ============================

export type ExcelBuildOptions = {
  title: string;
  subtitle?: string;
  period?: string;
  generatedAt: string;
  generatedBy?: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  brandName?: string;
  brandSubtitle?: string;
};

// ============================ MAIN BUILDER ============================

export async function buildExcelReport(opts: ExcelBuildOptions) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();

  wb.creator = opts.brandName ?? "AmmoBiz";
  wb.created = new Date();

  const ws = wb.addWorksheet(opts.title.slice(0, 30), {
    views: [{ state: "frozen", ySplit: 1, xSplit: 0 }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.6,
        bottom: 0.6,
        header: 0.3,
        footer: 0.3,
      },
    },
  });

  const colCount = opts.columns.length;

  // ============================================================
  // ROW 1: Brand
  // ============================================================
  ws.mergeCells(1, 1, 1, colCount);
  const brandCell = ws.getCell(1, 1);
  brandCell.value = opts.brandName ?? "AmmoBiz";
  brandCell.font = {
    bold: true,
    size: 16,
    color: { argb: "FF1D1D1F" },
    name: "Calibri",
  };
  brandCell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 24;

  // ============================================================
  // ROW 2: Brand Subtitle
  // ============================================================
  ws.mergeCells(2, 1, 2, colCount);
  const subtitleCell = ws.getCell(2, 1);
  subtitleCell.value =
    opts.brandSubtitle ?? "Commercial Intelligence & Control Platform";
  subtitleCell.font = {
    size: 9,
    color: { argb: "FF6E6E73" },
    name: "Calibri",
  };
  subtitleCell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(2).height = 16;

  // ============================================================
  // ROW 3: Empty spacer
  // ============================================================
  ws.getRow(3).height = 6;

  // ============================================================
  // ROW 4: Report Title
  // ============================================================
  ws.mergeCells(4, 1, 4, colCount);
  const titleCell = ws.getCell(4, 1);
  titleCell.value = opts.title.toUpperCase();
  titleCell.font = {
    bold: true,
    size: 14,
    color: { argb: "FF1D1D1F" },
    name: "Calibri",
  };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(4).height = 22;

  // ============================================================
  // ROW 5: Report Subtitle
  // ============================================================
  ws.mergeCells(5, 1, 5, colCount);
  const reportSub = ws.getCell(5, 1);
  reportSub.value = opts.subtitle ?? "";
  reportSub.font = {
    size: 9,
    color: { argb: "FF8E8E93" },
    italic: true,
    name: "Calibri",
  };
  reportSub.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(5).height = 14;

  // ============================================================
  // ROW 6: Empty
  // ============================================================
  ws.getRow(6).height = 8;

  // ============================================================
  // ROW 7: Meta strip
  // ============================================================
  const metaRow = ws.getRow(7);
  metaRow.height = 18;
  const metaLeft = `Periode: ${opts.period ?? "—"}    |    Digenerate: ${opts.generatedAt}${opts.generatedBy ? ` oleh ${opts.generatedBy}` : ""}    |    ${opts.rows.length.toLocaleString("id-ID")} records`;
  ws.mergeCells(7, 1, 7, colCount);
  const metaCell = ws.getCell(7, 1);
  metaCell.value = metaLeft;
  metaCell.font = {
    size: 9,
    color: { argb: "FF6E6E73" },
    name: "Calibri",
  };
  metaCell.alignment = { vertical: "middle", horizontal: "left" };
  metaCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF6F6F7" },
  };

  // ============================================================
  // ROW 8: Empty
  // ============================================================
  ws.getRow(8).height = 8;

  let currentRow = 9;

  // ============================================================
  // TABLE HEADER
  // ============================================================
  const headerRowIdx = currentRow;
  const headerRow = ws.getRow(headerRowIdx);
  headerRow.height = 24;

  opts.columns.forEach((c, i) => {
    const cell = ws.getCell(headerRowIdx, i + 1);
    cell.value = c.label.toUpperCase();
    cell.font = {
      bold: true,
      size: 10,
      color: { argb: "FFFFFFFF" },
      name: "Calibri",
    };
    cell.alignment = {
      vertical: "middle",
      horizontal:
        c.align === "right"
          ? "right"
          : c.align === "center"
            ? "center"
            : "left",
      wrapText: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1D1D1F" },
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF1D1D1F" } },
      bottom: { style: "thin", color: { argb: "FF1D1D1F" } },
      left: { style: "thin", color: { argb: "FF1D1D1F" } },
      right: { style: "thin", color: { argb: "FF1D1D1F" } },
    };
  });

  // ============================================================
  // TABLE DATA
  // ============================================================
  const dataStartRow = headerRowIdx + 1;

  opts.rows.forEach((r, rowIdx) => {
    const rowNum = dataStartRow + rowIdx;
    const isZebra = rowIdx % 2 === 1;
    ws.getRow(rowNum).height = 18;

    opts.columns.forEach((c, i) => {
      const cell = ws.getCell(rowNum, i + 1);
      const raw = r[c.key];
      cell.value =
        raw === null || raw === undefined ? "" : (raw as string | number);

      cell.font = {
        size: 10,
        color: { argb: "FF1D1D1F" },
        name: "Calibri",
      };

      cell.alignment = {
        vertical: "middle",
        horizontal:
          c.align === "right"
            ? "right"
            : c.align === "center"
              ? "center"
              : "left",
      };

      if (c.format === "money" && typeof raw === "number") {
        cell.numFmt = '"Rp" #,##0.00';
      } else if (c.format === "number" && typeof raw === "number") {
        cell.numFmt = "#,##0.00";
      } else if (c.format === "percent" && typeof raw === "number") {
        cell.value = raw / 100;
        cell.numFmt = "0.00%";
      } else if (c.format === "date" && raw) {
        try {
          cell.value = new Date(String(raw));
          cell.numFmt = "dd mmm yyyy";
        } catch {
          /* leave as string */
        }
      }

      if (isZebra) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFAFAFB" },
        };
      }

      cell.border = {
        top: { style: "thin", color: { argb: "FFF2F2F4" } },
        bottom: { style: "thin", color: { argb: "FFF2F2F4" } },
        left: { style: "thin", color: { argb: "FFF2F2F4" } },
        right: { style: "thin", color: { argb: "FFF2F2F4" } },
      };
    });
  });

  // ============================================================
  // TOTALS ROW (untuk kolom money/number)
  // ============================================================
  const totalsIdx = dataStartRow + opts.rows.length;
  const totalsRow = ws.getRow(totalsIdx);
  totalsRow.height = 22;

  opts.columns.forEach((c, i) => {
    const cell = ws.getCell(totalsIdx, i + 1);

    if (i === 0) {
      cell.value = "TOTAL";
      cell.font = {
        bold: true,
        size: 10,
        color: { argb: "FF1D1D1F" },
        name: "Calibri",
      };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    } else if (
      (c.format === "money" || c.format === "number") &&
      opts.rows.length > 0
    ) {
      const sum = opts.rows.reduce((a, r) => {
        const v = r[c.key];
        return a + (typeof v === "number" ? v : Number(v ?? 0) || 0);
      }, 0);
      cell.value = sum;
      if (c.format === "money") {
        cell.numFmt = '"Rp" #,##0.00';
      } else {
        cell.numFmt = "#,##0.00";
      }
      cell.font = {
        bold: true,
        size: 10,
        color: { argb: "FF1D1D1F" },
        name: "Calibri",
      };
      cell.alignment = { vertical: "middle", horizontal: "right" };
    } else {
      cell.value = "";
    }

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF6F6F7" },
    };
    cell.border = {
      top: { style: "medium", color: { argb: "FF1D1D1F" } },
      bottom: { style: "medium", color: { argb: "FF1D1D1F" } },
      left: { style: "thin", color: { argb: "FFE5E5EA" } },
      right: { style: "thin", color: { argb: "FFE5E5EA" } },
    };
  });

  // ============================================================
  // FOOTER NOTE
  // ============================================================
  const footerIdx = totalsIdx + 2;
  ws.mergeCells(footerIdx, 1, footerIdx, colCount);
  const footerCell = ws.getCell(footerIdx, 1);
  footerCell.value = `Dokumen ini digenerate otomatis oleh ${
    opts.brandName ?? "AmmoBiz"
  } Platform. Data bersifat CONFIDENTIAL.`;
  footerCell.font = {
    size: 8,
    color: { argb: "FF8E8E93" },
    italic: true,
    name: "Calibri",
  };
  footerCell.alignment = { vertical: "middle", horizontal: "left" };

  // ============================================================
  // COLUMN WIDTHS
  // ============================================================
  opts.columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    const headerLen = c.label.length;
    const maxDataLen = opts.rows.reduce((max, r) => {
      const v = r[c.key];
      const s = v === null || v === undefined ? "" : String(v);
      return Math.max(max, s.length);
    }, 0);
    const width = Math.min(
      Math.max(headerLen + 4, maxDataLen + 2, 12),
      c.format === "money" ? 18 : 40
    );
    col.width = width;
  });

  // ============================================================
  // AUTO FILTER
  // ============================================================
  if (opts.rows.length > 0) {
    ws.autoFilter = {
      from: { row: headerRowIdx, column: 1 },
      to: { row: headerRowIdx, column: colCount },
    };
  }

  // ============================================================
  // PRINT HEADERS & FOOTERS
  // ============================================================
  ws.headerFooter = {
    oddFooter:
      "&L" +
      (opts.brandName ?? "AmmoBiz") +
      "&C" +
      opts.title +
      "&R Page &P of &N",
  };

  return wb;
}