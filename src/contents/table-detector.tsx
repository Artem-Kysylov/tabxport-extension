import type { PlasmoCSConfig } from 'plasmo';
import { createRoot } from 'react-dom/client';
import ExportButton from '../components/ExportButton';
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
const handleExport = async (tableData: TableData): Promise<void> => {
  try {
    const settings = await getUserSettings();
    
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

    const result = await sendToBackground(message);
    
    if (result?.success) {
      // Показываем уведомление об успехе
      showNotification('Table exported successfully!', 'success');
    } else {
      showNotification(result?.error || 'Export failed', 'error');
    }
  } catch (error) {
    console.error('Export error:', error);
    showNotification('Export failed. Please try again.', 'error');
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
  
  // Создаем контейнер для React компонента
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    position: absolute;
    pointer-events: none;
    z-index: 10000;
  `;
  
  // Добавляем контейнер в body
  document.body.appendChild(buttonContainer);
  
  // Создаем React root и рендерим кнопку
  const root = createRoot(buttonContainer);
  root.render(
    <div style={{ pointerEvents: 'auto' }}>
      <ExportButton
        tableData={tableData}
        onExport={handleExport}
        position={position}
      />
    </div>
  );

  // Сохраняем ссылку на кнопку
  addedButtons.set(tableElement, buttonContainer);

  // Обновляем позицию кнопки при скролле или изменении размера
  const updatePosition = () => {
    const newPosition = calculateButtonPosition(tableElement);
    const button = buttonContainer.querySelector('button');
    if (button) {
      button.style.top = `${newPosition.y}px`;
      button.style.left = `${newPosition.x}px`;
    }
  };

  window.addEventListener('scroll', updatePosition);
  window.addEventListener('resize', updatePosition);
};

// Функция для удаления кнопки экспорта
const removeExportButton = (tableElement: HTMLElement): void => {
  const buttonContainer = addedButtons.get(tableElement);
  if (buttonContainer && buttonContainer.parentNode) {
    buttonContainer.parentNode.removeChild(buttonContainer);
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
  addedButtons.forEach((buttonContainer, tableElement) => {
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