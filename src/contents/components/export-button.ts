import { TableData, ChromeMessage } from '../../types';
import { getUserSettings } from '../../lib/storage';

interface ButtonPosition {
  x: number;
  y: number;
  container: HTMLElement;
}

interface Platform {
  isGemini: boolean;
  isChatGPT: boolean;
  isClaude: boolean;
  isDeepSeek: boolean;
}

// Хранилище для отслеживания добавленных кнопок
export const addedButtons = new Map<HTMLElement, HTMLElement>();

// Функция для поиска позиционированного контейнера
const findPositionedContainer = (element: HTMLElement): HTMLElement => {
  let container = element.parentElement;
  while (container && container !== document.body) {
    const style = window.getComputedStyle(container);
    if (style.position === 'relative' || style.position === 'absolute') {
      return container;
    }
    container = container.parentElement;
  }
  return element.parentElement || document.body;
};

// Функция для вычисления позиции кнопки
export const calculateButtonPosition = (element: HTMLElement): ButtonPosition => {
  const rect = element.getBoundingClientRect();
  
  // Определяем платформу для адаптивного позиционирования
  const url = window.location.href;
  const platform: Platform = {
    isGemini: url.includes('gemini.google.com') || url.includes('bard.google.com'),
    isChatGPT: url.includes('chat.openai.com') || url.includes('chatgpt.com'),
    isClaude: url.includes('claude.ai'),
    isDeepSeek: url.includes('chat.deepseek.com') || url.includes('deepseek.com')
  };
  
  console.log('TabXport: Element rect:', rect);
  console.log('TabXport: Platform detection:', platform);
  
  const container = findPositionedContainer(element);
  console.log('TabXport: Using container:', container.tagName, container.className);
  
  const containerRect = container.getBoundingClientRect();
  const relativeX = rect.right - containerRect.left;
  const relativeY = rect.top - containerRect.top;
  
  const spaceOnRight = window.innerWidth - rect.right;
  const buttonWidth = 75;
  
  // Унифицированная логика позиционирования с платформо-специфичными настройками
  const config = {
    spacing: platform.isGemini ? 2 : platform.isChatGPT || platform.isClaude ? 8 : 4,
    verticalOffset: platform.isGemini ? -5 : platform.isChatGPT || platform.isClaude ? -2 : -2,
    insideSpacing: platform.isGemini ? 8 : 5,
    insideVerticalOffset: platform.isGemini ? 3 : 5
  };

  const position = spaceOnRight >= buttonWidth + 10 
    ? {
        x: relativeX + config.spacing,
        y: relativeY + config.verticalOffset,
        container
      }
    : {
        x: relativeX - buttonWidth - config.insideSpacing,
        y: relativeY + config.insideVerticalOffset,
        container
      };
  
  console.log('TabXport: Space on right:', spaceOnRight, 'px');
  console.log('TabXport: Relative position within container:', position);
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

// Функция для показа уведомлений
export const showNotification = (message: string, type: 'success' | 'error'): void => {
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
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
};

// Обработчик экспорта таблицы
const handleExport = async (tableData: TableData, button: HTMLButtonElement): Promise<void> => {
  try {
    console.log('Starting export with tableData:', tableData);
    
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

// Функция для создания кнопки экспорта
export const createExportButton = (tableData: TableData, position: ButtonPosition): HTMLButtonElement => {
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
  
  button.addEventListener('mouseenter', () => {
    button.style.backgroundColor = '#059669';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.backgroundColor = '#10b981';
  });
  
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleExport(tableData, button);
  });
  
  console.log('TabXport: Button created with styles:', button.style.cssText);
  
  return button;
};

// Добавляем CSS для анимации спиннера
export const addSpinnerCSS = (): void => {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}; 