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
  // Игнорируем изменения в наших кнопках
  if (mutation.target instanceof HTMLElement) {
    const targetEl = mutation.target;
    if (targetEl.tagName === 'BUTTON' && 
        (targetEl.textContent?.includes('Export') || 
         targetEl.getAttribute('title')?.includes('Export'))) {
      return false;
    }
  }

  // Проверяем добавленные узлы
  for (const node of Array.from(mutation.addedNodes)) {
    if (node instanceof HTMLElement) {
      // Проверяем на наличие таблиц или потенциальных контейнеров таблиц
      if (node.tagName === 'TABLE' || 
          node.tagName === 'PRE' || 
          node.tagName === 'CODE' ||
          node.querySelector('table, pre, code')) {
        return true;
      }

      // Для div элементов проверяем более тщательно
      if (node.tagName === 'DIV') {
        const hasTableLikeContent = 
          node.textContent?.includes('|') || 
          node.querySelector('table, pre, code') ||
          (node.children.length >= 2 && Array.from(node.children).some(child => 
            child.textContent?.includes('|') || 
            child.tagName === 'TABLE' ||
            child.tagName === 'PRE' ||
            child.tagName === 'CODE'
          ));
        
        if (hasTableLikeContent) {
          return true;
        }
      }
    }
  }

  // Проверяем удаленные узлы
  for (const node of Array.from(mutation.removedNodes)) {
    if (node instanceof HTMLElement) {
      if (node.tagName === 'TABLE' || 
          node.tagName === 'PRE' || 
          node.tagName === 'CODE' ||
          node.querySelector('table, pre, code')) {
        return true;
      }
    }
  }

  return false;
};

// Функция для сканирования и обработки таблиц
export const scanAndProcessTables = (): void => {
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
      tables.forEach((table, index) => {
        if (!addedButtons.has(table)) {
          const isValid = isValidTable(table);
          if (isValid) {
            console.log(`TabXport: Adding export button to new table ${index}`);
            addExportButton(table);
          }
        }
      });
      
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
      tables.forEach((table, index) => {
        try {
          console.log(`TabXport: Checking table ${index}:`, table.tagName, table.className);
          
          const isValid = isValidTable(table);
          console.log(`TabXport: Table ${index} is valid:`, isValid);
          
          if (isValid) {
            console.log(`TabXport: Adding export button to table ${index}`);
            addExportButton(table);
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

// Функция для добавления кнопки экспорта к таблице
const addExportButton = (tableElement: HTMLElement): void => {
  try {
    // Проверяем, не добавлена ли уже кнопка
    if (addedButtons.has(tableElement)) {
      console.log('TabXport: Button already exists for this table element');
      return;
    }

    // Дополнительная проверка - ищем существующие кнопки для этой таблицы по содержимому
    const tableContent = tableElement.textContent?.trim().substring(0, 100) || '';
    let foundExistingButton = false;
    
    addedButtons.forEach((button, existingTable) => {
      const existingContent = existingTable.textContent?.trim().substring(0, 100) || '';
      if (existingContent === tableContent && existingContent.length > 10) {
        console.log('TabXport: Found existing button for table with same content, skipping');
        foundExistingButton = true;
      }
    });
    
    if (foundExistingButton) {
      return;
    }

    console.log('TabXport: Extracting table data for new button...');
    const tableData = extractTableData(tableElement);
    if (!tableData) {
      console.log('TabXport: Failed to extract table data');
      return;
    }

    console.log('TabXport: Table data extracted successfully:', tableData);
    
    // Добавляем небольшую задержку для стабилизации DOM
    setTimeout(() => {
      try {
        console.log('TabXport: Calculating button position...');
        const position = calculateButtonPosition(tableElement);
        console.log('TabXport: Button position calculated:', position);
        
        const button = createExportButton(tableData, position);
        console.log('TabXport: Export button created');
        
        // Убеждаемся, что контейнер имеет relative позиционирование
        const containerStyle = window.getComputedStyle(position.container);
        if (containerStyle.position === 'static') {
          position.container.style.position = 'relative';
          console.log('TabXport: Set container position to relative');
        }
        
        // Проверяем, что нет других кнопок в той же позиции
        const existingButtonsAtPosition = document.querySelectorAll('button').length;
        console.log(`TabXport: Total buttons in document before adding: ${existingButtonsAtPosition}`);
        
        // Добавляем кнопку в контейнер
        position.container.appendChild(button);
        console.log('TabXport: Button added to container:', position.container.tagName);
        
        // Проверяем, что кнопка действительно в DOM и видна
        setTimeout(() => {
          try {
            const isInDOM = document.contains(button);
            const isVisible = button.offsetParent !== null;
            const computedStyle = window.getComputedStyle(button);
            
            console.log('TabXport: Button verification:');
            console.log('  - In DOM:', isInDOM);
            console.log('  - Visible (offsetParent):', isVisible);
            console.log('  - Display:', computedStyle.display);
            console.log('  - Visibility:', computedStyle.visibility);
            console.log('  - Opacity:', computedStyle.opacity);
            console.log('  - Position:', computedStyle.position);
            console.log('  - Z-index:', computedStyle.zIndex);
            console.log('  - Top:', computedStyle.top);
            console.log('  - Left:', computedStyle.left);
            
            if (!isInDOM || !isVisible) {
              console.log('TabXport: Button is not visible, trying to fix...');
              // Перепозиционируем кнопку
              const newPosition = calculateButtonPosition(tableElement);
              button.style.top = `${newPosition.y}px`;
              button.style.left = `${newPosition.x}px`;
              button.style.display = 'flex';
              button.style.visibility = 'visible';
              button.style.opacity = '1';
            }
          } catch (verificationError) {
            console.error('TabXport: Error during button verification:', verificationError);
          }
        }, 100);
        
        // Сохраняем ссылку на кнопку
        addedButtons.set(tableElement, button);
        console.log('TabXport: Button reference saved in Map, total buttons:', addedButtons.size);

      } catch (creationError) {
        console.error('TabXport: Error during button creation:', creationError);
      }
    }, 250);
  } catch (error) {
    console.error('TabXport: Critical error in addExportButton:', error);
  }
};

// Настройка MutationObserver для отслеживания динамических изменений
let scanTimeout: NodeJS.Timeout | null = null;
let lastScanTime = 0;

export const setupMutationObserver = (): void => {
  const targetContainers = getTargetContainers();
  console.log('TabXport: Setting up observers for containers:', targetContainers.length);

  const observer = new MutationObserver((mutations) => {
    // Предотвращаем слишком частое сканирование
    const now = Date.now();
    if (now - lastScanTime < 1000) {
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
        scanAndProcessTables();
        lastScanTime = Date.now();
        scanTimeout = null;
      }, 800);
    }
  });

  // Наблюдаем за каждым контейнером
  targetContainers.forEach(container => {
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: false,
      attributes: false
    });
    console.log('TabXport: Observing container:', container.tagName, container.className);
  });

  // Периодическое обновление целевых контейнеров
  setInterval(() => {
    const newContainers = getTargetContainers();
    const currentContainers = targetContainers;
    
    // Добавляем наблюдение за новыми контейнерами
    newContainers.forEach(container => {
      if (!currentContainers.includes(container)) {
        observer.observe(container, {
          childList: true,
          subtree: true,
          characterData: false,
          attributes: false
        });
        console.log('TabXport: Added observation for new container:', container.tagName, container.className);
      }
    });
  }, 5000);
}; 