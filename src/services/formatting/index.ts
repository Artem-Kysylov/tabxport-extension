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

// Основной сервис
export { 
  TableFormatterService, 
  DEFAULT_FORMATTING_OPTIONS 
} from './TableFormatterService';

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

// Утилиты для быстрого использования
export const FormattingUtils = {
  /**
   * Быстрый анализ таблицы
   */
  analyzeTable: TableFormatterService.analyzeTable,
  
  /**
   * Быстрое форматирование
   */
  quickFormat: TableFormatterService.quickFormat,
  
  /**
   * Получение рекомендуемых настроек
   */
  getRecommendedOptions: TableFormatterService.getRecommendedOptions,
  
  /**
   * Проверка, нужно ли форматирование
   */
  needsFormatting: (headers: string[], rows: string[][]): boolean => {
    const analysis = TableFormatterService.analyzeTable(headers, rows);
    return analysis.issues.length > 0;
  },
  
  /**
   * Подсчет потенциальных улучшений
   */
  countImprovements: (headers: string[], rows: string[][]): number => {
    const analysis = TableFormatterService.analyzeTable(headers, rows);
    return analysis.issues.length;
  }
}; 