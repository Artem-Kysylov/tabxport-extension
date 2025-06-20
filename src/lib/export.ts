import * as XLSX from "xlsx"

import type { ExportOptions, ExportResult, TableData } from "../types"
import { exportToDOCX } from "./exporters/docx-exporter"
import { exportToPDF } from "./exporters/pdf-exporter"

// Генерация имени файла
export const generateFilename = (
  tableData: TableData,
  format: "xlsx" | "csv" | "docx" | "pdf",
  customName?: string,
  tableIndex?: number
): string => {
  if (customName) {
    return `${customName}.${format}`
  }

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
  const source =
    tableData.source.charAt(0).toUpperCase() + tableData.source.slice(1)

  // Добавляем индекс таблицы для batch export, чтобы избежать коллизий имен
  const tableNumberSuffix = tableIndex !== undefined ? `_${tableIndex + 1}` : ""

  // Используем название чата если доступно, иначе используем стандартное имя
  if (tableData.chatTitle && tableData.chatTitle !== `${source}_Chat`) {
    // Очищаем название чата от недопустимых символов (дополнительная очистка)
    const cleanChatTitle = tableData.chatTitle
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 40) // Ограничиваем длину для имени файла

    return `${cleanChatTitle}_Table${tableNumberSuffix}_${timestamp}.${format}`
  }

  return `${source}_Table${tableNumberSuffix}_${timestamp}.${format}`
}

// Конвертация TableData в worksheet
export const tableDataToWorksheet = (
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
  options: ExportOptions & { tableIndex?: number }
): Promise<ExportResult> => {
  try {
    const worksheet = tableDataToWorksheet(tableData, options.includeHeaders)
    const workbook = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(workbook, worksheet, "Table")

    const filename = generateFilename(
      tableData,
      "xlsx",
      options.filename,
      options.tableIndex
    )
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
  options: ExportOptions & { tableIndex?: number }
): Promise<ExportResult> => {
  try {
    const worksheet = tableDataToWorksheet(tableData, options.includeHeaders)
    const csv = XLSX.utils.sheet_to_csv(worksheet)

    const filename = generateFilename(
      tableData,
      "csv",
      options.filename,
      options.tableIndex
    )

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

// Основная функция экспорта
export const exportTable = async (
  tableData: TableData,
  options: ExportOptions & { tableIndex?: number }
): Promise<ExportResult> => {
  switch (options.format) {
    case "xlsx":
      return exportToXLSX(tableData, options)
    case "csv":
      return exportToCSV(tableData, options)
    case "docx":
      return exportToDOCX(tableData, options)
    case "pdf":
      return exportToPDF(tableData, options)
    default:
      return {
        success: false,
        error: `Unsupported format: ${options.format}`
      }
  }
}

// Валидация данных таблицы
export const validateTableData = (tableData: TableData): boolean => {
  if (!tableData.headers && !tableData.rows.length) {
    return false
  }

  if (tableData.headers.length === 0 && tableData.rows.length === 0) {
    return false
  }

  // Проверяем, что все строки имеют одинаковое количество колонок
  const expectedColumns =
    tableData.headers.length || tableData.rows[0]?.length || 0

  return tableData.rows.every((row) => row.length === expectedColumns)
}

// Очистка данных таблицы от лишних пробелов и символов
export const cleanTableData = (tableData: TableData): TableData => {
  const cleanHeaders = tableData.headers.map((header) => header.trim())
  const cleanRows = tableData.rows.map((row) => row.map((cell) => cell.trim()))

  return {
    ...tableData,
    headers: cleanHeaders,
    rows: cleanRows
  }
}
