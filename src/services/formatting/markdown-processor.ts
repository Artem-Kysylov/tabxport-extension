import type { FormattingOptions, FormattingOperation } from './types';

/**
 * Улучшенный парсинг Markdown таблиц (browser-совместимый)
 */
export const parseMarkdownTableAdvanced = (
  text: string,
  options: FormattingOptions
): {
  headers: string[];
  rows: string[][];
  operations: FormattingOperation[];
} => {
  const operations: FormattingOperation[] = [];
  
  // Используем собственный browser-совместимый парсер
  return parseMarkdownTableFallback(text, options, operations);
};

/**
 * Fallback парсер для Markdown таблиц
 */
const parseMarkdownTableFallback = (
  text: string,
  options: FormattingOptions,
  operations: FormattingOperation[]
): {
  headers: string[];
  rows: string[][];
  operations: FormattingOperation[];
} => {
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length < 2) {
    return { headers: [], rows: [], operations };
  }

  // Поиск markdown таблиц с |
  const tableLines = lines.filter(line => line.includes('|'));
  
  if (tableLines.length < 2) {
    // Попробуем найти текстовые таблицы с пробелами
    return parseSpaceSeparatedTable(lines, options, operations);
  }

  const headers: string[] = [];
  const rows: string[][] = [];

  // Обрабатываем первую строку как заголовки
  const headerLine = tableLines[0];
  const parsedHeaders = parseTableLine(headerLine, options);
  headers.push(...parsedHeaders.cells);
  
  if (parsedHeaders.operations.length > 0) {
    operations.push(...parsedHeaders.operations);
  }

  // Ищем разделительную строку и пропускаем её
  let dataStartIndex = 1;
  for (let i = 1; i < tableLines.length; i++) {
    if (isAlignmentLine(tableLines[i])) {
      const alignment = parseAlignment(tableLines[i]);
      operations.push({
        type: 'markdown-processed',
        description: `Обнаружено выравнивание: ${alignment.join(', ')}`,
        before: tableLines[i],
        after: 'Применено выравнивание'
      });
      dataStartIndex = i + 1;
      break;
    }
  }

  // Парсим строки данных
  for (let i = dataStartIndex; i < tableLines.length; i++) {
    const line = tableLines[i];
    if (!isAlignmentLine(line)) {
      const parsedRow = parseTableLine(line, options);
      
      // Нормализуем количество ячеек
      const normalizedRow = normalizeRowLength(parsedRow.cells, headers.length);
      rows.push(normalizedRow);
      
      if (parsedRow.operations.length > 0) {
        operations.push(...parsedRow.operations);
      }
    }
  }

  operations.push({
    type: 'markdown-processed',
    description: 'Markdown таблица обработана fallback парсером',
    before: `${tableLines.length} строк с |`,
    after: `${headers.length} заголовков, ${rows.length} строк данных`
  });

  return { headers, rows, operations };
};

/**
 * Парсинг строки таблицы
 */
const parseTableLine = (
  line: string,
  options: FormattingOptions
): {
  cells: string[];
  operations: FormattingOperation[];
} => {
  const operations: FormattingOperation[] = [];
  
  // Удаляем ведущие и конечные |
  let cleanLine = line.trim();
  if (cleanLine.startsWith('|')) {
    cleanLine = cleanLine.substring(1);
  }
  if (cleanLine.endsWith('|')) {
    cleanLine = cleanLine.substring(0, cleanLine.length - 1);
  }

  // Разбиваем по |
  const cells = cleanLine.split('|').map(cell => {
    let cleaned = cell.trim();
    
    // Удаляем markdown форматирование если включено
    if (options.removeMarkdownSymbols) {
      const original = cleaned;
      cleaned = removeMarkdownFormatting(cleaned);
      
      if (cleaned !== original) {
        operations.push({
          type: 'markdown-processed',
          description: 'Удалено markdown форматирование из ячейки',
          before: original,
          after: cleaned
        });
      }
    }
    
    return cleaned;
  });

  return { cells, operations };
};

/**
 * Удаление markdown форматирования
 */
const removeMarkdownFormatting = (text: string): string => {
  return text
    // Жирный текст
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    // Курсив
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // Код
    .replace(/`(.*?)`/g, '$1')
    // Зачеркнутый
    .replace(/~~(.*?)~~/g, '$1')
    // Ссылки
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Экранированные символы
    .replace(/\\(.)/g, '$1')
    .trim();
};

/**
 * Проверка, является ли строка разделителем выравнивания
 */
const isAlignmentLine = (line: string): boolean => {
  const cleanLine = line.replace(/[|\s]/g, '');
  return /^[-:]+$/.test(cleanLine) && cleanLine.includes('-');
};

/**
 * Парсинг выравнивания из разделительной строки
 */
const parseAlignment = (line: string): string[] => {
  const cells = line.split('|')
    .map(cell => cell.trim())
    .filter(cell => cell.length > 0);
  
  return cells.map(cell => {
    if (cell.startsWith(':') && cell.endsWith(':')) {
      return 'center';
    } else if (cell.endsWith(':')) {
      return 'right';
    } else {
      return 'left';
    }
  });
};

/**
 * Нормализация длины строки
 */
const normalizeRowLength = (cells: string[], targetLength: number): string[] => {
  const normalized = [...cells];
  
  // Дополняем до нужной длины
  while (normalized.length < targetLength) {
    normalized.push('');
  }
  
  // Обрезаем лишние ячейки
  if (normalized.length > targetLength) {
    normalized.splice(targetLength);
  }
  
  return normalized;
};

/**
 * Парсинг таблиц, разделенных пробелами (для Claude)
 */
const parseSpaceSeparatedTable = (
  lines: string[],
  options: FormattingOptions,
  operations: FormattingOperation[]
): {
  headers: string[];
  rows: string[][];
  operations: FormattingOperation[];
} => {
  // Ищем строки с множественными пробелами
  const spaceSeparatedLines = lines.filter(line => 
    line.split(/\s{2,}|\t/).length >= 2
  );
  
  if (spaceSeparatedLines.length < 2) {
    return { headers: [], rows: [], operations };
  }

  // Первая строка как заголовки
  const headers = spaceSeparatedLines[0]
    .split(/\s{2,}|\t/)
    .map(cell => cell.trim())
    .filter(cell => cell.length > 0);

  // Остальные строки как данные
  const rows: string[][] = [];
  for (let i = 1; i < spaceSeparatedLines.length; i++) {
    const cells = spaceSeparatedLines[i]
      .split(/\s{2,}|\t/)
      .map(cell => cell.trim());
    
    const normalizedRow = normalizeRowLength(cells, headers.length);
    rows.push(normalizedRow);
  }

  operations.push({
    type: 'markdown-processed',
    description: 'Обработана таблица, разделенная пробелами (Claude-стиль)',
    before: `${spaceSeparatedLines.length} строк с множественными пробелами`,
    after: `${headers.length} заголовков, ${rows.length} строк данных`
  });

  return { headers, rows, operations };
};

/**
 * Обработка многострочных ячеек в Markdown
 */
export const processMultilineCells = (
  headers: string[],
  rows: string[][],
  options: FormattingOptions
): {
  headers: string[];
  rows: string[][];
  operations: FormattingOperation[];
} => {
  const operations: FormattingOperation[] = [];
  
  // Обрабатываем заголовки
  const processedHeaders = headers.map(header => {
    if (header.includes('\n')) {
      const processed = header.replace(/\n+/g, ' ').trim();
      operations.push({
        type: 'markdown-processed',
        description: 'Объединены многострочные заголовки',
        before: header,
        after: processed
      });
      return processed;
    }
    return header;
  });

  // Обрабатываем ячейки данных
  const processedRows = rows.map((row, rowIndex) => 
    row.map((cell, colIndex) => {
      if (cell.includes('\n')) {
        const processed = cell.replace(/\n+/g, ' ').trim();
        operations.push({
          type: 'markdown-processed',
          description: 'Объединена многострочная ячейка',
          cellPosition: { row: rowIndex, col: colIndex },
          before: cell,
          after: processed
        });
        return processed;
      }
      return cell;
    })
  );

  return {
    headers: processedHeaders,
    rows: processedRows,
    operations
  };
}; 