// Основной экспорт всех модулей форматирования
export { FormattingUtils } from "./formatting-utils"
export {
  TableFormatterService,
  DEFAULT_FORMATTING_OPTIONS
} from "./TableFormatterService"

// Основные типы и интерфейсы
export type {
  FormattingOptions,
  FormattedTableData,
  TableAnalysis,
  TableIssue,
  FormattingSuggestion,
  CellData,
  FormattingOperation,
  TableStructureInfo
} from "./types"

// Модули обработки (если экспорты существуют)
// Удалены несуществующие экспорты для исправления TypeScript ошибок
