import type { FormattingOptions, FormattingOperation, CellData, TableStructureInfo } from './types';

/**
 * Анализ структуры таблицы
 */
export const analyzeTableStructure = (
  headers: string[],
  rows: string[][],
  element?: HTMLElement
): TableStructureInfo => {
  const structure: TableStructureInfo = {
    hasHeaders: headers.length > 0,
    headerRowCount: headers.length > 0 ? 1 : 0,
    columnCount: Math.max(headers.length, ...rows.map(row => row.length)),
    rowCount: rows.length,
    hasMergedCells: false,
    inconsistentColumns: false,
    detectedFormat: 'text'
  };

  // Определяем формат
  if (element) {
    if (element.tagName.toLowerCase() === 'table') {
      structure.detectedFormat = 'html';
      structure.hasMergedCells = checkForMergedCells(element);
    } else if (element.textContent?.includes('|')) {
      structure.detectedFormat = 'markdown';
    } else {
      structure.detectedFormat = 'text';
    }
  }

  // Проверяем консистентность колонок
  const targetColumnCount = structure.columnCount;
  structure.inconsistentColumns = rows.some(row => row.length !== targetColumnCount);

  return structure;
};

/**
 * Проверка наличия объединенных ячеек в HTML таблице (browser-совместимо)
 */
const checkForMergedCells = (element: HTMLElement): boolean => {
  const cellsWithColspan = element.querySelectorAll('td[colspan], th[colspan]');
  const cellsWithRowspan = element.querySelectorAll('td[rowspan], th[rowspan]');
  return cellsWithColspan.length > 0 || cellsWithRowspan.length > 0;
};

/**
 * Исправление структуры таблицы
 */
export const fixTableStructure = (
  headers: string[],
  rows: string[][],
  options: FormattingOptions,
  element?: HTMLElement
): {
  fixedHeaders: string[];
  fixedRows: string[][];
  operations: FormattingOperation[];
} => {
  const operations: FormattingOperation[] = [];
  let fixedHeaders = [...headers];
  let fixedRows = rows.map(row => [...row]);

  // 1. Обработка объединенных ячеек
  if (options.fixMergedCells && element && element.tagName.toLowerCase() === 'table') {
    const mergedCellsResult = processMergedCells(element, fixedHeaders, fixedRows);
    fixedHeaders = mergedCellsResult.headers;
    fixedRows = mergedCellsResult.rows;
    operations.push(...mergedCellsResult.operations);
  }

  // 2. Восстановление заголовков
  if (options.restoreHeaders && fixedHeaders.length === 0 && fixedRows.length > 0) {
    const headerResult = restoreHeaders(fixedRows);
    fixedHeaders = headerResult.headers;
    fixedRows = headerResult.rows;
    operations.push(...headerResult.operations);
  }

  // 3. Нормализация количества колонок
  if (options.normalizeColumns) {
    const normalizedResult = normalizeColumnCount(fixedHeaders, fixedRows, options);
    fixedHeaders = normalizedResult.headers;
    fixedRows = normalizedResult.rows;
    operations.push(...normalizedResult.operations);
  }

  // 4. Валидация структуры
  if (options.validateStructure) {
    const validationResult = validateAndFixStructure(fixedHeaders, fixedRows);
    fixedHeaders = validationResult.headers;
    fixedRows = validationResult.rows;
    operations.push(...validationResult.operations);
  }

  return {
    fixedHeaders,
    fixedRows,
    operations
  };
};

/**
 * Обработка объединенных ячеек в HTML таблице
 */
const processMergedCells = (
  element: HTMLElement,
  headers: string[],
  rows: string[][]
): {
  headers: string[];
  rows: string[][];
  operations: FormattingOperation[];
} => {
  const operations: FormattingOperation[] = [];
  const cellsWithColspan = element.querySelectorAll('td[colspan], th[colspan]');
  const cellsWithRowspan = element.querySelectorAll('td[rowspan], th[rowspan]');
  
  // Создаем матрицу ячеек с учетом span-ов
  const cellMatrix: CellData[][] = [];
  let maxColumns = 0;

  // Обрабатываем заголовки
  const theadRows = element.querySelector('thead tr') || element.querySelector('tr:first-child');
  if (theadRows) {
    const headerRow = processCellRow(theadRows, 0, true);
    cellMatrix.push(headerRow.cells);
    maxColumns = Math.max(maxColumns, headerRow.actualColumns);
    
    if (headerRow.operations.length > 0) {
      operations.push(...headerRow.operations);
    }
  }

  // Обрабатываем строки данных
  const tbodyRows = element.querySelectorAll('tbody tr');
  if (tbodyRows.length === 0) {
    // Если нет tbody, ищем все tr кроме первой
    const allRows = element.querySelectorAll('tr');
    for (let i = 1; i < allRows.length; i++) {
      const rowData = processCellRow(allRows[i], cellMatrix.length, false);
      cellMatrix.push(rowData.cells);
      maxColumns = Math.max(maxColumns, rowData.actualColumns);
      
      if (rowData.operations.length > 0) {
        operations.push(...rowData.operations);
      }
    }
  } else {
    tbodyRows.forEach((row, index) => {
      const rowData = processCellRow(row, cellMatrix.length, false);
      cellMatrix.push(rowData.cells);
      maxColumns = Math.max(maxColumns, rowData.actualColumns);
      
      if (rowData.operations.length > 0) {
        operations.push(...rowData.operations);
      }
    });
  }

  // Преобразуем матрицу обратно в headers/rows
  const newHeaders: string[] = [];
  const newRows: string[][] = [];

  if (cellMatrix.length > 0) {
    // Заголовки из первой строки
    for (let col = 0; col < maxColumns; col++) {
      const cell = cellMatrix[0][col];
      newHeaders.push(cell ? cell.content : '');
    }

    // Строки данных
    for (let row = 1; row < cellMatrix.length; row++) {
      const rowData: string[] = [];
      for (let col = 0; col < maxColumns; col++) {
        const cell = cellMatrix[row][col];
        rowData.push(cell ? cell.content : '');
      }
      newRows.push(rowData);
    }
  }

  return {
    headers: newHeaders,
    rows: newRows,
    operations
  };
};

/**
 * Обработка строки с учетом colspan/rowspan
 */
const processCellRow = (
  row: Element,
  rowIndex: number,
  isHeader: boolean
): {
  cells: CellData[];
  actualColumns: number;
  operations: FormattingOperation[];
} => {
  const cells: CellData[] = [];
  const operations: FormattingOperation[] = [];
  let columnIndex = 0;

  const cellsWithColspan = row.querySelectorAll('td, th');
  cellsWithColspan.forEach((cell, cellIndex) => {
    const content = cell.textContent?.trim() || '';
    const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);
    const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);

    // Создаем основную ячейку
    const cellData: CellData = {
      content,
      originalContent: content,
      rowIndex,
      columnIndex,
      colSpan: colspan > 1 ? colspan : undefined,
      rowSpan: rowspan > 1 ? rowspan : undefined,
      isHeader
    };

    cells[columnIndex] = cellData;

    // Если есть colspan, дублируем содержимое в соседние ячейки
    if (colspan > 1) {
      operations.push({
        type: 'structure-fixed',
        description: `Обработан colspan=${colspan} в ячейке`,
        cellPosition: { row: rowIndex, col: columnIndex },
        before: `[colspan=${colspan}] ${content}`,
        after: `Раздублировано в ${colspan} ячеек`
      });

      for (let i = 1; i < colspan; i++) {
        cells[columnIndex + i] = {
          ...cellData,
          columnIndex: columnIndex + i,
          content: '', // Пустые ячейки для colspan
          originalContent: content
        };
      }
    }

    columnIndex += colspan;
  });

  return {
    cells,
    actualColumns: columnIndex,
    operations
  };
};

/**
 * Восстановление заголовков из первой строки
 */
const restoreHeaders = (
  rows: string[][]
): {
  headers: string[];
  rows: string[][];
  operations: FormattingOperation[];
} => {
  const operations: FormattingOperation[] = [];

  if (rows.length === 0) {
    return { headers: [], rows: [], operations };
  }

  const firstRow = rows[0];
  const remainingRows = rows.slice(1);

  // Проверяем, похожа ли первая строка на заголовки
  const looksLikeHeaders = firstRow.every(cell => {
    const text = cell.toLowerCase().trim();
    return text.length > 0 && 
           !text.match(/^\d+\.?\d*$/) && // Не просто числа
           text.length < 50; // Разумная длина для заголовка
  });

  if (looksLikeHeaders) {
    operations.push({
      type: 'header-restored',
      description: 'Восстановлены заголовки из первой строки',
      before: 'Нет заголовков',
      after: `Заголовки: ${firstRow.join(', ')}`
    });

    return {
      headers: firstRow,
      rows: remainingRows,
      operations
    };
  }

  // Если первая строка не похожа на заголовки, генерируем дефолтные
  const defaultHeaders = firstRow.map((_, index) => `Колонка ${index + 1}`);
  
  operations.push({
    type: 'header-restored',
    description: 'Созданы автоматические заголовки',
    before: 'Нет заголовков',
    after: `Заголовки: ${defaultHeaders.join(', ')}`
  });

  return {
    headers: defaultHeaders,
    rows,
    operations
  };
};

/**
 * Нормализация количества колонок
 */
const normalizeColumnCount = (
  headers: string[],
  rows: string[][],
  options: FormattingOptions
): {
  headers: string[];
  rows: string[][];
  operations: FormattingOperation[];
} => {
  const operations: FormattingOperation[] = [];
  const targetColumnCount = Math.max(headers.length, ...rows.map(row => row.length));

  // Дополняем заголовки если нужно
  const normalizedHeaders = [...headers];
  while (normalizedHeaders.length < targetColumnCount) {
    const missingIndex = normalizedHeaders.length + 1;
    normalizedHeaders.push(`Колонка ${missingIndex}`);
    operations.push({
      type: 'structure-fixed',
      description: `Добавлен отсутствующий заголовок: Колонка ${missingIndex}`,
    });
  }

  // Нормализуем строки
  const normalizedRows = rows.map((row, rowIndex) => {
    const normalizedRow = [...row];
    
    // Дополняем короткие строки
    while (normalizedRow.length < targetColumnCount) {
      normalizedRow.push(options.fillEmptyCells ? '' : '');
      operations.push({
        type: 'structure-fixed',
        description: 'Добавлена пустая ячейка для выравнивания колонок',
        cellPosition: { row: rowIndex, col: normalizedRow.length - 1 }
      });
    }

    // Обрезаем слишком длинные строки
    if (normalizedRow.length > targetColumnCount) {
      const removedCells = normalizedRow.splice(targetColumnCount);
      operations.push({
        type: 'structure-fixed',
        description: `Удалены лишние ячейки: ${removedCells.join(', ')}`,
        cellPosition: { row: rowIndex, col: targetColumnCount }
      });
    }

    return normalizedRow;
  });

  return {
    headers: normalizedHeaders,
    rows: normalizedRows,
    operations
  };
};

/**
 * Валидация и финальное исправление структуры
 */
const validateAndFixStructure = (
  headers: string[],
  rows: string[][]
): {
  headers: string[];
  rows: string[][];
  operations: FormattingOperation[];
} => {
  const operations: FormattingOperation[] = [];
  
  // Удаляем полностью пустые строки
  const nonEmptyRows = rows.filter((row, index) => {
    const isEmpty = row.every(cell => !cell.trim());
    if (isEmpty) {
      operations.push({
        type: 'structure-fixed',
        description: `Удалена пустая строка ${index + 1}`,
        cellPosition: { row: index, col: 0 }
      });
    }
    return !isEmpty;
  });

  // Удаляем полностью пустые колонки
  const nonEmptyColumnIndices: number[] = [];
  for (let col = 0; col < headers.length; col++) {
    const hasContent = headers[col].trim() || 
                      nonEmptyRows.some(row => row[col] && row[col].trim());
    if (hasContent) {
      nonEmptyColumnIndices.push(col);
    } else {
      operations.push({
        type: 'structure-fixed',
        description: `Удалена пустая колонка ${col + 1}`,
        cellPosition: { row: 0, col }
      });
    }
  }

  const cleanHeaders = nonEmptyColumnIndices.map(index => headers[index]);
  const cleanRows = nonEmptyRows.map(row => 
    nonEmptyColumnIndices.map(index => row[index] || '')
  );

  return {
    headers: cleanHeaders,
    rows: cleanRows,
    operations
  };
}; 