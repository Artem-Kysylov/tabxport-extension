import type { PlasmoCSConfig } from 'plasmo';
import { findAllTables, extractTableData, isValidTable } from '../utils/table-detector';
import { getUserSettings } from '../lib/storage';
import type { TableData, ChromeMessage } from '../types';

export const config: PlasmoCSConfig = {
  matches: [
    'https://chat.openai.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
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
  
  return {
    x: rect.right + scrollLeft + 8, // 8px отступ справа от таблицы
    y: rect.top + scrollTop - 4,    // Немного выше верхнего края таблицы
  };
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
    position: absolute;
    top: ${position.y}px;
    left: ${position.x}px;
    z-index: 10000;
    background-color: #10b981;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    display: flex;
    align-items: center;
    transition: all 0.2s ease;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
  
  return button;
};

// Функция для добавления кнопки экспорта к таблице
const addExportButton = (tableElement: HTMLElement): void => {
  // Проверяем, не добавлена ли уже кнопка
  if (addedButtons.has(tableElement)) {
    return;
  }

  const tableData = extractTableData(tableElement);
  if (!tableData) {
    return;
  }

  const position = calculateButtonPosition(tableElement);
  const button = createExportButton(tableData, position);
  
  // Добавляем кнопку в body
  document.body.appendChild(button);
  
  // Сохраняем ссылку на кнопку
  addedButtons.set(tableElement, button);

  // Обновляем позицию кнопки при скролле или изменении размера
  const updatePosition = () => {
    const newPosition = calculateButtonPosition(tableElement);
    button.style.top = `${newPosition.y}px`;
    button.style.left = `${newPosition.x}px`;
  };

  window.addEventListener('scroll', updatePosition);
  window.addEventListener('resize', updatePosition);
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
  const tables = findAllTables();
  
  // Добавляем кнопки к новым валидным таблицам
  tables.forEach(table => {
    if (isValidTable(table) && !addedButtons.has(table)) {
      addExportButton(table);
    }
  });

  // Удаляем кнопки для таблиц, которые больше не существуют или не видны
  addedButtons.forEach((button, tableElement) => {
    if (!document.contains(tableElement) || tableElement.offsetParent === null) {
      removeExportButton(tableElement);
    }
  });
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
  
  // Добавляем CSS для анимации
  addSpinnerCSS();
  
  // Первоначальное сканирование
  scanAndProcessTables();
  
  // Настройка наблюдателя за изменениями DOM
  setupMutationObserver();
  
  // Периодическое сканирование (fallback)
  setInterval(scanAndProcessTables, 5000);
};

// Запуск после загрузки DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
} 