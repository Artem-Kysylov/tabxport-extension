import {
  BorderStyle,
  Document,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} from "docx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

import type { ExportOptions, ExportResult, TableData } from "../../types"
import { googleSheetsService } from "../google-sheets-api"
import { getDefaultCsvSeparator } from "../../services/export/utils"
import { registerRobotoCyrillicOrFallback, ROBOTO_FONT_NAME } from "../../assets/fonts/roboto-cyrillic"

/**
 * Combined export options interface
 */
interface CombinedExportOptions extends ExportOptions {
  combinedFileName?: string
  maxTables?: number
}

/**
 * Constants for combined exports
 */
const COMBINED_LIMITS = {
  MAX_TABLES: 10,
  MAX_SHEET_NAME_LENGTH: 25,
  FALLBACK_SHEET_PREFIX: "Table"
} as const

/**
 * Generates a unique sheet name for XLSX
 */
const generateSheetName = (
  tableData: TableData,
  index: number,
  existingNames: Set<string>
): string => {
  let baseName = ""

  // Try to use chat title or source as base name
  if (
    tableData.chatTitle &&
    tableData.chatTitle !== `${tableData.source}_Chat`
  ) {
    baseName = tableData.chatTitle
      .replace(/[<>:"/\\|?*\[\]]/g, "") // Remove invalid characters for sheet names
      .replace(/\s+/g, "_")
      .substring(0, COMBINED_LIMITS.MAX_SHEET_NAME_LENGTH)
  } else {
    baseName = `${tableData.source}_Data`
      .replace(/[<>:"/\\|?*\[\]]/g, "")
      .substring(0, COMBINED_LIMITS.MAX_SHEET_NAME_LENGTH)
  }

  // If base name is empty or too short, use fallback
  if (baseName.length < 3) {
    baseName = `${COMBINED_LIMITS.FALLBACK_SHEET_PREFIX}_${index + 1}`
  }

  // Ensure uniqueness
  let finalName = baseName
  let counter = 1

  while (existingNames.has(finalName)) {
    const suffix = `_${counter}`
    const maxBaseLength = COMBINED_LIMITS.MAX_SHEET_NAME_LENGTH - suffix.length
    finalName = baseName.substring(0, maxBaseLength) + suffix
    counter++
  }

  existingNames.add(finalName)
  return finalName
}

/**
 * Converts TableData to XLSX worksheet with analytics support
 */
const tableDataToWorksheet = (
  tableData: TableData,
  includeHeaders: boolean = true
): XLSX.WorkSheet => {
  const data: string[][] = []

  if (includeHeaders && tableData.headers.length > 0) {
    data.push(tableData.headers)
  }

  // Add regular table rows
  data.push(...tableData.rows)

  // Add analytics summary rows if available
  if (tableData.analytics?.summaryRows && tableData.analytics.summaryRows.length > 0) {
    // Add empty row for separation
    const colCount =
      Math.max(
        includeHeaders ? tableData.headers.length : 0,
        ...tableData.rows.map(r => r?.length || 0),
        ...tableData.analytics.summaryRows.map(r => r?.length || 0),
        1
      )
    data.push(new Array(colCount).fill(""))
    data.push(...tableData.analytics.summaryRows)
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data)

  // Автоматическое вычисление ширины столбцов
  const colWidths: { wch: number }[] = []
  
  // Определяем количество столбцов
  const maxCols = Math.max(
    includeHeaders ? (tableData.headers?.length || 0) : 0,
    ...tableData.rows.map(row => row?.length || 0),
    ...(tableData.analytics?.summaryRows?.map(row => row?.length || 0) || [])
  )

  // Вычисляем максимальную ширину для каждого столбца
  for (let col = 0; col < maxCols; col++) {
    let maxWidth = 8 // Минимальная ширина

    // Проверяем заголовок
    if (includeHeaders && tableData.headers[col]) {
      maxWidth = Math.max(maxWidth, String(tableData.headers[col]).length)
    }

    // Проверяем все строки данных
    for (const row of tableData.rows) {
      if (row[col] !== undefined && row[col] !== null) {
        const cellValue = String(row[col])
        maxWidth = Math.max(maxWidth, cellValue.length)
      }
    }

    // Проверяем строки аналитики
    if (tableData.analytics?.summaryRows) {
      for (const row of tableData.analytics.summaryRows) {
        if (row[col] !== undefined && row[col] !== null) {
          const cellValue = String(row[col])
          maxWidth = Math.max(maxWidth, cellValue.length)
        }
      }
    }

    // Ограничиваем максимальную ширину для производительности
    maxWidth = Math.min(maxWidth, 50)
    
    colWidths.push({ wch: maxWidth })
  }

  // Применяем ширину столбцов
  worksheet['!cols'] = colWidths

  // Apply styling to summary rows if analytics data exists
  if (tableData.analytics?.summaryRows && tableData.analytics.summaryRows.length > 0) {
    applySummaryRowStyling(worksheet, tableData, includeHeaders)
  }

  return worksheet
}

/**
 * Converts ArrayBuffer to base64
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Apply styling to analytics summary rows in XLSX worksheet
 */
const applySummaryRowStyling = (
  worksheet: XLSX.WorkSheet,
  tableData: TableData,
  includeHeaders: boolean
): void => {
  try {
    const headerOffset = includeHeaders ? 1 : 0
    const dataRowsCount = tableData.rows.length
    const summaryRowsCount = tableData.analytics?.summaryRows?.length || 0

    if (!summaryRowsCount) return

    // Calculate row indices for summary rows
    const colCount =
      Math.max(
        includeHeaders ? tableData.headers.length : 0,
        ...tableData.rows.map(r => r?.length || 0),
        ...tableData.analytics!.summaryRows!.map(r => r?.length || 0),
        1
      )

    const separatorRow = headerOffset + dataRowsCount // 0-based within sheet
    const summaryStartRow = separatorRow + 1

    if (!worksheet["!rows"]) worksheet["!rows"] = []

    for (let i = 0; i < summaryRowsCount; i++) {
      const rowIndex = summaryStartRow + i

      if (!worksheet["!rows"][rowIndex]) {
        worksheet["!rows"][rowIndex] = {}
      }

      for (let col = 0; col < colCount; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: col })

        if (!worksheet[cellAddress]) {
          worksheet[cellAddress] = { v: "", t: "s" }
        }

        ;(worksheet as any)[cellAddress].s = {
          font: { bold: true },
          border: { top: { style: "medium", color: { rgb: "000000" } } },
          fill: { fgColor: { rgb: "F0F0F0" } }
        }
      }
    }
  } catch (error) {
    console.warn("Failed to apply summary row styling:", error)
  }
}

/**
 * Exports multiple tables into a single XLSX file with multiple sheets
 */
export const exportCombinedXLSX = async (
  tables: TableData[],
  options: CombinedExportOptions
): Promise<ExportResult> => {
  try {
    if (tables.length === 0) {
      return { success: false, error: "No tables to export" }
    }
    if (tables.length > COMBINED_LIMITS.MAX_TABLES) {
      return {
        success: false,
        error: `Too many tables. Maximum ${COMBINED_LIMITS.MAX_TABLES} tables allowed, got ${tables.length}`
      }
    }

    const workbook = XLSX.utils.book_new()
    const existingSheetNames = new Set<string>()

    tables.forEach((table, index) => {
      const sheetName = generateSheetName(table, index, existingSheetNames)
      const worksheet = tableDataToWorksheet(table, options.includeHeaders)
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    })

    const baseFilename = options.combinedFileName || "Combined_Tables"
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
    const filename = `${baseFilename}_${timestamp}.xlsx`

    const arrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" })
    const base64 = arrayBufferToBase64(arrayBuffer)
    const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`

    return { success: true, filename, downloadUrl: dataUrl }
  } catch (error) {
    console.error("Error in combined XLSX export:", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error occurred during combined XLSX export"
    }
  }
}

/**
 * Exports multiple tables into a single CSV file with section separators
 */
// Функция для определения и форматирования дат в CSV
const formatCellForCSV = (cell: string): string => {
  const cellStr = String(cell || "").trim()
  
  // Проверяем, является ли строка датой/временем
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,                    // YYYY-MM-DD
    /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/,      // YYYY-MM-DD HH:MM
    /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/, // YYYY-MM-DD HH:MM:SS
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,  // ISO format
    /^\d{2}\/\d{2}\/\d{4}$/,                 // MM/DD/YYYY
    /^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}/,     // MM/DD/YYYY HH:MM
    /^\d{2}\.\d{2}\.\d{4}$/,                 // DD.MM.YYYY
    /^\d{2}\.\d{2}\.\d{4}\s\d{2}:\d{2}/      // DD.MM.YYYY HH:MM
  ]
  
  const isDate = datePatterns.some(pattern => pattern.test(cellStr))
  
  if (isDate) {
    // Преобразуем дату в понятный Excel формат и оборачиваем в кавычки
    return `"${cellStr}"`
  }
  
  return cellStr
}

export const exportCombinedCSV = async (
  tables: TableData[],
  options: CombinedExportOptions
): Promise<ExportResult> => {
  try {
    if (tables.length === 0) {
      return { success: false, error: "No tables to export" }
    }
    if (tables.length > COMBINED_LIMITS.MAX_TABLES) {
      return {
        success: false,
        error: `Too many tables. Maximum ${COMBINED_LIMITS.MAX_TABLES} tables allowed, got ${tables.length}`
      }
    }

    const csvSections: string[] = []
    const separator = getDefaultCsvSeparator()

    tables.forEach((table, index) => {
      const sectionTitle = generateSectionTitle(table, index)
      if (index > 0) csvSections.push("")
      csvSections.push(`=== ${sectionTitle} ===`)
      csvSections.push("")

      const tableDataArr: string[][] = []
      if (options.includeHeaders && table.headers.length > 0) {
        tableDataArr.push(table.headers)
      }
      tableDataArr.push(...table.rows)

      if (table.analytics?.summaryRows && table.analytics.summaryRows.length > 0) {
        tableDataArr.push([])
        table.analytics.summaryRows.forEach(row => {
          tableDataArr.push(row.map(cell => `# ${cell}`))
        })
      }

      const csvRows = tableDataArr.map((row) =>
        row
          .map((cell) => {
            // Используем новую функцию для форматирования дат
            const formattedCell = formatCellForCSV(String(cell || "").trim())
            if (
              formattedCell.includes(separator) ||
              formattedCell.includes('"') ||
              formattedCell.includes("\n")
            ) {
              return `"${formattedCell.replace(/"/g, '""')}"`
            }
            return formattedCell
          })
          .join(separator)
      )

      csvSections.push(...csvRows)
    })

    const combinedCSV = csvSections.join("\n")
    const baseFilename = options.combinedFileName || "Combined_Tables"
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
    const filename = `${baseFilename}_${timestamp}.csv`

    const bom = "\uFEFF"
    const base64 = btoa(unescape(encodeURIComponent(bom + combinedCSV)))
    const dataUrl = `data:text/csv;charset=utf-8;base64,${base64}`

    return { success: true, filename, downloadUrl: dataUrl }
  } catch (error) {
    console.error("Error in combined CSV export:", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error occurred during combined CSV export"
    }
  }
}

/**
 * Generates a section title for combined exports
 */
const generateSectionTitle = (tableData: TableData, index: number): string => {
  if (
    tableData.chatTitle &&
    tableData.chatTitle !== `${tableData.source}_Chat`
  ) {
    const cleanTitle = tableData.chatTitle
      .replace(/[^\w\s-]/g, "")
      .trim()
      .substring(0, 50)

    if (cleanTitle.length > 3) {
      return `Table ${index + 1}: ${cleanTitle}`
    }
  }

  const sourceName =
    tableData.source.charAt(0).toUpperCase() + tableData.source.slice(1)
  return `Table ${index + 1}: ${sourceName} Data`
}

/**
 * Creates a DOCX table from TableData
 */
const createDocxTable = (
  tableData: TableData,
  includeHeaders: boolean
): Table => {
  const rows: TableRow[] = []

  // Add headers if included
  if (includeHeaders && tableData.headers.length > 0) {
    const headerRow = new TableRow({
      children: tableData.headers.map(
        (header) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: header,
                    bold: true,
                    font: "Calibri",
                    size: 22 // 11pt
                  })
                ]
              })
            ],
            width: {
              size: 100 / tableData.headers.length,
              type: WidthType.PERCENTAGE
            }
          })
      )
    })
    rows.push(headerRow)
  }

  // Add data rows
  tableData.rows.forEach((row) => {
    const tableRow = new TableRow({
      children: row.map(
        (cell) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cell || "",
                    font: "Calibri",
                    size: 22 // 11pt
                  })
                ]
              })
            ],
            width: {
              size: 100 / row.length,
              type: WidthType.PERCENTAGE
            }
          })
      )
    })
    rows.push(tableRow)
  })

  // Add analytics summary rows if available
  if (tableData.analytics?.summaryRows && tableData.analytics.summaryRows.length > 0) {
    const emptyRow = new TableRow({
      children: new Array(Math.max(1, tableData.headers.length)).fill("").map(() => 
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "", font: "Calibri", size: 22 })] })],
          width: { size: 100 / Math.max(1, tableData.headers.length), type: WidthType.PERCENTAGE }
        })
      )
    })
    rows.push(emptyRow)

    tableData.analytics.summaryRows.forEach(row => {
      const summaryRow = new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: cell || "",
                      bold: true,
                      font: "Calibri",
                      size: 22
                    })
                  ]
                })
              ],
              width: { size: 100 / Math.max(1, row.length), type: WidthType.PERCENTAGE }
            })
        )
      })
      rows.push(summaryRow)
    })
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 }
    }
  })
}

/**
 * Creates a section title paragraph for DOCX
 */
const createSectionTitle = (
  title: string,
  isFirst: boolean = false
): Paragraph => {
  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 28, // 14pt
        font: "Calibri"
      })
    ],
    spacing: {
      before: isFirst ? 0 : 400,
      after: 200
    }
  })
}

/**
 * Exports multiple tables into a single DOCX file
 */
export const exportCombinedDOCX = async (
  tables: TableData[],
  options: CombinedExportOptions
): Promise<ExportResult> => {
  try {
    if (tables.length === 0) {
      return { success: false, error: "No tables to export" }
    }
    if (tables.length > COMBINED_LIMITS.MAX_TABLES) {
      return {
        success: false,
        error: `Too many tables. Maximum ${COMBINED_LIMITS.MAX_TABLES} tables allowed, got ${tables.length}`
      }
    }

    const documentElements: (Paragraph | Table)[] = []

    const mainTitle = options.combinedFileName || "Combined Tables Report"
    documentElements.push(
      new Paragraph({
        children: [new TextRun({ text: mainTitle, bold: true, size: 36, font: "Calibri" })],
        spacing: { after: 400 }
      })
    )

    tables.forEach((table, index) => {
      const sectionTitle = generateSectionTitle(table, index)
      documentElements.push(createSectionTitle(sectionTitle, index === 0))
      const docxTable = createDocxTable(table, options.includeHeaders)
      documentElements.push(docxTable)

      if (index < tables.length - 1) {
        documentElements.push(new Paragraph({ children: [new PageBreak()] }))
      }
    })

    documentElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `\nDocument generated at ${new Date().toLocaleString()}`,
            italics: true,
            size: 18,
            color: "666666",
            font: "Calibri"
          })
        ],
        spacing: { before: 400 }
      })
    )

    const doc = new Document({
      styles: {
        default: {
          document: { run: { font: "Calibri", size: 22 } }
        }
      },
      sections: [{ properties: {}, children: documentElements }]
    })

    const buffer = await Packer.toBuffer(doc)

    const baseFilename = options.combinedFileName || "Combined_Tables"
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
    const filename = `${baseFilename}_${timestamp}.docx`

    const base64 = arrayBufferToBase64(buffer)
    const dataUrl =
      `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`

    return { success: true, filename, downloadUrl: dataUrl }
  } catch (error) {
    console.error("Error in combined DOCX export:", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error occurred during combined DOCX export"
    }
  }
}

/**
 * Text encoding for PDF (handles Cyrillic and special characters)
 */
const encodeTextForPDF = (text: string): string => {
  if (!text) return ""
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove invisible characters
    .replace(/\u00A0/g, " ") // Replace non-breaking spaces
    .normalize("NFKC")
    .trim()
}

/**
 * Adds a table to PDF document with robust normalization against AutoTable "widths" errors
 */
const addTableToPDF = (
  doc: jsPDF,
  tableData: TableData,
  options: CombinedExportOptions,
  startY: number,
  tableIndex: number,
  fontName: string = "helvetica"
): number => {
  // Section title
  const sectionTitle = generateSectionTitle(tableData, tableIndex)
  const encodedTitle = encodeTextForPDF(sectionTitle)

  doc.setFont(fontName, "bold")
  doc.setFontSize(14)
  doc.setTextColor(40, 40, 40)

  const pageWidth = doc.internal.pageSize.getWidth()
  const titleWidth = doc.getTextWidth(encodedTitle)
  const titleX = (pageWidth - titleWidth) / 2
  doc.text(encodedTitle, titleX, startY)

  const tableStartY = startY + 15

  // Валидация данных таблицы
  if (!tableData || (!tableData.headers && !tableData.rows)) {
    console.warn("Empty table data, skipping table", tableIndex)
    doc.setFont(fontName, "normal") // Заменено ROBOTO_FONT_NAME на fontName
    doc.setFontSize(10)
    doc.setTextColor(180, 0, 0)
    doc.text("No data available for this table.", 14, tableStartY + 10)
    return tableStartY + 30
  }

  // Безопасная инициализация headers и rows
  const safeHeaders = Array.isArray(tableData.headers) ? tableData.headers : []
  const safeRows = Array.isArray(tableData.rows) ? tableData.rows : []

  // 1) Determine unified column count across headers + rows + analytics
  let columnCount = 0
  if (options.includeHeaders && safeHeaders.length > 0) {
    columnCount = Math.max(columnCount, safeHeaders.length)
  }
  if (safeRows.length > 0) {
    columnCount = Math.max(columnCount, ...safeRows.map(r => (Array.isArray(r) ? r.length : 1)), 0)
  }
  if (tableData.analytics?.summaryRows?.length) {
    columnCount = Math.max(
      columnCount,
      ...tableData.analytics.summaryRows.map(r => (Array.isArray(r) ? r.length : 1))
    )
  }
  if (columnCount <= 0) columnCount = 1

  // 2) Headers: create empty if needed
  const headersToUse = options.includeHeaders
    ? (safeHeaders.length > 0
        ? safeHeaders
        : new Array(columnCount).fill(""))
    : undefined

  const tableHeaders = headersToUse
    ? headersToUse.map((h) => encodeTextForPDF(String(h || "")))
    : undefined

  // 3) Rows: normalize each row length and encode
  let tableRows: string[][] = safeRows.map((row) => {
    const safe = Array.isArray(row) ? row : [String(row ?? "")]
    const padded = [...safe, ...new Array(Math.max(0, columnCount - safe.length)).fill("")]
    return padded.slice(0, columnCount).map((cell) => encodeTextForPDF(String(cell ?? "")))
  })

  // If there are no data rows at all — add a single empty row to avoid AutoTable errors
  if (tableRows.length === 0) {
    tableRows.push(new Array(columnCount).fill(""))
  }

  // 4) Analytics summary rows
  let summaryStartIndex = -1
  if (tableData.analytics?.summaryRows && tableData.analytics.summaryRows.length > 0) {
    tableRows.push(new Array(columnCount).fill("")) // separator
    summaryStartIndex = tableRows.length
    tableData.analytics.summaryRows.forEach(row => {
      const safe = Array.isArray(row) ? row : [String(row ?? "")]
      const padded = [...safe, ...new Array(Math.max(0, columnCount - safe.length)).fill("")]
      tableRows.push(padded.slice(0, columnCount).map(cell => encodeTextForPDF(String(cell ?? ""))))
    })
  }

  // Финальная валидация перед autoTable
  if (tableRows.length === 0 || (tableRows.length === 1 && tableRows[0].every(cell => cell === ""))) {
    console.warn("No valid table data to render for table", tableIndex)
    doc.setFont(ROBOTO_FONT_NAME, "normal")
    doc.setFontSize(10)
    doc.setTextColor(180, 0, 0)
    doc.text("Table contains no data to display.", 14, tableStartY + 10)
    return tableStartY + 30
  }

  // 5) Table config
  const tableConfig: Parameters<typeof autoTable>[1] = {
    startY: tableStartY,
    head: tableHeaders ? [tableHeaders] : undefined,
    body: tableRows,
    theme: "grid" as const,
    headStyles: {
      fillColor: [27, 147, 88] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: "bold",
      fontSize: 10,
      font: fontName
    },
    bodyStyles: {
      fontSize: 9,
      font: fontName,
      textColor: [40, 40, 40] as [number, number, number]
    },
    styles: {
      lineWidth: 0.1,
      lineColor: [128, 128, 128] as [number, number, number],
      cellPadding: 3,
      fontSize: 9,
      font: fontName
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data: any) => {
      if (summaryStartIndex >= 0 && data.row?.index >= summaryStartIndex) {
        data.cell.styles.fontStyle = "bold"
        data.cell.styles.fillColor = [245, 245, 245]
      }
    }
  }

  // 6) Render with safety
  try {
    autoTable(doc, tableConfig)
  } catch (err) {
    console.error("autoTable failed, falling back:", err)
    // Fallback text
    doc.setFont(fontName, "normal")
    doc.setFontSize(10)
    doc.setTextColor(180, 0, 0)
    doc.text("Failed to render table (see console).", 14, tableStartY + 10)
    return tableStartY + 20
  }

  const finalY = (doc as any)?.lastAutoTable?.finalY
  return typeof finalY === "number" ? finalY : tableStartY + 50
}

/**
 * Exports multiple tables into a single PDF file
 */
export const exportCombinedPDF = async (
  tables: TableData[],
  options: CombinedExportOptions
): Promise<ExportResult> => {
  try {
    if (tables.length === 0) {
      return { success: false, error: "No tables to export" }
    }
    if (tables.length > COMBINED_LIMITS.MAX_TABLES) {
      return {
        success: false,
        error: `Too many tables. Maximum ${COMBINED_LIMITS.MAX_TABLES} tables allowed, got ${tables.length}`
      }
    }

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true
    })

    // Enable Cyrillic font with safe fallback
    const fontName = registerRobotoCyrillicOrFallback(doc)
    doc.setFont(fontName, "normal")

    const pageHeight = doc.internal.pageSize.getHeight()
    const pageWidth = doc.internal.pageSize.getWidth()
    let currentY = 20

    // Main title
    const mainTitle = options.combinedFileName || "Combined Tables Report"
    const encodedMainTitle = encodeTextForPDF(mainTitle)

    doc.setFont(fontName, "bold")
    doc.setFontSize(18)
    doc.setTextColor(40, 40, 40)

    const mainTitleWidth = doc.getTextWidth(encodedMainTitle)
    const mainTitleX = (pageWidth - mainTitleWidth) / 2
    doc.text(encodedMainTitle, mainTitleX, currentY)
    currentY += 25

    // Tables
    tables.forEach((table, index) => {
      if (currentY > pageHeight - 60) {
        doc.addPage()
        currentY = 20
      }

      currentY = addTableToPDF(doc, table, options, currentY, index, fontName)
      currentY += 20
    }) // Добавлена отсутствующая закрывающая скобка

    // Footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFont(fontName, "normal")
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)

      const footerText = `Generated at ${new Date().toLocaleString()} • Page ${i} of ${pageCount} • TableXport`
      const encodedFooterText = encodeTextForPDF(footerText)
      const footerWidth = doc.getTextWidth(encodedFooterText)
      const footerX = (pageWidth - footerWidth) / 2
      doc.text(encodedFooterText, footerX, pageHeight - 10)
    }

    const pdfArrayBuffer = doc.output("arraybuffer")
    const baseFilename = options.combinedFileName || "Combined_Tables"
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
    const filename = `${baseFilename}_${timestamp}.pdf`
    const base64 = arrayBufferToBase64(pdfArrayBuffer)
    const dataUrl = `data:application/pdf;base64,${base64}`

    return { success: true, filename, downloadUrl: dataUrl }
  } catch (error) {
    console.error("Error in combined PDF export:", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error occurred during combined PDF export"
    }
  }
}

/**
 * Exports multiple tables into a single Google Spreadsheet with multiple sheets
 */
export const exportCombinedGoogleSheets = async (
  tables: TableData[],
  options: CombinedExportOptions
): Promise<ExportResult> => {
  try {
    if (tables.length === 0) {
      return { success: false, error: "No tables to export" }
    }
    if (tables.length > COMBINED_LIMITS.MAX_TABLES) {
      return {
        success: false,
        error: `Too many tables. Maximum ${COMBINED_LIMITS.MAX_TABLES} tables allowed, got ${tables.length}`
      }
    }

    const baseTitle = options.combinedFileName || "Combined_Tables"
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
    const spreadsheetTitle = `${baseTitle}_${timestamp}`

    const result = await googleSheetsService.exportMultipleTables(tables, {
      spreadsheetTitle,
      includeHeaders: options.includeHeaders
    })

    if (result.success) {
      return {
        success: true,
        filename: spreadsheetTitle,
        downloadUrl: result.spreadsheetUrl || "",
        googleSheetsId: result.spreadsheetId,
        googleSheetsUrl: result.spreadsheetUrl
      }
    } else {
      return {
        success: false,
        error: result.error || "Failed to export to Google Sheets"
      }
    }
  } catch (error) {
    console.error("Error in combined Google Sheets export:", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error occurred during combined Google Sheets export"
    }
  }
}

/**
 * Main combined export function
 */
export const exportCombinedTables = async (
  tables: TableData[],
  options: CombinedExportOptions
): Promise<ExportResult> => {
  switch (options.format) {
    case "xlsx":
      return exportCombinedXLSX(tables, options)
    case "csv":
      return exportCombinedCSV(tables, options)
    case "docx":
      return exportCombinedDOCX(tables, options)
    case "pdf":
      return exportCombinedPDF(tables, options)
    case "google_sheets":
      return exportCombinedGoogleSheets(tables, options)
    default:
      return {
        success: false,
        error: `Unsupported format for combined export: ${options.format}`
      }
  }
}