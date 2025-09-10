import {
  parseMarkdownTableAdvanced,
  processMultilineCells
} from "./markdown-processor"
import { analyzeTableStructure, fixTableStructure } from "./structure-fixer"
import {
  cleanCellText,
  cleanMultilineText,
  validateCleanedText
} from "./text-cleaner"
import type {
  FormattedTableData,
  FormattingOptions,
  FormattingSuggestion,
  TableAnalysis,
  TableIssue
} from "./types"

/**
 * Дефолтные настройки форматирования
 */
export const DEFAULT_FORMATTING_OPTIONS: FormattingOptions = {
  cleaningLevel: "standard",
  fixMergedCells: true,
  restoreHeaders: true,
  normalizeColumns: true,
  removeMarkdownSymbols: true,
  normalizeWhitespace: true,
  normalizeDiacritics: false,
  removeHtmlTags: true,
  platformSpecific: true,
  validateStructure: true,
  fillEmptyCells: true
}

/**
 * Основной сервис для автоформатирования таблиц
 */
export class TableFormatterService {
  /**
   * Анализ таблицы и выявление проблем
   */
  static analyzeTable(
    headers: string[],
    rows: string[][],
    element?: HTMLElement
  ): TableAnalysis {
    const structure = analyzeTableStructure(headers, rows, element)
    const issues: TableIssue[] = []
    const suggestions: FormattingSuggestion[] = []

    // Проверяем наличие заголовков
    if (!structure.hasHeaders || headers.length === 0) {
      issues.push({
        type: "missing-headers",
        severity: "medium",
        description: "Таблица не имеет заголовков"
      })
      suggestions.push({
        type: "auto-fix",
        description: "Автоматически восстановить заголовки из первой строки",
        autoFixable: true
      })
    }

    // Проверяем объединенные ячейки
    if (structure.hasMergedCells) {
      issues.push({
        type: "merged-cells",
        severity: "high",
        description: "Таблица содержит объединенные ячейки"
      })
      suggestions.push({
        type: "auto-fix",
        description: "Автоматически разделить объединенные ячейки",
        autoFixable: true
      })
    }

    // Проверяем консистентность колонок
    if (structure.inconsistentColumns) {
      issues.push({
        type: "inconsistent-columns",
        severity: "medium",
        description: "Строки таблицы имеют разное количество колонок"
      })
      suggestions.push({
        type: "auto-fix",
        description: "Нормализовать количество колонок",
        autoFixable: true
      })
    }

    // Проверяем артефакты в тексте
    const hasTextArtifacts = [...headers, ...rows.flat()].some(
      (cell) =>
        cell.includes("|") ||
        cell.includes("---") ||
        cell.match(/\*\*.*\*\*/) ||
        (cell.includes("<") && cell.includes(">"))
    )

    if (hasTextArtifacts) {
      issues.push({
        type: "text-artifacts",
        severity: "low",
        description: "Ячейки содержат артефакты форматирования"
      })
      suggestions.push({
        type: "auto-fix",
        description: "Очистить артефакты Markdown и HTML",
        autoFixable: true
      })
    }

    return { structure, issues, suggestions }
  }

  /**
   * Форматирование таблицы с заданными настройками
   */
  static async formatTable(
    headers: string[],
    rows: string[][],
    options: FormattingOptions = DEFAULT_FORMATTING_OPTIONS,
    source: "chatgpt" | "claude" | "gemini" | "deepseek" | "other" = "other",
    element?: HTMLElement
  ): Promise<FormattedTableData> {
    const startTime = Date.now()
    const originalHeaders = [...headers]
    const originalRows = rows.map((row) => [...row])

    let formattedHeaders = [...headers]
    let formattedRows = rows.map((row) => [...row])
    const allOperations: FormattedTableData["formattingApplied"] = []

    console.log("TabXport: Starting table formatting with options:", options)

    try {
      // 1. Обработка Markdown таблиц (если это текстовое содержимое)
      if (element && element.textContent && element.textContent.includes("|")) {
        const markdownResult = parseMarkdownTableAdvanced(
          element.textContent,
          options
        )

        if (
          markdownResult.headers.length > 0 ||
          markdownResult.rows.length > 0
        ) {
          formattedHeaders = markdownResult.headers
          formattedRows = markdownResult.rows
          allOperations.push(...markdownResult.operations)
        }
      }

      // 2. Обработка многострочных ячеек
      if (
        formattedHeaders.some((h) => h.includes("\n")) ||
        formattedRows.some((row) => row.some((cell) => cell.includes("\n")))
      ) {
        const multilineResult = processMultilineCells(
          formattedHeaders,
          formattedRows,
          options
        )
        formattedHeaders = multilineResult.headers
        formattedRows = multilineResult.rows
        allOperations.push(...multilineResult.operations)
      }

      // 3. Исправление структуры таблицы
      const structureResult = fixTableStructure(
        formattedHeaders,
        formattedRows,
        options,
        element
      )
      formattedHeaders = structureResult.fixedHeaders
      formattedRows = structureResult.fixedRows
      allOperations.push(...structureResult.operations)

      // 4. Очистка содержимого ячеек
      const cleaningResults = await this.cleanTableContents(
        formattedHeaders,
        formattedRows,
        options
      )
      formattedHeaders = cleaningResults.headers
      formattedRows = cleaningResults.rows
      allOperations.push(...cleaningResults.operations)

      // 5. Платформо-специфичная обработка
      if (options.platformSpecific) {
        const platformResult = await this.applyPlatformSpecificFormatting(
          formattedHeaders,
          formattedRows,
          source,
          options
        )
        formattedHeaders = platformResult.headers
        formattedRows = platformResult.rows
        allOperations.push(...platformResult.operations)
      }

      // 6. Финальная валидация
      const isValid = this.validateFormattedTable(
        formattedHeaders,
        formattedRows,
        originalHeaders,
        originalRows
      )

      if (!isValid) {
        console.warn(
          "TabXport: Formatted table failed validation, reverting to original"
        )
        formattedHeaders = originalHeaders
        formattedRows = originalRows
        allOperations.push({
          type: "structure-fixed",
          description: "Форматирование отменено из-за ошибок валидации"
        })
      }

      const processingTime = Date.now() - startTime

      return {
        headers: formattedHeaders,
        rows: formattedRows,
        originalHeaders,
        originalRows,
        formattingApplied: allOperations,
        source,
        processingTime
      }
    } catch (error) {
      console.error("TabXport: Error during table formatting:", error)

      // В случае ошибки возвращаем оригинальные данные
      return {
        headers: originalHeaders,
        rows: originalRows,
        originalHeaders,
        originalRows,
        formattingApplied: [
          {
            type: "cell-cleaned",
            description: `Ошибка форматирования: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ],
        source,
        processingTime: Date.now() - startTime
      }
    }
  }

  /**
   * Очистка содержимого всех ячеек таблицы
   */
  private static async cleanTableContents(
    headers: string[],
    rows: string[][],
    options: FormattingOptions
  ): Promise<{
    headers: string[]
    rows: string[][]
    operations: FormattedTableData["formattingApplied"]
  }> {
    const operations: FormattedTableData["formattingApplied"] = []

    // Очищаем заголовки
    const cleanedHeaders = headers.map((header, index) => {
      const result = cleanCellText(header, options, { row: 0, col: index })
      operations.push(...result.operations)
      return result.cleaned
    })

    // Очищаем ячейки данных
    const cleanedRows = rows.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        const result = cleanCellText(cell, options, {
          row: rowIndex + 1,
          col: colIndex
        })
        operations.push(...result.operations)
        return result.cleaned
      })
    )

    return { headers: cleanedHeaders, rows: cleanedRows, operations }
  }

  /**
   * Применение платформо-специфичного форматирования
   */
  private static async applyPlatformSpecificFormatting(
    headers: string[],
    rows: string[][],
    source: "chatgpt" | "claude" | "gemini" | "deepseek" | "other",
    options: FormattingOptions
  ): Promise<{
    headers: string[]
    rows: string[][]
    operations: FormattedTableData["formattingApplied"]
  }> {
    const operations: FormattedTableData["formattingApplied"] = []

    // Пока что возвращаем данные как есть
    // В будущих версиях здесь будут специфичные форматировщики
    switch (source) {
      case "claude":
        // Специальная обработка для Claude (выравнивание пробелами)
        operations.push({
          type: "markdown-processed",
          description: "Применена Claude-специфичная обработка текстовых таблиц"
        })
        break

      case "chatgpt":
        // Специальная обработка для ChatGPT (Markdown)
        operations.push({
          type: "markdown-processed",
          description: "Применена ChatGPT-специфичная обработка Markdown таблиц"
        })
        break

      default:
        // Универсальная обработка
        break
    }

    return { headers, rows, operations }
  }

  /**
   * Валидация отформатированной таблицы
   */
  private static validateFormattedTable(
    formattedHeaders: string[],
    formattedRows: string[][],
    originalHeaders: string[],
    originalRows: string[][]
  ): boolean {
    // Проверяем, что не потеряли критически важные данные

    // 1. Количество строк не должно уменьшиться более чем на 50%
    if (formattedRows.length < originalRows.length * 0.5) {
      console.warn("TabXport: Too many rows lost during formatting")
      return false
    }

    // 2. Количество колонок должно быть разумным
    if (formattedHeaders.length === 0 && originalHeaders.length > 0) {
      console.warn("TabXport: All headers lost during formatting")
      return false
    }

    // 3. Проверяем, что остался какой-то контент
    const hasContent =
      formattedHeaders.some((h) => h.trim()) ||
      formattedRows.some((row) => row.some((cell) => cell.trim()))

    if (!hasContent) {
      console.warn("TabXport: All content lost during formatting")
      return false
    }

    // 4. Проверяем каждую очищенную ячейку
    for (
      let i = 0;
      i < Math.min(formattedHeaders.length, originalHeaders.length);
      i++
    ) {
      if (!validateCleanedText(originalHeaders[i], formattedHeaders[i])) {
        console.warn(`TabXport: Header ${i} failed validation`)
        return false
      }
    }

    return true
  }

  /**
   * Быстрое форматирование с минимальными настройками
   */
  static async quickFormat(
    headers: string[],
    rows: string[][],
    source: "chatgpt" | "claude" | "gemini" | "deepseek" | "other" = "other"
  ): Promise<FormattedTableData> {
    const quickOptions: FormattingOptions = {
      ...DEFAULT_FORMATTING_OPTIONS,
      cleaningLevel: "minimal",
      normalizeDiacritics: false,
      platformSpecific: false
    }

    return this.formatTable(headers, rows, quickOptions, source)
  }

  /**
   * Получение рекомендуемых настроек для источника
   */
  static getRecommendedOptions(
    source: "chatgpt" | "claude" | "gemini" | "deepseek" | "other"
  ): FormattingOptions {
    const baseOptions = { ...DEFAULT_FORMATTING_OPTIONS }

    switch (source) {
      case "claude":
        return {
          ...baseOptions,
          removeMarkdownSymbols: false, // Claude часто использует текстовые таблицы
          cleaningLevel: "standard",
          normalizeColumns: true
        }

      case "chatgpt":
        return {
          ...baseOptions,
          removeMarkdownSymbols: true, // ChatGPT использует Markdown
          cleaningLevel: "standard",
          fixMergedCells: true
        }

      case "gemini":
        return {
          ...baseOptions,
          cleaningLevel: "aggressive",
          removeHtmlTags: true
        }

      case "deepseek":
        return {
          ...baseOptions,
          cleaningLevel: "standard",
          normalizeDiacritics: true // Поддержка китайских символов
        }

      default:
        return baseOptions
    }
  }
}
