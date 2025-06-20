import * as XLSX from "xlsx"

import type { ExportOptions, ExportResult, TableData } from "../../types"
import { generateFilename } from "./utils"

// Конвертация TableData в worksheet
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

// Конвертация ArrayBuffer в base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Экспорт в XLSX формат
export const exportToXLSX = async (
  tableData: TableData,
  options: ExportOptions
): Promise<ExportResult> => {
  try {
    const worksheet = tableDataToWorksheet(tableData, options.includeHeaders)
    const workbook = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(workbook, worksheet, "Table")

    const filename = generateFilename(tableData, "xlsx", options.filename)
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" })

    // Создаем data URL для скачивания
    const base64 = arrayBufferToBase64(buffer)
    const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`

    return {
      success: true,
      filename,
      downloadUrl: dataUrl
    }
  } catch (error) {
    console.error("Error exporting to XLSX:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }
  }
}

// Экспорт в CSV формат
export const exportToCSV = async (
  tableData: TableData,
  options: ExportOptions
): Promise<ExportResult> => {
  try {
    const worksheet = tableDataToWorksheet(tableData, options.includeHeaders)
    const csv = XLSX.utils.sheet_to_csv(worksheet)

    const filename = generateFilename(tableData, "csv", options.filename)

    // Создаем data URL для CSV
    const base64 = btoa(unescape(encodeURIComponent(csv)))
    const dataUrl = `data:text/csv;charset=utf-8;base64,${base64}`

    return {
      success: true,
      filename,
      downloadUrl: dataUrl
    }
  } catch (error) {
    console.error("Error exporting to CSV:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    }
  }
}
