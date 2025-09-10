import * as XLSX from "xlsx"

import type { ExportOptions, ExportResult, TableData } from "../types"
import { exportToDOCX } from "./exporters/docx-exporter"
import { exportToPDF } from "./exporters/pdf-exporter"
import { googleDriveService } from "./google-drive-api"
import { googleSheetsService } from "./google-sheets-api"
import { getDefaultCsvSeparator } from "../services/export/utils"
import { GOOGLE_DRIVE_ENABLED, GOOGLE_SHEETS_ENABLED } from "../services/feature-flags"

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

  const worksheet = XLSX.utils.aoa_to_sheet(data)

  // Автоматическое вычисление ширины столбцов
  const colWidths: { wch: number }[] = []
  
  // Определяем количество столбцов
  const maxCols = Math.max(
    includeHeaders ? (tableData.headers?.length || 0) : 0,
    ...tableData.rows.map(row => row?.length || 0)
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

    // Ограничиваем максимальную ширину для производительности
    maxWidth = Math.min(maxWidth, 50)
    
    colWidths.push({ wch: maxWidth })
  }

  // Применяем ширину столбцов
  worksheet['!cols'] = colWidths

  return worksheet
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
// Функция загрузки в Google Drive
const uploadToGoogleDrive = async (
  filename: string,
  dataUrl: string,
  format: "xlsx" | "csv" | "docx" | "pdf"
): Promise<{ success: boolean; error?: string; webViewLink?: string }> => {
  try {
    if (!GOOGLE_DRIVE_ENABLED) {
      return { success: false, error: "Google Drive export is disabled in this version" }
    }

    const blob = dataUrlToBlob(dataUrl)
    const mimeType = getMimeTypeForFormat(format)

    const { googleDriveService } = await import("./google-drive-api")

    const result = await googleDriveService.uploadFile({
      filename,
      content: blob,
      mimeType
    })
    
    if (result.success) {
      // удалён лишний console.log: Successfully uploaded to Google Drive
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
      if (!GOOGLE_DRIVE_ENABLED) {
        return { success: false, error: "Google Drive destination is disabled in this version" }
      }
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
    /^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}$/,     // MM/DD/YYYY HH:MM
    /^\d{2}\.\d{2}\.\d{4}$/,                 // DD.MM.YYYY
    /^\d{2}\.\d{2}\.\d{4}\s\d{2}:\d{2}$/      // DD.MM.YYYY HH:MM
  ]
  
  const isDate = datePatterns.some(pattern => pattern.test(cellStr))
  
  if (isDate) {
    // Преобразуем дату в понятный Excel формат и оборачиваем в кавычки
    // Это заставит Excel интерпретировать как текст, а не автоматически форматировать
    return `"${cellStr}"`
  }
  
  return cellStr
}

// Функция для создания CSV из данных таблицы с правильным форматированием дат
const createCSVFromTableData = (
  tableData: TableData,
  includeHeaders: boolean,
  separator: string
): string => {
  const rows: string[] = []
  
  // Добавляем заголовки если нужно
  if (includeHeaders && tableData.headers.length > 0) {
    const headerRow = tableData.headers
      .map(header => {
        const cleanHeader = String(header || "").trim()
        if (cleanHeader.includes(separator) || cleanHeader.includes('"') || cleanHeader.includes("\n")) {
          return `"${cleanHeader.replace(/"/g, '""')}"`
        }
        return cleanHeader
      })
      .join(separator)
    rows.push(headerRow)
  }
  
  // Добавляем основные данные
  tableData.rows.forEach(row => {
    const csvRow = row
      .map(cell => {
        const formattedCell = formatCellForCSV(cell)
        if (formattedCell.includes(separator) || formattedCell.includes('"') || formattedCell.includes("\n")) {
          return `"${formattedCell.replace(/"/g, '""')}"`
        }
        return formattedCell
      })
      .join(separator)
    rows.push(csvRow)
  })
  
  // Добавляем аналитические строки если есть
  if (tableData.analytics?.summaryRows && tableData.analytics.summaryRows.length > 0) {
    rows.push("") // Пустая строка-разделитель
    tableData.analytics.summaryRows.forEach(row => {
      const csvRow = row
        .map(cell => {
          const formattedCell = formatCellForCSV(cell)
          const prefixedCell = `# ${formattedCell}` // Добавляем префикс для аналитики
          if (prefixedCell.includes(separator) || prefixedCell.includes('"') || prefixedCell.includes("\n")) {
            return `"${prefixedCell.replace(/"/g, '""')}"`
          }
          return prefixedCell
        })
        .join(separator)
      rows.push(csvRow)
    })
  }
  
  return rows.join("\n")
}


export const exportToCSV = async (
  tableData: TableData,
  options: ExportOptions & { tableIndex?: number }
): Promise<ExportResult> => {
  try {
    // Автоопределение разделителя по локали
    const separator = getDefaultCsvSeparator()
    
    // Используем новую функцию для создания CSV с правильным форматированием дат
    const csv = createCSVFromTableData(tableData, options.includeHeaders, separator)

    const filename = generateFilename(
      tableData,
      "csv",
      options.filename,
      options.tableIndex
    )

    // Создаем data URL для CSV
    const bom = "\uFEFF"
    const base64 = btoa(unescape(encodeURIComponent(bom + csv)))
    const dataUrl = `data:text/csv;charset=utf-8;base64,${base64}`

    // Handle Google Drive upload if needed
    if (options.destination === 'google_drive') {
      if (!GOOGLE_DRIVE_ENABLED) {
        return { success: false, error: "Google Drive destination is disabled in this version" }
      }
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
    if (!GOOGLE_SHEETS_ENABLED) {
      return { success: false, error: "Google Sheets export is disabled in this version" }
    }
    const includeHeaders = options.includeHeaders !== false
    const { googleSheetsService } = await import("./google-sheets-api")

    const result = await googleSheetsService.exportTable(tableData, {
      includeHeaders,
      spreadsheetTitle: options.filename,
      sheetTitle: "Table_Data"
    })

    if (result.success) {
      return {
        success: true,
        filename: options.filename || "Google_Sheets_Export",
        downloadUrl: result.spreadsheetUrl,
        googleSheetsId: result.spreadsheetId,
        googleSheetsUrl: result.spreadsheetUrl
      }
    } else {
      return { success: false, error: result.error || "Failed to export to Google Sheets" }
    }
  } catch (error) {
    console.error("Error exporting to Google Sheets:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Основная функция экспорта
export const exportTable = async (
  tableData: TableData,
  options: ExportOptions & { tableIndex?: number }
): Promise<ExportResult> => {
  // удалён лишний console.log: Exporting table with destination
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
