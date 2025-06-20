import type { TableData } from "../../types"

/**
 * Генерирует имя файла для экспорта на основе данных таблицы и формата
 */
export const generateFilename = (
  tableData: TableData,
  format: "xlsx" | "csv",
  customName?: string
): string => {
  if (customName) {
    return `${customName}.${format}`
  }

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
  const source =
    tableData.source.charAt(0).toUpperCase() + tableData.source.slice(1)
  const chatTitle = tableData.chatTitle
    ? `_${tableData.chatTitle.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)}`
    : ""

  return `${source}${chatTitle}_Table_${timestamp}.${format}`
}
