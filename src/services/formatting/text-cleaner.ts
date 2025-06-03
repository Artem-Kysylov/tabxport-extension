import { normalizeText, normalizeWhiteSpaces, normalizeDiacritics } from 'normalize-text';
import * as cleanTextUtils from 'clean-text-utils';
import type { FormattingOptions, FormattingOperation } from './types';

/**
 * Продвинутая очистка текста в ячейках таблиц
 */
export const cleanCellText = (
  content: string,
  options: FormattingOptions,
  position: { row: number; col: number }
): { cleaned: string; operations: FormattingOperation[] } => {
  if (!content || typeof content !== 'string') {
    return { cleaned: '', operations: [] };
  }

  const operations: FormattingOperation[] = [];
  let result = content;
  const original = content;

  // 1. Базовая нормализация пробелов
  if (options.normalizeWhitespace) {
    const normalized = normalizeWhiteSpaces(result);
    if (normalized !== result) {
      operations.push({
        type: 'cell-cleaned',
        description: 'Нормализованы пробелы',
        cellPosition: position,
        before: result,
        after: normalized
      });
      result = normalized;
    }
  }

  // 2. Удаление HTML тегов
  if (options.removeHtmlTags) {
    const withoutTags = cleanTextUtils.strip.nonASCII(result);
    if (withoutTags !== result) {
      operations.push({
        type: 'cell-cleaned',
        description: 'Удалены HTML теги',
        cellPosition: position,
        before: result,
        after: withoutTags
      });
      result = withoutTags;
    }
  }

  // 3. Нормализация диакритиков (ё→е, ü→u и т.д.)
  if (options.normalizeDiacritics) {
    const normalized = normalizeDiacritics(result);
    if (normalized !== result) {
      operations.push({
        type: 'cell-cleaned',
        description: 'Нормализованы диакритики',
        cellPosition: position,
        before: result,
        after: normalized
      });
      result = normalized;
    }
  }

  // 4. Удаление Markdown символов
  if (options.removeMarkdownSymbols) {
    const cleaned = removeMarkdownArtifacts(result);
    if (cleaned !== result) {
      operations.push({
        type: 'markdown-processed',
        description: 'Удалены Markdown символы',
        cellPosition: position,
        before: result,
        after: cleaned
      });
      result = cleaned;
    }
  }

  // 5. Очистка в зависимости от уровня агрессивности
  switch (options.cleaningLevel) {
    case 'aggressive':
      result = applyAggressiveCleaning(result, position, operations);
      break;
    case 'standard':
      result = applyStandardCleaning(result, position, operations);
      break;
    case 'minimal':
      result = applyMinimalCleaning(result, position, operations);
      break;
  }

  // 6. Финальная нормализация
  const finalResult = result.trim();

  return {
    cleaned: finalResult,
    operations
  };
};

/**
 * Удаление Markdown артефактов
 */
const removeMarkdownArtifacts = (text: string): string => {
  return text
    // Удаляем разделители таблиц
    .replace(/^\|?\s*[-:]+\s*\|?$/gm, '')
    // Удаляем лишние | в начале и конце
    .replace(/^\|\s*/, '')
    .replace(/\s*\|$/, '')
    // Удаляем двойные пробелы после удаления |
    .replace(/\s+/g, ' ')
    // Удаляем markdown форматирование
    .replace(/\*\*(.*?)\*\*/g, '$1') // **bold**
    .replace(/\*(.*?)\*/g, '$1')     // *italic*
    .replace(/`(.*?)`/g, '$1')       // `code`
    .replace(/~~(.*?)~~/g, '$1')     // ~~strikethrough~~
    .trim();
};

/**
 * Агрессивная очистка - максимальное удаление артефактов
 */
const applyAggressiveCleaning = (
  text: string,
  position: { row: number; col: number },
  operations: FormattingOperation[]
): string => {
  let result = text;

  // Удаляем эмодзи
  const withoutEmoji = cleanTextUtils.strip.emoji(result);
  if (withoutEmoji !== result) {
    operations.push({
      type: 'cell-cleaned',
      description: 'Удалены эмодзи (агрессивная очистка)',
      cellPosition: position,
      before: result,
      after: withoutEmoji
    });
    result = withoutEmoji;
  }

  // Удаляем все не-ASCII символы
  const withoutNonASCII = cleanTextUtils.strip.nonASCII(result);
  if (withoutNonASCII !== result) {
    operations.push({
      type: 'cell-cleaned',
      description: 'Удалены не-ASCII символы (агрессивная очистка)',
      cellPosition: position,
      before: result,
      after: withoutNonASCII
    });
    result = withoutNonASCII;
  }

  // Заменяем экзотические символы
  const normalized = cleanTextUtils.replace.exoticChars(result);
  if (normalized !== result) {
    operations.push({
      type: 'cell-cleaned',
      description: 'Заменены экзотические символы (агрессивная очистка)',
      cellPosition: position,
      before: result,
      after: normalized
    });
    result = normalized;
  }

  return result;
};

/**
 * Стандартная очистка - разумный баланс
 */
const applyStandardCleaning = (
  text: string,
  position: { row: number; col: number },
  operations: FormattingOperation[]
): string => {
  let result = text;

  // Заменяем умные кавычки
  const withSmartChars = cleanTextUtils.replace.smartChars(result);
  if (withSmartChars !== result) {
    operations.push({
      type: 'cell-cleaned',
      description: 'Заменены умные кавычки (стандартная очистка)',
      cellPosition: position,
      before: result,
      after: withSmartChars
    });
    result = withSmartChars;
  }

  // Удаляем UTF8 BOM
  const withoutBOM = cleanTextUtils.strip.bom(result);
  if (withoutBOM !== result) {
    operations.push({
      type: 'cell-cleaned',
      description: 'Удален UTF8 BOM (стандартная очистка)',
      cellPosition: position,
      before: result,
      after: withoutBOM
    });
    result = withoutBOM;
  }

  // Нормализуем переносы строк
  result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  return result;
};

/**
 * Минимальная очистка - только самое необходимое
 */
const applyMinimalCleaning = (
  text: string,
  position: { row: number; col: number },
  operations: FormattingOperation[]
): string => {
  let result = text;

  // Только удаляем лишние пробелы
  const withoutExtraSpace = cleanTextUtils.strip.extraSpace(result);
  if (withoutExtraSpace !== result) {
    operations.push({
      type: 'cell-cleaned',
      description: 'Удалены лишние пробелы (минимальная очистка)',
      cellPosition: position,
      before: result,
      after: withoutExtraSpace
    });
    result = withoutExtraSpace;
  }

  return result;
};

/**
 * Специальная очистка для многострочного текста
 */
export const cleanMultilineText = (
  text: string,
  options: FormattingOptions
): string => {
  if (!text || !text.includes('\n')) {
    return text;
  }

  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join(' ')
    .trim();
};

/**
 * Валидация очищенного текста
 */
export const validateCleanedText = (original: string, cleaned: string): boolean => {
  // Проверяем, что не потеряли критически важную информацию
  if (!cleaned && original.trim()) {
    return false; // Потеряли весь контент
  }

  // Проверяем, что не слишком много сократили
  const reductionRatio = cleaned.length / original.length;
  if (reductionRatio < 0.3 && original.length > 10) {
    return false; // Слишком агрессивная очистка
  }

  return true;
}; 