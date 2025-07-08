import * as XLSX from "xlsx"

import type { ExportOptions, ExportResult, TableData } from "../types"
import { exportToDOCX } from "./exporters/docx-exporter"
import { exportToPDF } from "./exporters/pdf-exporter"
import { googleDriveService } from "./google-drive-api"
import { googleSheetsService } from "./google-sheets-api"
import { getDefaultCsvSeparator } from "../services/export/utils"

// Генерация имени файла
export const generateFilename = (
  tableData: TableData,
  format: "xlsx" | "csv" | "docx" | "pdf" | "google_sheets",
  customName?: string,
  tableIndex?: number
): string => {
  if (customName) {
    // Google Sheets doesn't use file extensions
    return format === "google_sheets" ? customName : `${customName}.${format}`
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

    return format === "google_sheets" 
      ? `${cleanChatTitle}_Table${tableNumberSuffix}_${timestamp}`
      : `${cleanChatTitle}_Table${tableNumberSuffix}_${timestamp}.${format}`
  }

  return format === "google_sheets"
    ? `${source}_Table${tableNumberSuffix}_${timestamp}`
    : `${source}_Table${tableNumberSuffix}_${timestamp}.${format}`
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

/**
 * Converts data URL to blob for Google Drive upload
 */
const dataUrlToBlob = (dataUrl: string): Blob => {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

/**
 * Gets MIME type for Google Drive upload
 */
const getMimeTypeForFormat = (format: "xlsx" | "csv" | "docx" | "pdf"): string => {
  switch (format) {
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'csv':
      return 'text/csv'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'pdf':
      return 'application/pdf'
    default:
      return 'application/octet-stream'
  }
}

/**
 * Uploads file to Google Drive
 */
const uploadToGoogleDrive = async (
  filename: string,
  dataUrl: string,
  format: "xlsx" | "csv" | "docx" | "pdf"
): Promise<{ success: boolean; error?: string; webViewLink?: string }> => {
  try {
    const blob = dataUrlToBlob(dataUrl)
    const mimeType = getMimeTypeForFormat(format)
    
    console.log(`☁️ Uploading to Google Drive: ${filename} (${blob.size} bytes, ${mimeType})`)
    
    const result = await googleDriveService.uploadFile({
      filename,
      content: blob,
      mimeType
    })
    
    if (result.success) {
      console.log(`✅ Successfully uploaded to Google Drive: ${filename}`)
      return { success: true, webViewLink: result.webViewLink }
    } else {
      console.error(`❌ Failed to upload to Google Drive: ${result.error}`)
      return { success: false, error: result.error }
    }
  } catch (error) {
    console.error('💥 Error uploading to Google Drive:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    }
  }
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

    // Handle Google Drive upload if needed
    if (options.destination === 'google_drive') {
      const uploadResult = await uploadToGoogleDrive(filename, dataUrl, 'xlsx')
      
      if (uploadResult.success) {
        return {
          success: true,
          filename,
          downloadUrl: uploadResult.webViewLink || dataUrl  // Use webViewLink or fallback to dataUrl
        }
      } else {
        return {
          success: false,
          error: `Google Drive upload failed: ${uploadResult.error}`
        }
      }
    }

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
    // Автоопределение разделителя по локали
    const separator = getDefaultCsvSeparator()
    const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: separator })

    const filename = generateFilename(
      tableData,
      "csv",
      options.filename,
      options.tableIndex
    )

    // Создаем data URL для CSV
    const base64 = btoa(unescape(encodeURIComponent(csv)))
    const dataUrl = `data:text/csv;charset=utf-8;base64,${base64}`

    // Handle Google Drive upload if needed
    if (options.destination === 'google_drive') {
      const uploadResult = await uploadToGoogleDrive(filename, dataUrl, 'csv')
      
      if (uploadResult.success) {
        return {
          success: true,
          filename,
          downloadUrl: uploadResult.webViewLink || dataUrl  // Use webViewLink or fallback to dataUrl
        }
      } else {
        return {
          success: false,
          error: `Google Drive upload failed: ${uploadResult.error}`
        }
      }
    }

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

// Экспорт в Google Sheets формат
export const exportToGoogleSheets = async (
  tableData: TableData,
  options: ExportOptions & { tableIndex?: number }
): Promise<ExportResult> => {
  try {
    const title = generateFilename(
      tableData,
      "google_sheets",
      options.filename,
      options.tableIndex
    )

    console.log(`📊 Exporting table to Google Sheets: "${title}"`)

    const result = await googleSheetsService.exportTable(tableData, {
      spreadsheetTitle: title,
      sheetTitle: "Table_Data",
      includeHeaders: options.includeHeaders
    })

    if (result.success) {
      return {
        success: true,
        filename: title,
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
    console.error("Error exporting to Google Sheets:", error)
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
  console.log(`📤 Exporting table with destination: ${options.destination}`)
  
  switch (options.format) {
    case "xlsx":
      return exportToXLSX(tableData, options)
    case "csv":
      return exportToCSV(tableData, options)
    case "docx":
      return exportToDOCX(tableData, options)
    case "pdf":
      return exportToPDF(tableData, options)
    case "google_sheets":
      return exportToGoogleSheets(tableData, options)
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
