import { TableFormatterService } from "./TableFormatterService"
import type { FormattedTableData, FormattingOptions } from "./types"

/**
 * Утилиты для форматирования таблиц - простая обертка над TableFormatterService
 */
export class FormattingUtils {
  /**
   * Проверяет, нужно ли форматирование для таблицы
   */
  static needsFormatting(headers: string[], rows: string[][]): boolean {
    const analysis = TableFormatterService.analyzeTable(headers, rows)

    // Если есть проблемы, значит нужно форматирование
    return (
      analysis.issues.length > 0 ||
      analysis.structure.hasMergedCells ||
      analysis.structure.inconsistentColumns ||
      analysis.suggestions.length > 0
    )
  }

  /**
   * Подсчитывает количество возможных улучшений
   */
  static countImprovements(headers: string[], rows: string[][]): number {
    const analysis = TableFormatterService.analyzeTable(headers, rows)

    let count = analysis.issues.length + analysis.suggestions.length

    // Добавляем структурные проблемы
    if (analysis.structure.hasMergedCells) count++
    if (analysis.structure.inconsistentColumns) count++
    if (!analysis.structure.hasHeaders) count++

    return count
  }

  /**
   * Быстрое форматирование таблицы
   */
  static async quickFormat(
    headers: string[],
    rows: string[][],
    source: "chatgpt" | "claude" | "gemini" | "deepseek" | "other" = "other"
  ): Promise<FormattedTableData> {
    return TableFormatterService.quickFormat(headers, rows, source)
  }

  /**
   * Полное форматирование с настройками
   */
  static async formatTable(
    headers: string[],
    rows: string[][],
    options?: FormattingOptions,
    source: "chatgpt" | "claude" | "gemini" | "deepseek" | "other" = "other"
  ): Promise<FormattedTableData> {
    const recommendedOptions =
      options || TableFormatterService.getRecommendedOptions(source)
    return TableFormatterService.formatTable(
      headers,
      rows,
      recommendedOptions,
      source
    )
  }

  /**
   * Анализ таблицы
   */
  static analyzeTable(headers: string[], rows: string[][]) {
    return TableFormatterService.analyzeTable(headers, rows)
  }

  /**
   * Получение рекомендуемых настроек для платформы
   */
  static getRecommendedOptions(
    source: "chatgpt" | "claude" | "gemini" | "deepseek" | "other"
  ) {
    return TableFormatterService.getRecommendedOptions(source)
  }
}
