import { findAllTables, extractTableData, isValidTable } from '../../utils/table-detector';
import { addedButtons, calculateButtonPosition, createExportButton } from './export-button';
import { detectAllTables, getBatchState } from '../../utils/table-detection/batch-detector';
import { updateBatchButton } from './batch-export-button';

// Функция для получения целевых контейнеров для наблюдения
const getTargetContainers = (): HTMLElement[] => {
  const url = window.location.href;
  const containers: HTMLElement[] = [];

  // ChatGPT
  if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) {
    containers.push(
      ...Array.from(document.querySelectorAll('main, [class*="conversation-"], [class*="message-"]'))
        .filter((el): el is HTMLElement => el instanceof HTMLElement)
    );
  }
  // Claude
  else if (url.includes('claude.ai')) {
    containers.push(
      ...Array.from(document.querySelectorAll('.chat-messages, .message-container, [class*="claude-"]'))
        .filter((el): el is HTMLElement => el instanceof HTMLElement)
    );
  }
  // Gemini
  else if (url.includes('gemini.google.com') || url.includes('bard.google.com')) {
    containers.push(
      ...Array.from(document.querySelectorAll('mat-card, .message-container, [class*="gemini-"]'))
        .filter((el): el is HTMLElement => el instanceof HTMLElement)
    );
  }
  // DeepSeek
  else if (url.includes('chat.deepseek.com') || url.includes('deepseek.com')) {
    containers.push(
      ...Array.from(document.querySelectorAll('.chat-container, .message-list, [class*="deepseek-"]'))
        .filter((el): el is HTMLElement => el instanceof HTMLElement)
    );
  }

  // Если не нашли специфичные контейнеры, используем основные
  if (containers.length === 0) {
    containers.push(
      ...Array.from(document.querySelectorAll('main, .main-content, .chat-container'))
        .filter((el): el is HTMLElement => el instanceof HTMLElement)
    );
  }

  // Если все еще нет контейнеров, используем body
  return containers.length > 0 ? containers : [document.body];
};

// Функция для проверки релевантности мутации
const shouldProcessMutation = (mutation: MutationRecord): boolean => {
  // Игнорируем изменения в наших кнопках и UI элементах
  if (mutation.target instanceof HTMLElement) {
    const targetEl = mutation.target;
    
    // ИСПРАВЛЕНО: Игнорируем изменения в наших кнопках экспорта
    if (targetEl.tagName === 'BUTTON' ||
        targetEl.getAttribute('title')?.includes('Export') ||
        targetEl.textContent?.includes('Export') ||
        targetEl.classList.contains('tabxport-export-button') ||
        targetEl.style.backgroundColor?.includes('#10b981') ||
        targetEl.classList.contains('text-input-field') ||
        targetEl.classList.contains('input') ||
        targetEl.classList.contains('toolbar') ||
        targetEl.classList.contains('menu') ||
        targetEl.classList.contains('dropdown') ||
        targetEl.classList.contains('modal') ||
        targetEl.classList.contains('popup') ||
        targetEl.classList.contains('tooltip') ||
        targetEl.id?.includes('input') ||
        targetEl.id?.includes('toolbar') ||
        targetEl.id?.includes('menu') ||
        targetEl.id?.includes('tabxport')) {
      // УБРАНО: избыточное логирование для каждой UI мутации
      return false;
    }
  }

  // Проверяем добавленные узлы
  for (const node of Array.from(mutation.addedNodes)) {
    if (node instanceof HTMLElement) {
      // ИСПРАВЛЕНО: Игнорируем наши кнопки экспорта в добавленных узлах
      if (node.tagName === 'BUTTON' &&
          (node.getAttribute('title')?.includes('Export') ||
           node.textContent?.includes('Export') ||
           node.classList.contains('tabxport-export-button') ||
           node.style.backgroundColor?.includes('#10b981'))) {
        // УБРАНО: логирование игнорирования кнопок
        return false;
      }
      
      // Проверяем на наличие таблиц или потенциальных контейнеров таблиц
      if (node.tagName === 'TABLE' || 
          node.tagName === 'PRE' || 
          node.tagName === 'CODE') {
        console.log('TabXport: 🔍 Detected new table-like element:', node.tagName);
        return true;
      }

      // Для div элементов проверяем более тщательно
      if (node.tagName === 'DIV') {
        // Игнорируем UI элементы и наши элементы
        if (node.classList.contains('text-input-field') ||
            node.classList.contains('input') ||
            node.classList.contains('toolbar') ||
            node.classList.contains('menu') ||
            node.classList.contains('dropdown') ||
            node.classList.contains('modal') ||
            node.classList.contains('popup') ||
            node.classList.contains('tooltip') ||
            node.id?.includes('input') ||
            node.id?.includes('toolbar') ||
            node.id?.includes('menu') ||
            node.id?.includes('tabxport')) {
          return false;
        }

        // Проверяем только если div содержит потенциальные табличные данные
        const hasTableLikeContent = 
          node.querySelector('table, pre, code') ||
          (node.textContent?.includes('|') && 
           node.textContent?.split('\n').length > 2 &&
           node.textContent?.split('|').length >= 3);
        
        if (hasTableLikeContent) {
          console.log('TabXport: 🔍 Detected new div with table content');
          return true;
        }
      }
    }
  }

  return false;
};

// Функция для сканирования и обработки таблиц
export const scanAndProcessTables = async (): Promise<void> => {
  try {
    console.log('*** TabXport NEW VERSION: Scanning for tables with BATCH DETECTION ***');
    console.log('TabXport: Scanning for tables...');
    
    // Запускаем batch detection параллельно с обычным поиском
    const [tables, batchResult] = await Promise.all([
      Promise.resolve(findAllTables()),
      detectAllTables()
    ]);
    
    console.log(`TabXport: Found ${tables.length} potential tables:`, tables);
    console.log(`TabXport: Batch detection found ${batchResult.count} tables`);
    
    // Обновляем batch export кнопку
    updateBatchButton(batchResult);
    
    // Создаем Set для отслеживания уникальных элементов таблиц
    const tableElementsSet = new Set(tables);
    console.log(`TabXport: Unique table elements: ${tableElementsSet.size}`);
    
    // Проверяем, нужно ли полное пересканирование
    const currentButtonCount = addedButtons.size;
    const tableCount = tableElementsSet.size;
    const validBatchTablesCount = batchResult.count;
    
    console.log(`TabXport: Current buttons: ${currentButtonCount}, Found tables: ${tableCount}, Valid batch tables: ${validBatchTablesCount}`);
    
    // ИСПРАВЛЕНО: Добавим флаг для отслеживания первой загрузки
    const isFirstLoad = currentButtonCount === 0;
    const isSignificantChange = Math.abs(currentButtonCount - tableCount) > 2; // ИЗМЕНЕНО: более мягкий порог
    const hasValidationMismatch = Math.abs(currentButtonCount - validBatchTablesCount) > 1; // ИЗМЕНЕНО: более мягкий порог
    
    // ИСПРАВЛЕНО: Более консервативный подход к полной валидации
    if (isFirstLoad) {
      console.log('TabXport: First load - performing full validation');
    } else if (isSignificantChange) {
      console.log('TabXport: Significant change detected - performing full validation');
    } else if (hasValidationMismatch && validBatchTablesCount > currentButtonCount) {
      console.log('TabXport: Missing buttons detected - adding new ones only');
    } else {
      console.log('TabXport: Table count stable, checking for new tables only');
      
      // Только добавляем кнопки к новым таблицам БЕЗ УДАЛЕНИЯ СУЩЕСТВУЮЩИХ
      let newTablesProcessed = 0;
      for (const [index, table] of tables.entries()) {
        if (!addedButtons.has(table)) {
          try {
            console.log(`TabXport: Processing new table ${index + 1}/${tables.length}`);
            const isValid = await isValidTable(table);
            if (isValid) {
              console.log(`TabXport: Adding export button to new table ${index}`);
              await addExportButton(table);
              newTablesProcessed++;
            }
          } catch (error) {
            console.error(`TabXport: Error processing new table ${index}:`, error);
          }
        }
      }
      
      console.log(`TabXport: Processed ${newTablesProcessed} new tables`);
      return;
    }
    
    // ПОЛНАЯ ВАЛИДАЦИЯ - выполняется ТОЛЬКО при первой загрузке или значительных изменениях
    console.log('TabXport: Starting full table validation');
    
    // ИСПРАВЛЕНО: НЕ УДАЛЯЕМ существующие кнопки, только проверяем валидность
    // Очищаем только НЕДЕЙСТВИТЕЛЬНЫЕ кнопки
    const invalidButtons: HTMLElement[] = [];
    for (const [tableElement, button] of addedButtons.entries()) {
      if (!document.contains(button) || !document.contains(tableElement)) {
        invalidButtons.push(button);
        addedButtons.delete(tableElement);
      }
    }
    
    if (invalidButtons.length > 0) {
      console.log(`TabXport: Removing ${invalidButtons.length} invalid buttons`);
      invalidButtons.forEach(button => {
        try {
          if (button.parentNode) {
            button.parentNode.removeChild(button);
          }
        } catch (error) {
          console.error('TabXport: Error removing invalid button:', error);
        }
      });
    }
    
    // Добавляем кнопки ТОЛЬКО к новым валидным таблицам
    console.log(`TabXport: Starting table validation for ${tables.length} tables`);
    
    for (let index = 0; index < tables.length; index++) {
      const table = tables[index];
      
      // ИСПРАВЛЕНО: Пропускаем если кнопка уже есть и валидна
      if (addedButtons.has(table)) {
        const existingButton = addedButtons.get(table);
        if (existingButton && document.contains(existingButton)) {
          console.log(`TabXport: Table ${index} already has valid button, skipping`);
          continue;
        }
      }
      
      try {
        console.log(`TabXport: ===== Checking NEW table ${index + 1}/${tables.length} =====`);
        console.log(`TabXport: Table ${index} element:`, table.tagName, table.className || 'no-class');
        console.log(`TabXport: Table ${index} text preview:`, table.textContent?.substring(0, 150));
        
        const isValid = await isValidTable(table);
        console.log(`TabXport: Table ${index} validation result: ${isValid ? 'VALID' : 'INVALID'}`);
        
        if (isValid) {
          console.log(`TabXport: ✅ Adding export button to table ${index}`);
          await addExportButton(table);
        } else {
          console.log(`TabXport: ❌ Table ${index} is not valid, skipping`);
        }
      } catch (tableError) {
        console.error(`TabXport: Error processing table ${index}:`, tableError);
        // Продолжаем обработку следующих таблиц даже при ошибке
      }
    }
    
    console.log(`TabXport: Validation complete. Active buttons: ${addedButtons.size}`);
    setTimeout(() => {
      console.log(`TabXport: Final scan results - Active buttons: ${addedButtons.size}`);
      console.log(`TabXport: Batch detection state:`, getBatchState());
    }, 1000); // УМЕНЬШЕНО: с 2000 до 1000
    
  } catch (error) {
    console.error('TabXport: Critical error in scanAndProcessTables:', error);
  }
};

// Настройка MutationObserver для отслеживания динамических изменений
let scanTimeout: NodeJS.Timeout | null = null;
let lastScanTime = 0;
let observer: MutationObserver | null = null;

export const setupMutationObserver = (): void => {
  // Если уже есть активный observer, отключаем его
  if (observer) {
    observer.disconnect();
  }

  const targetContainers = getTargetContainers();
  console.log('TabXport: Setting up observers for containers:', targetContainers.length);

  observer = new MutationObserver((mutations) => {
    // Предотвращаем слишком частое сканирование
    const now = Date.now();
    if (now - lastScanTime < 5000) { // УВЕЛИЧЕНО: минимальный интервал до 5 секунд
      // УБРАНО: избыточное логирование throttling
      return;
    }

    // Проверяем, есть ли релевантные изменения
    const relevantMutations = mutations.filter(shouldProcessMutation);
    
    // УПРОЩЕНО: Логируем только если есть релевантные мутации
    if (relevantMutations.length === 0) {
      // УБРАНО: логирование каждого пустого результата
      return;
    }

    console.log(`TabXport: 🔄 Found ${relevantMutations.length} relevant changes (${mutations.length} total mutations)`);

    if (scanTimeout) {
      console.log('TabXport: ⏱️ Resetting scan timer');
      clearTimeout(scanTimeout);
    }

    scanTimeout = setTimeout(() => {
      console.log('TabXport: 🚀 Starting table scan after mutation detection');
      scanAndProcessTables().catch(error => {
        console.error('TabXport: Error in MutationObserver scan:', error);
      });
      lastScanTime = Date.now();
      scanTimeout = null;
    }, 3000); // УВЕЛИЧЕНО: задержка до 3 секунд для стабилизации DOM
  });

  // Наблюдаем только за основными контейнерами
  const mainContainer = targetContainers[0]; // Берем только первый основной контейнер
  if (mainContainer) {
    observer.observe(mainContainer, {
      childList: true,
      subtree: true,
      characterData: false,
      attributes: false
    });
    console.log('TabXport: Observing main container:', mainContainer.tagName, mainContainer.className);
  }

  // Обновляем наблюдение каждые 10 секунд (вместо 5)
  setInterval(() => {
    const newContainers = getTargetContainers();
    const mainContainer = newContainers[0];
    
    if (mainContainer && observer) {
      observer.disconnect();
      observer.observe(mainContainer, {
        childList: true,
        subtree: true,
        characterData: false,
        attributes: false
      });
      console.log('TabXport: Updated observation for main container:', mainContainer.tagName, mainContainer.className);
    }
  }, 10000);
};

// Функция для добавления кнопки экспорта к таблице
const addExportButton = async (tableElement: HTMLElement): Promise<void> => {
  try {
    // Проверяем, не добавлена ли уже кнопка для этой таблицы
    if (addedButtons.has(tableElement)) {
      const existingButton = addedButtons.get(tableElement);
      if (existingButton && document.contains(existingButton)) {
        console.log('TabXport: Button already exists for this table');
        return;
      } else {
        // Если кнопка существует в Map, но не в DOM, удаляем её из Map
        addedButtons.delete(tableElement);
      }
    }

    // Проверяем видимость таблицы
    if (!tableElement.offsetParent) {
      console.log('TabXport: Table is not visible, skipping button addition');
      return;
    }

    // Извлекаем данные таблицы с автоформатированием
    console.log('TabXport: Extracting table data with auto-formatting...');
    const tableData = await extractTableData(tableElement);
    if (!tableData || !tableData.headers.length && !tableData.rows.length) {
      console.log('TabXport: Invalid table data, skipping button addition');
      return;
    }

    // Добавляем кнопку с увеличенной задержкой
    setTimeout(() => {
      try {
        console.log('TabXport: Calculating button position...');
        const position = calculateButtonPosition(tableElement);
        
        if (!position) {
          console.log('TabXport: Could not calculate button position');
          return;
        }
        
        console.log('TabXport: Button position calculated:', position);
        
        const button = createExportButton(tableData, position);
        console.log('TabXport: Export button created');
        
        // Убеждаемся, что контейнер имеет relative позиционирование
        const containerStyle = window.getComputedStyle(position.container);
        if (containerStyle.position === 'static') {
          position.container.style.position = 'relative';
        }
        
        // Добавляем кнопку в контейнер
        position.container.appendChild(button);
        
        // Проверяем видимость кнопки и пытаемся исправить, если она не видна
        setTimeout(() => {
          if (!document.contains(button) || !button.offsetParent) {
            console.log('TabXport: Button is not visible, trying to fix...');
            button.style.display = 'flex';
            button.style.visibility = 'visible';
            button.style.opacity = '1';
            button.style.zIndex = '9999';
            
            // Пересчитываем позицию
            const newPosition = calculateButtonPosition(tableElement);
            if (newPosition) {
              button.style.top = `${newPosition.y}px`;
              button.style.left = `${newPosition.x}px`;
            }
          }
          
          // Сохраняем ссылку на кнопку только если она успешно добавлена
          if (document.contains(button)) {
            addedButtons.set(tableElement, button);
            console.log('TabXport: Button successfully added and saved');
          }
        }, 500);
        
      } catch (creationError) {
        console.error('TabXport: Error during button creation:', creationError);
      }
    }, 1000); // Увеличенная задержка перед добавлением кнопки
    
  } catch (error) {
    console.error('TabXport: Critical error in addExportButton:', error);
  }
}; 