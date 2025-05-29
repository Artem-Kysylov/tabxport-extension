import type { PlasmoCSConfig } from 'plasmo';
import { findAllTables, extractTableData, isValidTable } from '../utils/table-detector';
import { getUserSettings } from '../lib/storage';
import type { TableData, ChromeMessage } from '../types';

export const config: PlasmoCSConfig = {
  matches: [
    'https://chat.openai.com/*',
    'https://chatgpt.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
    'https://bard.google.com/*',
    'https://x.com/*',
    'https://twitter.com/*',
    'file:///*',
    'http://localhost:*/*'
  ],
  all_frames: false,
};

// Хранилище для отслеживания добавленных кнопок
const addedButtons = new Map<HTMLElement, HTMLElement>();

// Функция для вычисления позиции кнопки
const calculateButtonPosition = (element: HTMLElement): { x: number; y: number } => {
  const rect = element.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  
  // Добавляем отладочную информацию
  console.log('TabXport: Element rect:', rect);
  console.log('TabXport: Scroll position:', { scrollTop, scrollLeft });
  
  const position = {
    x: rect.right + scrollLeft + 8, // 8px отступ справа от таблицы
    y: rect.top + scrollTop - 4,    // Немного выше верхнего края таблицы
  };
  
  console.log('TabXport: Calculated button position:', position);
  return position;
};

// Функция для отправки данных в background script
const sendToBackground = async (message: ChromeMessage): Promise<any> => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
};

// Обработчик экспорта таблицы
const handleExport = async (tableData: TableData, button: HTMLButtonElement): Promise<void> => {
  try {
    console.log('Starting export with tableData:', tableData);
    
    // Показываем состояние загрузки
    const originalText = button.innerHTML;
    button.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite; margin-right: 6px;">
        <path d="M21 12a9 9 0 11-6.219-8.56" />
      </svg>
      Exporting...
    `;
    button.disabled = true;
    
    console.log('Getting user settings...');
    const settings = await getUserSettings();
    console.log('User settings:', settings);
    
    const message: ChromeMessage = {
      type: 'EXPORT_TABLE',
      payload: {
        tableData,
        options: {
          format: settings.defaultFormat,
          includeHeaders: true,
          destination: settings.defaultDestination,
        },
      },
    };

    console.log('Sending message to background:', message);
    const result = await sendToBackground(message);
    console.log('Background response:', result);
    
    if (result?.success) {
      showNotification('Table exported successfully!', 'success');
    } else {
      console.error('Export failed:', result);
      showNotification(result?.error || 'Export failed', 'error');
    }
  } catch (error) {
    console.error('Export error:', error);
    showNotification('Export failed. Please try again.', 'error');
  } finally {
    // Восстанавливаем кнопку
    button.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7,10 12,15 17,10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Export
    `;
    button.disabled = false;
  }
};

// Функция для показа уведомлений
const showNotification = (message: string, type: 'success' | 'error'): void => {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10001;
    padding: 12px 16px;
    border-radius: 6px;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    background-color: ${type === 'success' ? '#10b981' : '#ef4444'};
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // Автоматически удаляем уведомление через 3 секунды
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
};

// Функция для создания кнопки экспорта
const createExportButton = (tableData: TableData, position: { x: number; y: number }): HTMLButtonElement => {
  const button = document.createElement('button');
  
  button.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
    Export
  `;
  
  button.style.cssText = `
    position: absolute !important;
    top: ${position.y}px !important;
    left: ${position.x}px !important;
    z-index: 999999 !important;
    background-color: #10b981 !important;
    color: white !important;
    border: none !important;
    border-radius: 6px !important;
    padding: 8px 12px !important;
    font-size: 12px !important;
    font-weight: 500 !important;
    cursor: pointer !important;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
    display: flex !important;
    align-items: center !important;
    transition: all 0.2s ease !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    min-width: 80px !important;
    height: 32px !important;
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
  `;
  
  button.title = `Export ${tableData.source} table to Excel/CSV`;
  
  // Добавляем hover эффекты
  button.addEventListener('mouseenter', () => {
    button.style.backgroundColor = '#059669';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.backgroundColor = '#10b981';
  });
  
  // Добавляем обработчик клика
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleExport(tableData, button);
  });
  
  console.log('TabXport: Button created with styles:', button.style.cssText);
  
  return button;
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
        
        // Проверяем, что нет других кнопок в той же позиции
        const existingButtonsAtPosition = document.querySelectorAll('button').length;
        console.log(`TabXport: Total buttons in document before adding: ${existingButtonsAtPosition}`);
        
        // Добавляем кнопку в body
        document.body.appendChild(button);
        console.log('TabXport: Button added to DOM');
        
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

        // Обновляем позицию кнопки при скролле или изменении размера
        const updatePosition = () => {
          try {
            const newPosition = calculateButtonPosition(tableElement);
            button.style.top = `${newPosition.y}px`;
            button.style.left = `${newPosition.x}px`;
          } catch (updateError) {
            console.error('TabXport: Error updating button position:', updateError);
          }
        };

        window.addEventListener('scroll', updatePosition);
        window.addEventListener('resize', updatePosition);
      } catch (creationError) {
        console.error('TabXport: Error during button creation:', creationError);
      }
    }, 250); // 250ms задержка для стабилизации DOM
  } catch (error) {
    console.error('TabXport: Critical error in addExportButton:', error);
  }
};

// Функция для удаления кнопки экспорта
const removeExportButton = (tableElement: HTMLElement): void => {
  const button = addedButtons.get(tableElement);
  if (button && button.parentNode) {
    button.parentNode.removeChild(button);
    addedButtons.delete(tableElement);
  }
};

// Функция для сканирования и обработки таблиц
const scanAndProcessTables = (): void => {
  try {
    console.log('TabXport: Scanning for tables...');
    const tables = findAllTables();
    console.log(`TabXport: Found ${tables.length} potential tables:`, tables);
    
    // Создаем Set для отслеживания уникальных элементов таблиц
    const tableElementsSet = new Set(tables);
    console.log(`TabXport: Unique table elements: ${tableElementsSet.size}`);
    
    // Сначала очистим Map от удаленных кнопок и дубликатов
    console.log('TabXport: Cleaning up removed buttons...');
    const buttonsToRemove: HTMLElement[] = [];
    
    addedButtons.forEach((button, tableElement) => {
      try {
        // Проверяем, существует ли кнопка в DOM
        if (!document.contains(button)) {
          console.log('TabXport: Removing phantom button from Map (button not in DOM)');
          buttonsToRemove.push(tableElement);
        }
        // Проверяем, существует ли таблица в DOM
        else if (!document.contains(tableElement)) {
          console.log('TabXport: Removing button for deleted table element');
          if (button.parentNode) {
            button.parentNode.removeChild(button);
          }
          buttonsToRemove.push(tableElement);
        }
        // Проверяем видимость таблицы
        else if (tableElement.offsetParent === null) {
          console.log('TabXport: Removing button for hidden table');
          if (button.parentNode) {
            button.parentNode.removeChild(button);
          }
          buttonsToRemove.push(tableElement);
        }
        // Проверяем, что таблица все еще в списке найденных
        else if (!tableElementsSet.has(tableElement)) {
          console.log('TabXport: Removing button for table no longer detected');
          if (button.parentNode) {
            button.parentNode.removeChild(button);
          }
          buttonsToRemove.push(tableElement);
        }
      } catch (error) {
        console.error('TabXport: Error cleaning button:', error);
        buttonsToRemove.push(tableElement);
      }
    });
    
    // Удаляем найденные для удаления кнопки
    buttonsToRemove.forEach(tableElement => {
      addedButtons.delete(tableElement);
    });
    
    console.log(`TabXport: Map cleaned, remaining buttons: ${addedButtons.size}`);
    
    // Добавляем кнопки к новым валидным таблицам
    tables.forEach((table, index) => {
      try {
        console.log(`TabXport: Checking table ${index}:`, table.tagName, table.className);
        
        // Проверяем, есть ли уже кнопка для этого элемента
        const hasButton = addedButtons.has(table);
        console.log(`TabXport: Table ${index} has button in Map:`, hasButton);
        
        if (hasButton) {
          // Дополнительная проверка - существует ли кнопка в DOM
          const button = addedButtons.get(table);
          if (button && document.contains(button)) {
            console.log(`TabXport: Table ${index} already has valid button in DOM`);
            
            // Проверяем, что кнопка видима и не перекрыта другими кнопками
            try {
              const buttonRect = button.getBoundingClientRect();
              const buttonsAtPosition = document.elementsFromPoint(
                buttonRect.left + buttonRect.width / 2,
                buttonRect.top + buttonRect.height / 2
              );
              
              const overlappingButtons = buttonsAtPosition.filter(el => 
                el !== button && 
                el.tagName === 'BUTTON' && 
                el.textContent?.includes('Export')
              );
              
              if (overlappingButtons.length > 0) {
                console.log(`TabXport: Found overlapping export buttons for table ${index}, removing duplicates`);
                overlappingButtons.forEach(overlapping => {
                  try {
                    if (overlapping.parentNode) {
                      overlapping.parentNode.removeChild(overlapping);
                    }
                  } catch (removeError) {
                    console.error('TabXport: Error removing overlapping button:', removeError);
                  }
                });
              }
            } catch (positionError) {
              console.error('TabXport: Error checking button position:', positionError);
            }
          } else {
            console.log(`TabXport: Table ${index} has button in Map but not in DOM, removing from Map`);
            addedButtons.delete(table);
          }
        }
        
        const isValid = isValidTable(table);
        console.log(`TabXport: Table ${index} is valid:`, isValid);
        
        if (isValid && !addedButtons.has(table)) {
          console.log(`TabXport: Adding export button to table ${index}`);
          addExportButton(table);
        } else if (addedButtons.has(table)) {
          console.log(`TabXport: Table ${index} already has button (confirmed)`);
        } else {
          console.log(`TabXport: Table ${index} is not valid, skipping`);
        }
      } catch (tableError) {
        console.error(`TabXport: Error processing table ${index}:`, tableError);
      }
    });
    
    console.log(`TabXport: Scan complete, total active buttons: ${addedButtons.size}`);
  } catch (error) {
    console.error('TabXport: Critical error in scanAndProcessTables:', error);
  }
};

// Настройка MutationObserver для отслеживания динамических изменений
const setupMutationObserver = (): void => {
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        // Проверяем, добавились ли новые элементы
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'TABLE' || element.tagName === 'PRE' || 
                element.querySelector('table, pre')) {
              shouldScan = true;
            }
          }
        });
      }
    });
    
    if (shouldScan) {
      // Добавляем небольшую задержку для завершения рендеринга
      setTimeout(scanAndProcessTables, 100);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
};

// Добавляем CSS для анимации спиннера
const addSpinnerCSS = (): void => {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
};

// Обработчик сообщений от popup и background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message.type);
  
  switch (message.type) {
    case 'REFRESH_TABLES':
      scanAndProcessTables();
      showNotification('Tables refreshed!', 'success');
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

// Инициализация content script
const init = (): void => {
  console.log('TabXport: Content script loaded');
  
  // Очищаем Map от предыдущих кнопок (если content script перезагружался)
  console.log('TabXport: Clearing previous buttons map');
  addedButtons.clear();
  
  // Добавляем CSS для анимации
  addSpinnerCSS();
  
  // Первоначальное сканирование с задержкой
  console.log('TabXport: Scheduling initial scan...');
  setTimeout(() => {
    console.log('TabXport: Running initial scan');
    scanAndProcessTables();
  }, 1000);
  
  // Дополнительные сканирования для обнаружения динамического контента
  setTimeout(() => {
    console.log('TabXport: Running delayed scan #1');
    scanAndProcessTables();
  }, 3000);
  
  setTimeout(() => {
    console.log('TabXport: Running delayed scan #2');
    scanAndProcessTables();
  }, 5000);
  
  // Настройка наблюдателя за изменениями DOM
  setupMutationObserver();
  
  // Более частое сканирование для AI платформ (каждые 2 секунды)
  const source = window.location.href;
  const scanInterval = (source.includes('chat.openai.com') || 
                       source.includes('claude.ai') || 
                       source.includes('gemini.google.com') ||
                       source.includes('x.com')) ? 2000 : 5000;
  
  setInterval(() => {
    console.log('TabXport: Running periodic scan');
    scanAndProcessTables();
  }, scanInterval);
  
  // Дополнительное сканирование при скролле (для динамического контента)
  let scrollTimeout: NodeJS.Timeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      console.log('TabXport: Running scroll-triggered scan');
      scanAndProcessTables();
    }, 500);
  });
};

// Запуск после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('TabXport: DOMContentLoaded event fired');
    setTimeout(init, 500); // Дополнительная задержка после DOMContentLoaded
  });
} else if (document.readyState === 'interactive') {
  console.log('TabXport: Document is interactive');
  setTimeout(init, 500);
} else if (document.readyState === 'complete') {
  console.log('TabXport: Document is complete');
  setTimeout(init, 100);
} else {
  console.log('TabXport: Unknown document state, initializing immediately');
  init();
} 