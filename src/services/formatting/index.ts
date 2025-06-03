// Основной экспорт всех модулей форматирования
export { FormattingTypes } from './types';
export { TextCleaner } from './text-cleaner';
export { StructureFixer } from './structure-fixer';
export { MarkdownProcessor } from './markdown-processor';
export { FormattingUtils } from './formatting-utils';
export { TableFormatterService, DEFAULT_FORMATTING_OPTIONS } from './TableFormatterService';

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
} from './types';

// Модули обработки
export {
  cleanCellText,
  cleanMultilineText,
  validateCleanedText
} from './text-cleaner';

export {
  analyzeTableStructure,
  fixTableStructure
} from './structure-fixer';

export {
  parseMarkdownTableAdvanced,
  processMultilineCells
} from './markdown-processor'; 