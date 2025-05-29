import type { TableData } from '../types';

// Определение источника по URL
export const detectSource = (url: string): 'chatgpt' | 'claude' | 'gemini' | 'other' => {
  if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) return 'chatgpt';
  if (url.includes('claude.ai')) return 'claude';
  if (url.includes('gemini.google.com') || url.includes('bard.google.com')) return 'gemini';
  if (url.includes('x.com') || url.includes('twitter.com')) return 'other'; // Grok
  return 'other';
};

// Генерация уникального ID для таблицы
export const generateTableId = (element: HTMLElement): string => {
  const timestamp = Date.now();
  const elementIndex = Array.from(document.querySelectorAll('table, pre, div')).indexOf(element);
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

// Парсинг div-таблицы (используется в ChatGPT, Claude)
export const parseDivTable = (container: HTMLElement): { headers: string[]; rows: string[][] } => {
  const headers: string[] = [];
  const rows: string[][] = [];

  // Ищем различные паттерны div-таблиц
  
  // Паттерн 1: div с role="table" или классами table
  const tableDiv = container.querySelector('[role="table"], .table, [class*="table"]');
  if (tableDiv) {
    const headerRow = tableDiv.querySelector('[role="row"]:first-child, .table-header, [class*="header"]');
    if (headerRow) {
      const headerCells = headerRow.querySelectorAll('[role="columnheader"], [role="cell"], .cell, [class*="cell"]');
      headerCells.forEach(cell => {
        headers.push(cell.textContent?.trim() || '');
      });
    }

    const dataRows = tableDiv.querySelectorAll('[role="row"]:not(:first-child), .table-row, [class*="row"]:not([class*="header"])');
    dataRows.forEach(row => {
      const rowData: string[] = [];
      const cells = row.querySelectorAll('[role="cell"], .cell, [class*="cell"]');
      cells.forEach(cell => {
        rowData.push(cell.textContent?.trim() || '');
      });
      if (rowData.length > 0) {
        rows.push(rowData);
      }
    });
  }

  // Паттерн 2: Поиск структур с повторяющимися div-ами
  if (headers.length === 0 && rows.length === 0) {
    const potentialRows = container.querySelectorAll('div');
    const rowCandidates: HTMLElement[] = [];
    
    // Ищем div-ы с одинаковой структурой (потенциальные строки таблицы)
    potentialRows.forEach(div => {
      const children = div.children;
      if (children.length >= 2 && children.length <= 10) { // Разумное количество колонок
        // Проверяем, что дочерние элементы содержат текст
        const hasText = Array.from(children).some(child => 
          child.textContent && child.textContent.trim().length > 0
        );
        if (hasText) {
          rowCandidates.push(div);
        }
      }
    });

    // Если нашли несколько похожих строк
    if (rowCandidates.length >= 2) {
      const firstRowChildren = rowCandidates[0].children.length;
      const consistentRows = rowCandidates.filter(row => row.children.length === firstRowChildren);
      
      if (consistentRows.length >= 2) {
        // Первая строка как заголовки
        Array.from(consistentRows[0].children).forEach(child => {
          headers.push(child.textContent?.trim() || '');
        });

        // Остальные как данные
        consistentRows.slice(1).forEach(row => {
          const rowData: string[] = [];
          Array.from(row.children).forEach(child => {
            rowData.push(child.textContent?.trim() || '');
          });
          rows.push(rowData);
        });
      }
    }
  }

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

// Поиск markdown таблиц в pre блоках и code блоках
export const findMarkdownTablesInElement = (element: HTMLElement): { headers: string[]; rows: string[][] } | null => {
  const text = element.textContent || '';
  
  // Проверяем, содержит ли текст markdown таблицу
  const hasTablePattern = /\|.*\|.*\n.*\|.*---.*\|/;
  if (!hasTablePattern.test(text)) {
    return null;
  }

  return parseMarkdownTable(text);
};

// Поиск таблиц в тексте сообщений (для ChatGPT, Claude)
export const findTablesInTextContent = (container: HTMLElement): { headers: string[]; rows: string[][] } | null => {
  const text = container.textContent || '';
  
  // Фильтруем системные элементы ChatGPT
  if (text.includes('window.__oai') || text.includes('requestAnimationFrame') || text.length < 20) {
    console.log('TabXport: Skipping system element in text content analysis');
    return null;
  }
  
  console.log('TabXport: Analyzing text content for tables, length:', text.length);
  console.log('TabXport: Text preview:', text.substring(0, 150));
  
  // Ищем паттерны таблиц в тексте
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  console.log('TabXport: Total non-empty lines:', lines.length);
  
  // Ищем строки с разделителями |
  const pipeLines = lines.filter(line => line.includes('|'));
  console.log('TabXport: Lines with pipe separators:', pipeLines.length);
  
  if (pipeLines.length >= 2) {
    const headers: string[] = [];
    const rows: string[][] = [];

    // Парсим первую строку как заголовки
    const firstLine = pipeLines[0];
    console.log('TabXport: First pipe line:', firstLine);
    
    // Парсим ячейки из строки с |
    const headerCells = firstLine.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0);
    
    console.log('TabXport: Parsed header cells:', headerCells);
    
    if (headerCells.length >= 2) {
      headers.push(...headerCells);
      
      // Парсим остальные строки как данные (пропускаем разделители с ---)
      pipeLines.slice(1).forEach((line, index) => {
        if (line.includes('---')) {
          console.log(`TabXport: Skipping separator line ${index + 1}:`, line);
          return;
        }
        
        const cells = line.split('|')
          .map(cell => cell.trim())
          .filter(cell => cell.length > 0);
        
        console.log(`TabXport: Parsed row ${index + 1} cells:`, cells);
        
        // Проверяем, что количество ячеек соответствует заголовкам
        if (cells.length === headers.length) {
          rows.push(cells);
        } else if (cells.length > 0) {
          // Если количество ячеек не совпадает, дополняем или обрезаем
          const normalizedCells = [...cells];
          while (normalizedCells.length < headers.length) {
            normalizedCells.push('');
          }
          if (normalizedCells.length > headers.length) {
            normalizedCells.splice(headers.length);
          }
          rows.push(normalizedCells);
        }
      });
    }

    console.log('TabXport: Final parsed table - headers:', headers, 'rows:', rows);
    
    if (headers.length > 0 && rows.length > 0) {
      return { headers, rows };
    }
  }
  
  // Альтернативный метод: поиск таблиц с множественными пробелами или табуляцией
  const spaceSeparatedLines = lines.filter(line => 
    line.split(/\s{2,}|\t/).length >= 2 && 
    !line.includes('|') // Исключаем уже обработанные строки с |
  );
  
  if (spaceSeparatedLines.length >= 2) {
    console.log('TabXport: Trying space-separated table parsing');
    const headers: string[] = [];
    const rows: string[][] = [];

    // Первая строка как заголовки
    const firstLine = spaceSeparatedLines[0];
    headers.push(...firstLine.split(/\s{2,}|\t/).map(cell => cell.trim()));
    
    // Остальные строки как данные
    spaceSeparatedLines.slice(1).forEach(line => {
      const cells = line.split(/\s{2,}|\t/).map(cell => cell.trim());
      if (cells.length === headers.length) {
        rows.push(cells);
      }
    });

    if (headers.length > 0 && rows.length > 0) {
      console.log('TabXport: Space-separated table found - headers:', headers, 'rows:', rows);
      return { headers, rows };
    }
  }

  console.log('TabXport: No valid table structure found in text content');
  return null;
};

// Основная функция для извлечения данных таблицы
export const extractTableData = (element: HTMLElement): TableData | null => {
  const url = window.location.href;
  const source = detectSource(url);
  const id = generateTableId(element);
  const timestamp = Date.now();

  let headers: string[] = [];
  let rows: string[][] = [];

  console.log('TabXport: extractTableData called for element:', element.tagName, element.className);
  console.log('TabXport: Element text content preview:', element.textContent?.substring(0, 200));

  // HTML таблица
  if (element.tagName.toLowerCase() === 'table') {
    console.log('TabXport: Processing HTML table');
    const tableData = parseHTMLTable(element as HTMLTableElement);
    headers = tableData.headers;
    rows = tableData.rows;
    console.log('TabXport: HTML table headers:', headers);
    console.log('TabXport: HTML table rows:', rows);
  }
  // Pre или code блоки с markdown
  else if (element.tagName.toLowerCase() === 'pre' || element.tagName.toLowerCase() === 'code') {
    console.log('TabXport: Processing pre/code block');
    const markdownData = findMarkdownTablesInElement(element);
    if (markdownData) {
      headers = markdownData.headers;
      rows = markdownData.rows;
      console.log('TabXport: Markdown table headers:', headers);
      console.log('TabXport: Markdown table rows:', rows);
    }
  }
  // Div контейнеры (ChatGPT, Claude)
  else if (element.tagName.toLowerCase() === 'div') {
    console.log('TabXport: Processing div container');
    // Сначала пробуем div-таблицу
    const divTableData = parseDivTable(element);
    console.log('TabXport: Div table data:', divTableData);
    
    if (divTableData.headers.length > 0 || divTableData.rows.length > 0) {
      headers = divTableData.headers;
      rows = divTableData.rows;
      console.log('TabXport: Using div table data - headers:', headers);
      console.log('TabXport: Using div table data - rows:', rows);
    } else {
      // Затем ищем в текстовом содержимом
      console.log('TabXport: Trying text content analysis');
      const textTableData = findTablesInTextContent(element);
      if (textTableData) {
        headers = textTableData.headers;
        rows = textTableData.rows;
        console.log('TabXport: Using text table data - headers:', headers);
        console.log('TabXport: Using text table data - rows:', rows);
      }
    }
  }

  // Валидация данных
  if (headers.length === 0 && rows.length === 0) {
    console.log('TabXport: No valid table data found');
    return null;
  }

  const result: TableData = {
    id,
    headers,
    rows,
    source,
    timestamp,
    url,
  };

  console.log('TabXport: Final extracted table data:', result);
  return result;
};

// Поиск всех таблиц на странице
export const findAllTables = (): HTMLElement[] => {
  const tables: HTMLElement[] = [];
  const url = window.location.href;
  
  console.log('TabXport: Current URL:', url);
  
  // Специальный детектор для ChatGPT
  if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) {
    console.log('TabXport: Using ChatGPT-specific detector');
    const chatGPTTables = findChatGPTTables();
    console.log('TabXport: ChatGPT tables found:', chatGPTTables.length);
    tables.push(...chatGPTTables);
    
    // Для ChatGPT возвращаем только результаты специального детектора
    return tables;
  }
  
  // Специальный детектор для Claude
  if (url.includes('claude.ai')) {
    console.log('TabXport: Using Claude-specific detector');
    const claudeTables = findClaudeTables();
    console.log('TabXport: Claude tables found:', claudeTables.length);
    tables.push(...claudeTables);
    
    // Для Claude возвращаем только результаты специального детектора
    console.log('TabXport: Returning only Claude-specific results, skipping general detection');
    return tables;
  }
  
  // Для других сайтов используем общий алгоритм
  console.log('TabXport: Using general detector for other sites');
  
  // HTML таблицы
  const htmlTables = document.querySelectorAll('table');
  console.log('TabXport: HTML tables found:', htmlTables.length);
  htmlTables.forEach(table => {
    if (table.offsetParent !== null && table.rows.length > 0) {
      tables.push(table);
    }
  });

  // Pre и code блоки с markdown таблицами
  const codeElements = document.querySelectorAll('pre, code');
  console.log('TabXport: Code elements found:', codeElements.length);
  codeElements.forEach(element => {
    const htmlElement = element as HTMLElement;
    if (htmlElement.offsetParent !== null && findMarkdownTablesInElement(htmlElement)) {
      tables.push(htmlElement);
    }
  });

  // Div контейнеры с таблицами (только для не-ChatGPT и не-Claude сайтов)
  const divElements = document.querySelectorAll('div');
  console.log('TabXport: Div elements found:', divElements.length);
  let divTablesFound = 0;
  
  divElements.forEach(div => {
    const htmlDiv = div as HTMLElement;
    if (htmlDiv.offsetParent !== null) {
      // Проверяем, содержит ли div табличные данные
      const hasTableData = parseDivTable(htmlDiv);
      const hasTextTable = findTablesInTextContent(htmlDiv);
      
      if ((hasTableData.headers.length > 0 || hasTableData.rows.length > 0) || hasTextTable) {
        // Избегаем дублирования - не добавляем родительские элементы
        const isChildOfExisting = tables.some(existing => existing.contains(htmlDiv) || htmlDiv.contains(existing));
        if (!isChildOfExisting) {
          tables.push(htmlDiv);
          divTablesFound++;
        }
      }
    }
  });
  
  console.log('TabXport: Div tables found:', divTablesFound);
  console.log('TabXport: Total unique tables:', tables.length);

  return tables;
};

// Проверка, является ли элемент валидной таблицей
export const isValidTable = (element: HTMLElement): boolean => {
  const tableData = extractTableData(element);
  return tableData !== null && (tableData.headers.length > 0 || tableData.rows.length > 0);
};

// Специальный детектор для ChatGPT
export const findChatGPTTables = (): HTMLElement[] => {
  const tables: HTMLElement[] = [];
  
  console.log('TabXport: Starting ChatGPT table detection');
  
  // Ищем сообщения ChatGPT с более точными селекторами
  const messageContainers = document.querySelectorAll('[data-message-author-role="assistant"]');
  console.log(`TabXport: Found ${messageContainers.length} assistant messages`);

  messageContainers.forEach((container, containerIndex) => {
    const messageElement = container as HTMLElement;
    console.log(`TabXport: Processing assistant message ${containerIndex}`);
    
    // 1. Ищем HTML таблицы в сообщении
    const htmlTables = messageElement.querySelectorAll('table');
    console.log(`TabXport: Found ${htmlTables.length} HTML tables in message ${containerIndex}`);
    htmlTables.forEach((table, tableIndex) => {
      if (table.rows.length > 0) {
        console.log(`TabXport: Adding HTML table ${tableIndex} from message ${containerIndex}`);
        tables.push(table as HTMLElement);
      }
    });
    
    // 2. Ищем pre/code блоки с markdown таблицами
    const codeBlocks = messageElement.querySelectorAll('pre, code');
    console.log(`TabXport: Found ${codeBlocks.length} code blocks in message ${containerIndex}`);
    codeBlocks.forEach((block, blockIndex) => {
      const htmlBlock = block as HTMLElement;
      const blockText = htmlBlock.textContent || '';
      
      // Проверяем на markdown таблицу
      if (blockText.includes('|') && blockText.includes('\n')) {
        const markdownTable = findMarkdownTablesInElement(htmlBlock);
        if (markdownTable && markdownTable.headers.length > 0) {
          console.log(`TabXport: Adding markdown table ${blockIndex} from message ${containerIndex}`);
          tables.push(htmlBlock);
        }
      }
    });
    
    // 3. Ищем текстовые таблицы (но только в контенте сообщения, не в системных элементах)
    const contentElements = messageElement.querySelectorAll('.markdown, .prose, [class*="content"], p');
    console.log(`TabXport: Found ${contentElements.length} content elements in message ${containerIndex}`);
    
    contentElements.forEach((element, elementIndex) => {
      const htmlElement = element as HTMLElement;
      const text = htmlElement.textContent || '';
      
      // Фильтруем системные элементы
      if (text.includes('window.__oai') || text.includes('requestAnimationFrame') || text.length < 10) {
        console.log(`TabXport: Skipping system element ${elementIndex} in message ${containerIndex}`);
        return;
      }
      
      // Проверяем на таблицу с разделителями |
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const tableLines = lines.filter(line => line.includes('|') && line.split('|').length >= 3);
      
      if (tableLines.length >= 2) {
        console.log(`TabXport: Found potential text table in element ${elementIndex} of message ${containerIndex}`);
        console.log(`TabXport: Table lines:`, tableLines.slice(0, 3)); // Показываем первые 3 строки для отладки
        
        // Проверяем, что это не уже найденная таблица
        const isAlreadyFound = tables.some(existingTable => 
          existingTable.contains(htmlElement) || htmlElement.contains(existingTable)
        );
        
        if (!isAlreadyFound) {
          // Дополнительная проверка - должны быть минимум 2 колонки в каждой строке
          const validLines = tableLines.filter(line => {
            const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
            return cells.length >= 2;
          });
          
          if (validLines.length >= 2) {
            console.log(`TabXport: Adding text table element ${elementIndex} from message ${containerIndex}`);
            tables.push(htmlElement);
          }
        }
      }
    });
  });
  
  console.log(`TabXport: Total ChatGPT tables found: ${tables.length}`);
  return tables;
};

// Специальный детектор для Claude AI
export const findClaudeTables = (): HTMLElement[] => {
  const tables: HTMLElement[] = [];
  const processedElements = new Set<HTMLElement>(); // Для избежания дублирования
  const processedTableContent = new Set<string>(); // Для избежания дублирования по содержимому
  
  console.log('TabXport: Starting Claude table detection');
  
  // Ищем сообщения Claude (могут быть разные селекторы)
  const messageSelectors = [
    '[data-testid="conversation-turn"]',
    '[class*="message"]',
    '[class*="assistant"]',
    '.prose',
    '[class*="content"]'
  ];
  
  let allMessages: HTMLElement[] = [];
  
  messageSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    console.log(`TabXport: Found ${elements.length} elements with selector: ${selector}`);
    elements.forEach(element => {
      allMessages.push(element as HTMLElement);
    });
  });
  
  // Удаляем дубликаты
  allMessages = allMessages.filter((element, index, arr) => 
    arr.findIndex(el => el === element) === index
  );
  
  console.log(`TabXport: Total unique Claude message containers: ${allMessages.length}`);

  allMessages.forEach((message, messageIndex) => {
    console.log(`TabXport: Processing Claude message ${messageIndex}`);
    
    // 1. Ищем HTML таблицы в сообщении
    const htmlTables = message.querySelectorAll('table');
    console.log(`TabXport: Found ${htmlTables.length} HTML tables in Claude message ${messageIndex}`);
    htmlTables.forEach((table, tableIndex) => {
      const htmlTable = table as HTMLElement;
      const tableContent = htmlTable.textContent?.trim() || '';
      const contentHash = tableContent.substring(0, 100); // Первые 100 символов как хеш
      
      if (table.rows.length > 0 && 
          !processedElements.has(htmlTable) && 
          !processedTableContent.has(contentHash)) {
        console.log(`TabXport: Adding HTML table ${tableIndex} from Claude message ${messageIndex}`);
        tables.push(htmlTable);
        processedElements.add(htmlTable);
        processedTableContent.add(contentHash);
      } else {
        console.log(`TabXport: Skipping duplicate HTML table ${tableIndex} in message ${messageIndex}`);
      }
    });
    
    // 2. Ищем pre/code блоки с markdown таблицами
    const codeBlocks = message.querySelectorAll('pre, code');
    console.log(`TabXport: Found ${codeBlocks.length} code blocks in Claude message ${messageIndex}`);
    codeBlocks.forEach((block, blockIndex) => {
      const htmlBlock = block as HTMLElement;
      const blockText = htmlBlock.textContent || '';
      const contentHash = blockText.trim().substring(0, 100);
      
      if (processedElements.has(htmlBlock) || processedTableContent.has(contentHash)) {
        console.log(`TabXport: Skipping already processed code block ${blockIndex}`);
        return;
      }
      
      // Проверяем на markdown таблицу
      if (blockText.includes('|') && blockText.includes('\n')) {
        const markdownTable = findMarkdownTablesInElement(htmlBlock);
        if (markdownTable && markdownTable.headers.length > 0) {
          console.log(`TabXport: Adding markdown table ${blockIndex} from Claude message ${messageIndex}`);
          tables.push(htmlBlock);
          processedElements.add(htmlBlock);
          processedTableContent.add(contentHash);
        }
      }
    });
    
    // 3. Ищем текстовые таблицы в содержимом (но только если не нашли в pre/code)
    const textContent = message.textContent || '';
    console.log(`TabXport: Claude message ${messageIndex} text length: ${textContent.length}`);
    
    if (textContent.includes('|') && textContent.split('\n').length > 2) {
      console.log(`TabXport: Claude message ${messageIndex} contains potential table markers`);
      
      // Ищем конкретные элементы с табличным содержимым
      const textElements = message.querySelectorAll('div, p, span');
      console.log(`TabXport: Checking ${textElements.length} text containers in Claude message ${messageIndex}`);
      
      textElements.forEach((element, elementIndex) => {
        const htmlElement = element as HTMLElement;
        const text = htmlElement.textContent || '';
        const contentHash = text.trim().substring(0, 100);
        
        if (processedElements.has(htmlElement) || processedTableContent.has(contentHash)) {
          return;
        }
        
        // Фильтруем системные элементы и слишком короткий текст
        if (text.length < 20) {
          return;
        }
        
        // Проверяем, не содержится ли этот элемент в уже найденных pre/code блоках
        const isInsideCodeBlock = Array.from(processedElements).some(processed => 
          processed.contains(htmlElement) || htmlElement.contains(processed)
        );
        
        if (isInsideCodeBlock) {
          console.log(`TabXport: Skipping text element ${elementIndex} - inside code block`);
          return;
        }
        
        // Проверяем на таблицу с разделителями |
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const tableLines = lines.filter(line => line.includes('|') && line.split('|').length >= 3);
        
        if (tableLines.length >= 2) {
          console.log(`TabXport: Found potential text table in Claude element ${elementIndex} of message ${messageIndex}`);
          console.log(`TabXport: Table lines:`, tableLines.slice(0, 3)); // Показываем первые 3 строки для отладки
          
          // Проверяем, что это не уже найденная таблица
          const isAlreadyFound = tables.some(existingTable => 
            existingTable.contains(htmlElement) || htmlElement.contains(existingTable)
          );
          
          if (!isAlreadyFound) {
            // Дополнительная проверка - должны быть минимум 2 колонки в каждой строке
            const validLines = tableLines.filter(line => {
              const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
              return cells.length >= 2;
            });
            
            if (validLines.length >= 2) {
              console.log(`TabXport: Adding text table element ${elementIndex} from Claude message ${messageIndex}`);
              tables.push(htmlElement);
              processedElements.add(htmlElement);
              processedTableContent.add(contentHash);
            }
          }
        }
      });
    }
  });
  
  console.log(`TabXport: Total Claude tables found: ${tables.length}`);
  console.log(`TabXport: Processed elements count: ${processedElements.size}`);
  console.log(`TabXport: Unique content hashes: ${processedTableContent.size}`);
  return tables;
}; 