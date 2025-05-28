import type { TableData } from '../types';

// Определение источника по URL
export const detectSource = (url: string): 'chatgpt' | 'claude' | 'gemini' | 'other' => {
  if (url.includes('chat.openai.com')) return 'chatgpt';
  if (url.includes('claude.ai')) return 'claude';
  if (url.includes('gemini.google.com')) return 'gemini';
  return 'other';
};

// Генерация уникального ID для таблицы
export const generateTableId = (element: HTMLElement): string => {
  const timestamp = Date.now();
  const elementIndex = Array.from(document.querySelectorAll('table, pre')).indexOf(element);
  return `table_${timestamp}_${elementIndex}`;
};

// Парсинг HTML таблицы
export const parseHTMLTable = (table: HTMLTableElement): { headers: string[]; rows: string[][] } => {
  const headers: string[] = [];
  const rows: string[][] = [];

  // Ищем заголовки в thead или первой строке tbody
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody') || table;

  if (thead) {
    const headerRow = thead.querySelector('tr');
    if (headerRow) {
      const headerCells = headerRow.querySelectorAll('th, td');
      headerCells.forEach(cell => {
        headers.push(cell.textContent?.trim() || '');
      });
    }
  }

  // Парсим строки данных
  const dataRows = tbody.querySelectorAll('tr');
  dataRows.forEach((row, index) => {
    // Пропускаем первую строку, если она была использована как заголовок и нет thead
    if (!thead && index === 0 && headers.length === 0) {
      const cells = row.querySelectorAll('th, td');
      cells.forEach(cell => {
        headers.push(cell.textContent?.trim() || '');
      });
      return;
    }

    const rowData: string[] = [];
    const cells = row.querySelectorAll('td, th');
    cells.forEach(cell => {
      rowData.push(cell.textContent?.trim() || '');
    });

    if (rowData.length > 0) {
      rows.push(rowData);
    }
  });

  return { headers, rows };
};

// Парсинг markdown таблицы из текста
export const parseMarkdownTable = (text: string): { headers: string[]; rows: string[][] } => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  const headers: string[] = [];
  const rows: string[][] = [];

  // Первая строка - заголовки
  const headerLine = lines[0];
  if (headerLine.startsWith('|') && headerLine.endsWith('|')) {
    const headerCells = headerLine.slice(1, -1).split('|').map(cell => cell.trim());
    headers.push(...headerCells);
  }

  // Пропускаем разделительную строку (обычно вторая строка с |---|---|)
  let startIndex = 1;
  if (lines[1] && lines[1].includes('---')) {
    startIndex = 2;
  }

  // Парсим строки данных
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.slice(1, -1).split('|').map(cell => cell.trim());
      if (cells.length === headers.length) {
        rows.push(cells);
      }
    }
  }

  return { headers, rows };
};

// Поиск markdown таблиц в pre блоках
export const findMarkdownTablesInPre = (preElement: HTMLPreElement): { headers: string[]; rows: string[][] } | null => {
  const text = preElement.textContent || '';
  
  // Проверяем, содержит ли текст markdown таблицу
  const hasTablePattern = /\|.*\|.*\n.*\|.*---.*\|/;
  if (!hasTablePattern.test(text)) {
    return null;
  }

  return parseMarkdownTable(text);
};

// Основная функция для извлечения данных таблицы
export const extractTableData = (element: HTMLElement): TableData | null => {
  const url = window.location.href;
  const source = detectSource(url);
  const id = generateTableId(element);
  const timestamp = Date.now();

  let headers: string[] = [];
  let rows: string[][] = [];

  if (element.tagName.toLowerCase() === 'table') {
    const tableData = parseHTMLTable(element as HTMLTableElement);
    headers = tableData.headers;
    rows = tableData.rows;
  } else if (element.tagName.toLowerCase() === 'pre') {
    const markdownData = findMarkdownTablesInPre(element as HTMLPreElement);
    if (!markdownData) return null;
    headers = markdownData.headers;
    rows = markdownData.rows;
  } else {
    return null;
  }

  // Валидация данных
  if (headers.length === 0 && rows.length === 0) {
    return null;
  }

  return {
    id,
    headers,
    rows,
    source,
    timestamp,
    url,
  };
};

// Поиск всех таблиц на странице
export const findAllTables = (): HTMLElement[] => {
  const tables: HTMLElement[] = [];
  
  // HTML таблицы
  const htmlTables = document.querySelectorAll('table');
  htmlTables.forEach(table => {
    // Проверяем, что таблица видима и содержит данные
    if (table.offsetParent !== null && table.rows.length > 0) {
      tables.push(table);
    }
  });

  // Pre блоки с markdown таблицами
  const preElements = document.querySelectorAll('pre');
  preElements.forEach(pre => {
    if (pre.offsetParent !== null && findMarkdownTablesInPre(pre)) {
      tables.push(pre);
    }
  });

  return tables;
};

// Проверка, является ли элемент валидной таблицей
export const isValidTable = (element: HTMLElement): boolean => {
  const tableData = extractTableData(element);
  return tableData !== null && (tableData.headers.length > 0 || tableData.rows.length > 0);
}; 