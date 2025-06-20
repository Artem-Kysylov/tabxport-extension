export interface FormattingOptions {
  // Уровень агрессивности очистки
  cleaningLevel: "minimal" | "standard" | "aggressive"

  // Обработка структуры
  fixMergedCells: boolean
  restoreHeaders: boolean
  normalizeColumns: boolean

  // Очистка текста
  removeMarkdownSymbols: boolean
  normalizeWhitespace: boolean
  normalizeDiacritics: boolean
  removeHtmlTags: boolean

  // Платформо-специфичные настройки
  platformSpecific: boolean

  // Валидация и восстановление
  validateStructure: boolean
  fillEmptyCells: boolean
}

export interface CellData {
  content: string
  originalContent: string
  rowIndex: number
  columnIndex: number
  rowSpan?: number
  colSpan?: number
  isHeader?: boolean
}

export interface FormattedTableData {
  headers: string[]
  rows: string[][]
  originalHeaders: string[]
  originalRows: string[][]
  formattingApplied: FormattingOperation[]
  source: "chatgpt" | "claude" | "gemini" | "deepseek" | "other"
  processingTime: number
}

export interface FormattingOperation {
  type:
    | "cell-cleaned"
    | "structure-fixed"
    | "header-restored"
    | "markdown-processed"
  description: string
  cellPosition?: { row: number; col: number }
  before?: string
  after?: string
}

export interface TableStructureInfo {
  hasHeaders: boolean
  headerRowCount: number
  columnCount: number
  rowCount: number
  hasMergedCells: boolean
  inconsistentColumns: boolean
  detectedFormat: "html" | "markdown" | "text" | "mixed"
}

// Результат анализа таблицы
export interface TableAnalysis {
  structure: TableStructureInfo
  issues: TableIssue[]
  suggestions: FormattingSuggestion[]
}

export interface TableIssue {
  type:
    | "missing-headers"
    | "merged-cells"
    | "inconsistent-columns"
    | "text-artifacts"
    | "encoding-issues"
  severity: "low" | "medium" | "high"
  description: string
  location?: { row?: number; col?: number }
}

export interface FormattingSuggestion {
  type: "auto-fix" | "manual-review" | "setting-change"
  description: string
  autoFixable: boolean
}
