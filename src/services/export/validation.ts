import type { TableData } from "../../types"

// Валидация данных таблицы
export const validateTableData = (tableData: TableData): boolean => {
  // Проверяем наличие данных
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
