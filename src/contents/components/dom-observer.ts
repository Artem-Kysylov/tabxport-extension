import { findAllTables, extractTableData, isValidTable } from '../../utils/table-detector';
import { addedButtons, calculateButtonPosition, createExportButton } from './export-button';

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
    if (targetEl.tagName === 'BUTTON' || 
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
        targetEl.id?.includes('menu')) {
      return false;
    }
  }

  // Проверяем добавленные узлы
  for (const node of Array.from(mutation.addedNodes)) {
    if (node instanceof HTMLElement) {
      // Проверяем на наличие таблиц или потенциальных контейнеров таблиц
      if (node.tagName === 'TABLE' || 
          node.tagName === 'PRE' || 
          node.tagName === 'CODE') {
        return true;
      }

      // Для div элементов проверяем более тщательно
      if (node.tagName === 'DIV') {
        // Игнорируем UI элементы
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
            node.id?.includes('menu')) {
          return false;
        }

        // Проверяем только если div содержит потенциальные табличные данные
        const hasTableLikeContent = 
          node.querySelector('table, pre, code') ||
          (node.textContent?.includes('|') && 
           node.textContent?.split('\n').length > 2 &&
           node.textContent?.split('|').length >= 3);
        
        if (hasTableLikeContent) {
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
    console.log('TabXport: Scanning for tables...');
    const tables = findAllTables();
    console.log(`TabXport: Found ${tables.length} potential tables:`, tables);
    
    // Создаем Set для отслеживания уникальных элементов таблиц
    const tableElementsSet = new Set(tables);
    console.log(`TabXport: Unique table elements: ${tableElementsSet.size}`);
    
    // Проверяем, нужно ли полное пересканирование
    const currentButtonCount = addedButtons.size;
    const tableCount = tableElementsSet.size;
    
    if (Math.abs(currentButtonCount - tableCount) <= 1 && currentButtonCount > 0) {
      console.log('TabXport: Table count stable, skipping aggressive cleanup');
      
      // Только добавляем кнопки к новым таблицам
      for (const [index, table] of tables.entries()) {
        if (!addedButtons.has(table)) {
          try {
            const isValid = await isValidTable(table);
            if (isValid) {
              console.log(`TabXport: Adding export button to new table ${index}`);
              await addExportButton(table);
            }
          } catch (error) {
            console.error(`TabXport: Error processing table ${index}:`, error);
          }
        }
      }
      
      return;
    }
    
    console.log('TabXport: Significant table count change detected, performing full cleanup');
    
    // Только при значительных изменениях делаем полную очистку
    console.log('TabXport: Removing all duplicate export buttons...');
    const exportButtonsToRemove: HTMLElement[] = [];
    
    // Ищем кнопки по title атрибуту
    const buttonsByTitle = document.querySelectorAll('button[title*="Export"]');
    buttonsByTitle.forEach(button => {
      exportButtonsToRemove.push(button as HTMLElement);
    });
    
    // Ищем кнопки по текстовому содержимому
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(button => {
      const buttonElement = button as HTMLElement;
      if (buttonElement.textContent?.includes('Export') || 
          buttonElement.innerHTML?.includes('Export')) {
        exportButtonsToRemove.push(buttonElement);
      }
    });
    
    // Также ищем кнопки по стилям
    const styledButtons = document.querySelectorAll('button[style*="position: absolute"][style*="background-color: #10b981"]');
    styledButtons.forEach(button => {
      exportButtonsToRemove.push(button as HTMLElement);
    });
    
    console.log(`TabXport: Found ${exportButtonsToRemove.length} export buttons to clean up`);
    
    // Удаляем все найденные кнопки экспорта
    exportButtonsToRemove.forEach(button => {
      try {
        if (button.parentNode) {
          button.parentNode.removeChild(button);
        }
      } catch (error) {
        console.error('TabXport: Error removing duplicate button:', error);
      }
    });
    
    // Очищаем Map от всех кнопок
    console.log('TabXport: Clearing buttons map...');
    addedButtons.clear();
    
    console.log('TabXport: All export buttons cleaned up');
    
    // Добавляем кнопки к валидным таблицам с небольшой задержкой для стабилизации
    setTimeout(() => {
      tables.forEach(async (table, index) => {
        try {
          console.log(`TabXport: Checking table ${index}:`, table.tagName, table.className);
          
          const isValid = await isValidTable(table);
          console.log(`TabXport: Table ${index} is valid:`, isValid);
          
          if (isValid) {
            console.log(`TabXport: Adding export button to table ${index}`);
            await addExportButton(table);
          } else {
            console.log(`TabXport: Table ${index} is not valid, skipping`);
          }
        } catch (tableError) {
          console.error(`TabXport: Error processing table ${index}:`, tableError);
        }
      });
      
      console.log(`TabXport: Scan complete, total active buttons: ${addedButtons.size}`);
    }, 100);
    
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
    if (now - lastScanTime < 2000) { // Увеличиваем минимальный интервал до 2 секунд
      return;
    }

    // Проверяем, есть ли релевантные изменения
    const hasRelevantChanges = mutations.some(shouldProcessMutation);

    if (hasRelevantChanges) {
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }

      scanTimeout = setTimeout(() => {
        console.log('TabXport: MutationObserver triggered table scan');
        scanAndProcessTables().catch(error => {
          console.error('TabXport: Error in MutationObserver scan:', error);
        });
        lastScanTime = Date.now();
        scanTimeout = null;
      }, 1500); // Увеличиваем задержку для стабилизации DOM
    }
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