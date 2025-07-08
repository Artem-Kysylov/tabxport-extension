import type { TableData } from "../../types"

/**
 * Генерирует имя файла для экспорта на основе данных таблицы и формата
 * Fixed: Поддержка всех форматов + уникальные имена для ZIP архивов
 */
export const generateFilename = (
  tableData: TableData,
  format: "xlsx" | "csv" | "google_sheets" | "pdf" | "docx",
  customName?: string,
  options?: { tableIndex?: number; batchMode?: boolean }
): string => {
  if (customName) {
    // Add extension if needed (except Google Sheets)
    if (format === "google_sheets") {
      return customName
    }
    
    // Add table index for batch exports to ensure uniqueness
    if (options?.batchMode && options?.tableIndex !== undefined) {
      const nameWithoutExt = customName.replace(/\.[^/.]+$/, "")
      return `${nameWithoutExt}_${options.tableIndex + 1}.${format}`
    }
    
    return customName.includes(".") ? customName : `${customName}.${format}`
  }

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
  const source = tableData.source.charAt(0).toUpperCase() + tableData.source.slice(1)
  
  // Используем первые 6 символов ID таблицы для уникальности
  const tableId = tableData.id ? `_${tableData.id.slice(0, 6)}` : ""
  
  const chatTitle = tableData.chatTitle
    ? `_${tableData.chatTitle.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20)}`
    : ""

  // Добавляем tableIndex для batch экспортов
  const batchSuffix = options?.batchMode && options?.tableIndex !== undefined 
    ? `_T${options.tableIndex + 1}` 
    : ""

  // Google Sheets doesn't need file extension
  if (format === "google_sheets") {
    return `${source}${chatTitle}${tableId}${batchSuffix}_${timestamp}`
  }

  return `${source}${chatTitle}${tableId}${batchSuffix}_${timestamp}.${format}`
}

/**
 * Определяет разделитель для CSV по локали пользователя
 * Для ru, uk, pl, de и других европейских локалей — точка с запятой
 * Для остальных — запятая
 */
export const getDefaultCsvSeparator = (locale?: string): string => {
  const loc = (locale || navigator.language || "en").toLowerCase()
  // Список локалей, где Excel ожидает ; как разделитель
  const semicolonLocales = [
    "ru", "uk", "be", "pl", "de", "fr", "it", "es", "pt", "tr", "fi", "sv", "da", "nl", "cs", "sk", "hu", "sl", "hr", "lt", "lv", "et", "bg", "ro", "el"
  ]
  return semicolonLocales.some((l) => loc.startsWith(l)) ? ";" : ","
}
