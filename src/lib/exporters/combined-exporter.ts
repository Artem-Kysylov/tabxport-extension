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
import { generateFilename } from "../export"

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
 * Converts TableData to XLSX worksheet
 */
const tableDataToWorksheet = (
  tableData: TableData,
  includeHeaders: boolean = true
): XLSX.WorkSheet => {
  const data: string[][] = []

  if (includeHeaders && tableData.headers.length > 0) {
    data.push(tableData.headers)
  }

  data.push(...tableData.rows)

  return XLSX.utils.aoa_to_sheet(data)
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
 * Exports multiple tables into a single XLSX file with multiple sheets
 */
export const exportCombinedXLSX = async (
  tables: TableData[],
  options: CombinedExportOptions
): Promise<ExportResult> => {
  try {
    console.log(`🔄 Starting combined XLSX export for ${tables.length} tables`)

    // Validate table count
    if (tables.length === 0) {
      return {
        success: false,
        error: "No tables to export"
      }
    }

    if (tables.length > COMBINED_LIMITS.MAX_TABLES) {
      return {
        success: false,
        error: `Too many tables. Maximum ${COMBINED_LIMITS.MAX_TABLES} tables allowed, got ${tables.length}`
      }
    }

    // Create new workbook
    const workbook = XLSX.utils.book_new()
    const existingSheetNames = new Set<string>()

    console.log(`📊 Creating workbook with ${tables.length} sheets...`)

    // Process each table
    tables.forEach((table, index) => {
      console.log(`📋 Processing table ${index + 1}/${tables.length}`)

      // Generate unique sheet name
      const sheetName = generateSheetName(table, index, existingSheetNames)
      console.log(`📝 Sheet name: "${sheetName}"`)

      // Create worksheet
      const worksheet = tableDataToWorksheet(table, options.includeHeaders)

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    })

    // Generate filename
    const baseFilename = options.combinedFileName || "Combined_Tables"
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
    const filename = `${baseFilename}_${timestamp}.xlsx`

    console.log(`💾 Generated filename: ${filename}`)

    // Generate file buffer
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" })

    // Convert to data URL
    const base64 = arrayBufferToBase64(buffer)
    const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`

    console.log(`✅ Combined XLSX export completed successfully`)
    console.log(`📊 File size: ${buffer.byteLength} bytes`)
    console.log(`📋 Sheets created: ${workbook.SheetNames.join(", ")}`)

    return {
      success: true,
      filename,
      downloadUrl: dataUrl
    }
  } catch (error) {
    console.error("💥 Error in combined XLSX export:", error)
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
export const exportCombinedCSV = async (
  tables: TableData[],
  options: CombinedExportOptions
): Promise<ExportResult> => {
  try {
    console.log(`🔄 Starting combined CSV export for ${tables.length} tables`)

    // Validate table count
    if (tables.length === 0) {
      return {
        success: false,
        error: "No tables to export"
      }
    }

    if (tables.length > COMBINED_LIMITS.MAX_TABLES) {
      return {
        success: false,
        error: `Too many tables. Maximum ${COMBINED_LIMITS.MAX_TABLES} tables allowed, got ${tables.length}`
      }
    }

    console.log(`📄 Creating combined CSV with ${tables.length} sections...`)

    const csvSections: string[] = []

    // Process each table
    tables.forEach((table, index) => {
      console.log(`📋 Processing table ${index + 1}/${tables.length}`)

      // Generate section header
      const sectionTitle = generateSectionTitle(table, index)
      console.log(`📝 Section title: "${sectionTitle}"`)

      // Add section separator (except for first table)
      if (index > 0) {
        csvSections.push("") // Empty line separator
      }

      // Add section title
      csvSections.push(`=== ${sectionTitle} ===`)
      csvSections.push("") // Empty line after title

      // Convert table to CSV data
      const tableData: string[][] = []

      if (options.includeHeaders && table.headers.length > 0) {
        tableData.push(table.headers)
      }

      tableData.push(...table.rows)

      // Convert to CSV format manually for better control
      const csvRows = tableData.map((row) =>
        row
          .map((cell) => {
            // Escape cells containing commas, quotes, or newlines
            const cleanCell = (cell || "").toString().trim()
            if (
              cleanCell.includes(",") ||
              cleanCell.includes('"') ||
              cleanCell.includes("\n")
            ) {
              return `"${cleanCell.replace(/"/g, '""')}"`
            }
            return cleanCell
          })
          .join(",")
      )

      csvSections.push(...csvRows)
    })

    // Join all sections
    const combinedCSV = csvSections.join("\n")

    // Generate filename
    const baseFilename = options.combinedFileName || "Combined_Tables"
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
    const filename = `${baseFilename}_${timestamp}.csv`

    console.log(`💾 Generated filename: ${filename}`)

    // Create data URL
    const base64 = btoa(unescape(encodeURIComponent(combinedCSV)))
    const dataUrl = `data:text/csv;charset=utf-8;base64,${base64}`

    console.log(`✅ Combined CSV export completed successfully`)
    console.log(`📊 Total lines: ${csvSections.length}`)
    console.log(`📋 Sections created: ${tables.length}`)

    return {
      success: true,
      filename,
      downloadUrl: dataUrl
    }
  } catch (error) {
    console.error("💥 Error in combined CSV export:", error)
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
  // Try to use chat title or meaningful name
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

  // Fallback to source + number
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

  return new Table({
    rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    },
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
      before: isFirst ? 0 : 400, // Extra space before (except first)
      after: 200 // Space after
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
    console.log(`🔄 Starting combined DOCX export for ${tables.length} tables`)

    // Validate table count
    if (tables.length === 0) {
      return {
        success: false,
        error: "No tables to export"
      }
    }

    if (tables.length > COMBINED_LIMITS.MAX_TABLES) {
      return {
        success: false,
        error: `Too many tables. Maximum ${COMBINED_LIMITS.MAX_TABLES} tables allowed, got ${tables.length}`
      }
    }

    console.log(`📝 Creating combined DOCX with ${tables.length} tables...`)

    const documentElements: (Paragraph | Table)[] = []

    // Add main document title
    const mainTitle = options.combinedFileName || "Combined Tables Report"
    documentElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: mainTitle,
            bold: true,
            size: 36, // 18pt
            font: "Calibri"
          })
        ],
        spacing: {
          after: 400
        }
      })
    )

    // Process each table
    tables.forEach((table, index) => {
      console.log(`📋 Processing table ${index + 1}/${tables.length}`)

      // Generate section title
      const sectionTitle = generateSectionTitle(table, index)
      console.log(`📝 Section title: "${sectionTitle}"`)

      // Add section title
      documentElements.push(createSectionTitle(sectionTitle, index === 0))

      // Add table
      const docxTable = createDocxTable(table, options.includeHeaders)
      documentElements.push(docxTable)

      // Add page break between tables (except for last one)
      if (index < tables.length - 1) {
        documentElements.push(
          new Paragraph({
            children: [new PageBreak()]
          })
        )
      }
    })

    // Add footer information
    documentElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `\nDocument generated at ${new Date().toLocaleString()}`,
            italics: true,
            size: 18, // 9pt
            color: "666666",
            font: "Calibri"
          })
        ],
        spacing: {
          before: 400
        }
      })
    )

    // Create document
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Calibri",
              size: 22 // 11pt
            }
          }
        }
      },
      sections: [
        {
          properties: {},
          children: documentElements
        }
      ]
    })

    console.log(`🔄 Generating DOCX buffer...`)

    // Generate file buffer
    const buffer = await Packer.toBuffer(doc)

    // Generate filename
    const baseFilename = options.combinedFileName || "Combined_Tables"
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
    const filename = `${baseFilename}_${timestamp}.docx`

    console.log(`💾 Generated filename: ${filename}`)

    // Convert to data URL
    const base64 = arrayBufferToBase64(buffer)
    const dataUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`

    console.log(`✅ Combined DOCX export completed successfully`)
    console.log(`📊 File size: ${buffer.byteLength} bytes`)
    console.log(`📋 Tables included: ${tables.length}`)

    return {
      success: true,
      filename,
      downloadUrl: dataUrl
    }
  } catch (error) {
    console.error("💥 Error in combined DOCX export:", error)
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

  // Basic text cleaning and encoding
  const cleanText = text
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove invisible characters
    .replace(/\u00A0/g, " ") // Replace non-breaking spaces
    .normalize("NFKC")
    .trim()

  // Simple transliteration for Cyrillic characters
  return cleanText.replace(/[\u0400-\u04FF]/g, (char) => {
    const cyrillicMap: Record<string, string> = {
      а: "a",
      б: "b",
      в: "v",
      г: "g",
      д: "d",
      е: "e",
      ж: "zh",
      з: "z",
      и: "i",
      к: "k",
      л: "l",
      м: "m",
      н: "n",
      о: "o",
      п: "p",
      р: "r",
      с: "s",
      т: "t",
      у: "u",
      ф: "f",
      х: "h",
      ц: "ts",
      ч: "ch",
      ш: "sh",
      ы: "y",
      э: "e",
      ю: "yu",
      я: "ya",
      А: "A",
      Б: "B",
      В: "V",
      Г: "G",
      Д: "D",
      Е: "E",
      Ж: "Zh",
      З: "Z",
      И: "I",
      К: "K",
      Л: "L",
      М: "M",
      Н: "N",
      О: "O",
      П: "P",
      Р: "R",
      С: "S",
      Т: "T",
      У: "U",
      Ф: "F",
      Х: "H",
      Ц: "Ts",
      Ч: "Ch",
      Ш: "Sh",
      Ы: "Y",
      Э: "E",
      Ю: "Yu",
      Я: "Ya"
    }
    return cyrillicMap[char] || char
  })
}

/**
 * Adds a table to PDF document
 */
const addTableToPDF = (
  doc: jsPDF,
  tableData: TableData,
  options: CombinedExportOptions,
  startY: number,
  tableIndex: number
): number => {
  // Add section title
  const sectionTitle = generateSectionTitle(tableData, tableIndex)
  const encodedTitle = encodeTextForPDF(sectionTitle)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(40, 40, 40)

  const pageWidth = doc.internal.pageSize.getWidth()
  const titleWidth = doc.getTextWidth(encodedTitle)
  const titleX = (pageWidth - titleWidth) / 2

  doc.text(encodedTitle, titleX, startY)

  const tableStartY = startY + 15

  // Prepare table data
  const tableHeaders = options.includeHeaders
    ? tableData.headers.map((header) => encodeTextForPDF(header))
    : []

  const tableRows = tableData.rows.map((row) =>
    row.map((cell) => encodeTextForPDF(cell))
  )

  // Table configuration
  const tableConfig = {
    startY: tableStartY,
    head: options.includeHeaders ? [tableHeaders] : undefined,
    body: tableRows,
    theme: "grid" as const,
    headStyles: {
      fillColor: [27, 147, 88] as [number, number, number], // Brand green
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: "bold" as "bold",
      fontSize: 10,
      font: "helvetica"
    },
    bodyStyles: {
      fontSize: 9,
      font: "helvetica",
      textColor: [40, 40, 40] as [number, number, number]
    },
    styles: {
      lineWidth: 0.1,
      lineColor: [128, 128, 128] as [number, number, number],
      cellPadding: 3,
      fontSize: 9,
      font: "helvetica"
    },
    margin: {
      left: 14,
      right: 14
    }
  }

  // Add table to document
  autoTable(doc, tableConfig)

  // Return the Y position after the table
  return (doc as any).lastAutoTable.finalY || tableStartY + 50
}

/**
 * Exports multiple tables into a single PDF file
 */
export const exportCombinedPDF = async (
  tables: TableData[],
  options: CombinedExportOptions
): Promise<ExportResult> => {
  try {
    console.log(`🔄 Starting combined PDF export for ${tables.length} tables`)

    // Validate table count
    if (tables.length === 0) {
      return {
        success: false,
        error: "No tables to export"
      }
    }

    if (tables.length > COMBINED_LIMITS.MAX_TABLES) {
      return {
        success: false,
        error: `Too many tables. Maximum ${COMBINED_LIMITS.MAX_TABLES} tables allowed, got ${tables.length}`
      }
    }

    console.log(`📋 Creating combined PDF with ${tables.length} tables...`)

    // Create PDF document
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true
    })

    const pageHeight = doc.internal.pageSize.getHeight()
    let currentY = 20

    // Add main document title
    const mainTitle = options.combinedFileName || "Combined Tables Report"
    const encodedMainTitle = encodeTextForPDF(mainTitle)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.setTextColor(40, 40, 40)

    const pageWidth = doc.internal.pageSize.getWidth()
    const mainTitleWidth = doc.getTextWidth(encodedMainTitle)
    const mainTitleX = (pageWidth - mainTitleWidth) / 2

    doc.text(encodedMainTitle, mainTitleX, currentY)
    currentY += 25

    // Process each table
    tables.forEach((table, index) => {
      console.log(`📋 Processing table ${index + 1}/${tables.length}`)

      // Check if we need a new page
      if (currentY > pageHeight - 60) {
        doc.addPage()
        currentY = 20
      }

      // Add table to PDF
      const endY = addTableToPDF(doc, table, options, currentY, index)
      currentY = endY + 20 // Add space after table

      // Add page break between tables (except for last one)
      if (index < tables.length - 1) {
        doc.addPage()
        currentY = 20
      }
    })

    // Add footer on all pages
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)

      const footerText = `Generated at ${new Date().toLocaleString()} • Page ${i} of ${pageCount} • TabXport`
      const encodedFooterText = encodeTextForPDF(footerText)

      const footerWidth = doc.getTextWidth(encodedFooterText)
      const footerX = (pageWidth - footerWidth) / 2

      doc.text(encodedFooterText, footerX, pageHeight - 10)
    }

    console.log(`🔄 Generating PDF buffer...`)

    // Get PDF as ArrayBuffer
    const pdfArrayBuffer = doc.output("arraybuffer")

    // Generate filename
    const baseFilename = options.combinedFileName || "Combined_Tables"
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
    const filename = `${baseFilename}_${timestamp}.pdf`

    console.log(`💾 Generated filename: ${filename}`)

    // Convert to data URL
    const base64 = arrayBufferToBase64(pdfArrayBuffer)
    const dataUrl = `data:application/pdf;base64,${base64}`

    console.log(`✅ Combined PDF export completed successfully`)
    console.log(`📊 File size: ${pdfArrayBuffer.byteLength} bytes`)
    console.log(`📋 Pages created: ${pageCount}`)
    console.log(`📊 Tables included: ${tables.length}`)

    return {
      success: true,
      filename,
      downloadUrl: dataUrl
    }
  } catch (error) {
    console.error("💥 Error in combined PDF export:", error)
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
 * Main combined export function (currently supports XLSX only)
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
    default:
      return {
        success: false,
        error: `Unsupported format for combined export: ${options.format}`
      }
  }
}
