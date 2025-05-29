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
    'https://chat.deepseek.com/*',
    'https://deepseek.com/*',
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
const calculateButtonPosition = (element: HTMLElement): { x: number; y: number; container: HTMLElement } => {
  const rect = element.getBoundingClientRect();
  
  // Определяем платформу для адаптивного позиционирования
  const url = window.location.href;
  const isGemini = url.includes('gemini.google.com') || url.includes('bard.google.com');
  const isChatGPT = url.includes('chat.openai.com') || url.includes('chatgpt.com');
  const isClaude = url.includes('claude.ai');
  const isDeepSeek = url.includes('chat.deepseek.com') || url.includes('deepseek.com');
  
  console.log('TabXport: Element rect:', rect);
  console.log('TabXport: Platform detection - Gemini:', isGemini, 'ChatGPT:', isChatGPT, 'Claude:', isClaude, 'DeepSeek:', isDeepSeek);
  
  // Ищем подходящий контейнер для размещения кнопки
  let container = element.parentElement;
  while (container && container !== document.body) {
    const containerStyle = window.getComputedStyle(container);
    if (containerStyle.position === 'relative' || containerStyle.position === 'absolute') {
      break;
    }
    container = container.parentElement;
  }
  
  // Если не нашли позиционированный контейнер, используем родителя таблицы
  if (!container || container === document.body) {
    container = element.parentElement || document.body;
  }
  
  console.log('TabXport: Using container:', container.tagName, container.className);
  
  // Получаем позицию контейнера
  const containerRect = container.getBoundingClientRect();
  
  // Вычисляем относительную позицию
  const relativeX = rect.right - containerRect.left;
  const relativeY = rect.top - containerRect.top;
  
  // Проверяем, есть ли место справа от таблицы
  const spaceOnRight = window.innerWidth - rect.right;
  const buttonWidth = 75;
  
  let position;
  
  if (isGemini) {
    // Для Gemini используем более близкое позиционирование
    if (spaceOnRight >= buttonWidth + 5) {
      position = {
        x: relativeX - 2, // Практически вплотную к таблице
        y: relativeY - 5, // Немного выше таблицы
        container: container
      };
    } else {
      position = {
        x: relativeX - buttonWidth - 8, // Внутри таблицы
        y: relativeY + 3,
        container: container
      };
    }
  } else if (isChatGPT || isClaude) {
    // Для ChatGPT и Claude используем больший отступ
    if (spaceOnRight >= buttonWidth + 15) {
      position = {
        x: relativeX + 8, // Больший отступ для ChatGPT/Claude
        y: relativeY - 2,
        container: container
      };
    } else {
      position = {
        x: relativeX - buttonWidth - 5,
        y: relativeY + 5,
        container: container
      };
    }
  } else if (isDeepSeek) {
    // Для DeepSeek используем стандартное позиционирование
    if (spaceOnRight >= buttonWidth + 10) {
      position = {
        x: relativeX + 4,
        y: relativeY - 2,
        container: container
      };
    } else {
      position = {
        x: relativeX - buttonWidth - 8,
        y: relativeY + 3,
        container: container
      };
    }
  } else {
    // Для других платформ - стандартное позиционирование
    if (spaceOnRight >= buttonWidth + 10) {
      position = {
        x: relativeX + 4,
        y: relativeY - 2,
        container: container
      };
    } else {
      position = {
        x: relativeX - buttonWidth - 5,
        y: relativeY + 5,
        container: container
      };
    }
  }
  
  console.log('TabXport: Space on right:', spaceOnRight, 'px');
  console.log('TabXport: Relative position within container:', { x: position.x, y: position.y });
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
const createExportButton = (tableData: TableData, position: { x: number; y: number; container: HTMLElement }): HTMLButtonElement => {
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
    border-radius: 4px !important;
    padding: 6px 10px !important;
    font-size: 11px !important;
    font-weight: 500 !important;
    cursor: pointer !important;
    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.06) !important;
    display: flex !important;
    align-items: center !important;
    transition: all 0.2s ease !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    min-width: 70px !important;
    height: 28px !important;
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

        // Кнопка теперь позиционируется относительно контейнера и движется вместе с таблицей автоматически
        console.log('TabXport: Button positioning complete - will move with table container');
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
  if (button) {
    // Удаляем кнопку из DOM
    if (button.parentNode) {
      button.parentNode.removeChild(button);
    }
    
    // Удаляем из Map
    addedButtons.delete(tableElement);
    console.log('TabXport: Button removed');
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
    
    // Проверяем, нужно ли полное пересканирование (только если количество таблиц изменилось значительно)
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
    
    // Ищем кнопки по текстовому содержимому (используем JavaScript фильтрацию вместо :contains)
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(button => {
      const buttonElement = button as HTMLElement;
      if (buttonElement.textContent?.includes('Export') || 
          buttonElement.innerHTML?.includes('Export')) {
        exportButtonsToRemove.push(buttonElement);
      }
    });
    
    // Также ищем кнопки по стилям (наши кнопки имеют специфические стили)
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
    }, 100); // Небольшая задержка для стабилизации DOM
    
  } catch (error) {
    console.error('TabXport: Critical error in scanAndProcessTables:', error);
  }
};

// Настройка MutationObserver для отслеживания динамических изменений
let scanTimeout: NodeJS.Timeout | null = null;
let lastScanTime = 0;

const setupMutationObserver = (): void => {
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    
    // Предотвращаем слишком частое сканирование
    const now = Date.now();
    if (now - lastScanTime < 1000) { // Минимум 1 секунда между сканированиями
      return;
    }
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        // Проверяем, добавились ли новые элементы, которые могут содержать таблицы
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Игнорируем наши собственные кнопки экспорта
            if (element.tagName === 'BUTTON' && 
                (element.textContent?.includes('Export') || 
                 element.getAttribute('title')?.includes('Export'))) {
              return;
            }
            
            // Проверяем на таблицы или контейнеры, которые могут содержать таблицы
            if (element.tagName === 'TABLE' || 
                element.tagName === 'PRE' || 
                element.tagName === 'CODE' ||
                element.querySelector('table, pre, code')) {
              shouldScan = true;
            }
            
            // Для div элементов проверяем более строго
            if (element.tagName === 'DIV') {
              const hasTableLikeContent = element.textContent?.includes('|') || 
                                        element.querySelector('table, pre, code') ||
                                        element.children.length >= 2;
              if (hasTableLikeContent) {
                shouldScan = true;
              }
            }
          }
        });
        
        // Также проверяем удаленные узлы
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'TABLE' || 
                element.tagName === 'PRE' || 
                element.tagName === 'CODE' ||
                element.querySelector('table, pre, code')) {
              shouldScan = true;
            }
          }
        });
      }
    });
    
    if (shouldScan) {
      // Используем debouncing - отменяем предыдущий таймер и устанавливаем новый
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }
      
      scanTimeout = setTimeout(() => {
        console.log('TabXport: MutationObserver triggered table scan');
        scanAndProcessTables();
        lastScanTime = Date.now();
        scanTimeout = null;
      }, 800); // Увеличиваем задержку до 800ms для большей стабильности
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  
  console.log('TabXport: MutationObserver set up with optimized debouncing');
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
  }, 1500); // Увеличиваем задержку для стабилизации страницы
  
  // Только одно дополнительное сканирование через большую задержку
  setTimeout(() => {
    console.log('TabXport: Running delayed scan for dynamic content');
    scanAndProcessTables();
  }, 5000);
  
  // Настройка наблюдателя за изменениями DOM
  setupMutationObserver();
  
  // Менее частое периодическое сканирование только для AI платформ
  const source = window.location.href;
  if (source.includes('chat.openai.com') || 
      source.includes('claude.ai') || 
      source.includes('gemini.google.com') ||
      source.includes('x.com')) {
    
    console.log('TabXport: Setting up periodic scanning for AI platform');
    setInterval(() => {
      console.log('TabXport: Running periodic scan');
      scanAndProcessTables();
    }, 10000); // Увеличиваем интервал до 10 секунд
  }
  
  // Убираем агрессивное сканирование при скролле для стабильности
  console.log('TabXport: Content script initialization complete');
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