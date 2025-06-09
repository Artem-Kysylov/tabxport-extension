import { TableData, ChromeMessage, ChromeMessageType } from '../../types';
import { getUserSettings } from '../../lib/storage';
import { createTooltip } from './tooltip';

/**
 * Export formats for single export
 */
const SINGLE_EXPORT_FORMATS = {
  xlsx: {
    name: 'Excel',
    icon: '📊',
    description: 'Excel spreadsheet',
    extension: '.xlsx'
  },
  csv: {
    name: 'CSV', 
    icon: '📄',
    description: 'Comma-separated values',
    extension: '.csv'
  },
  docx: {
    name: 'Word',
    icon: '📝', 
    description: 'Word document',
    extension: '.docx'
  },
  pdf: {
    name: 'PDF',
    icon: '📋',
    description: 'PDF document', 
    extension: '.pdf'
  }
} as const;

type SingleExportFormat = keyof typeof SINGLE_EXPORT_FORMATS;

/**
 * LocalStorage key for single export format preference
 */
const STORAGE_KEY_SINGLE_EXPORT_FORMAT = 'tabxport-single-export-format';

/**
 * Single export format preference utilities
 */
const SingleExportPreferences = {
  save: (format: SingleExportFormat): void => {
    try {
      localStorage.setItem(STORAGE_KEY_SINGLE_EXPORT_FORMAT, format);
      console.log(`💾 Saved single export format: ${format}`);
    } catch (error) {
      console.warn('Failed to save single export format preference:', error);
    }
  },
  
  load: (): SingleExportFormat | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SINGLE_EXPORT_FORMAT);
      if (saved && Object.keys(SINGLE_EXPORT_FORMATS).includes(saved)) {
        console.log(`📂 Loaded single export format: ${saved}`);
        return saved as SingleExportFormat;
      }
    } catch (error) {
      console.warn('Failed to load single export format preference:', error);
    }
    return null;
  },
  
  clear: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY_SINGLE_EXPORT_FORMAT);
      console.log('🗑️ Cleared single export format preference');
    } catch (error) {
      console.warn('Failed to clear single export format preference:', error);
    }
  },
  
  exists: (): boolean => {
    return SingleExportPreferences.load() !== null;
  }
};

/**
 * Single export modal state
 */
interface SingleExportModalState {
  isVisible: boolean;
  tableData: TableData | null;
  selectedFormat: SingleExportFormat;
  rememberFormat: boolean;
}

// Global modal state
let singleModalState: SingleExportModalState = {
  isVisible: false,
  tableData: null,
  selectedFormat: 'xlsx',
  rememberFormat: false
};

// Modal constants
const SINGLE_MODAL_ID = 'tabxport-single-export-modal';
const SINGLE_OVERLAY_ID = 'tabxport-single-export-overlay';

/**
 * Creates format selector for single export modal
 */
const createSingleFormatSelector = (): string => {
  const options = Object.entries(SINGLE_EXPORT_FORMATS)
    .map(([key, format]) => `
      <option value="${key}" ${singleModalState.selectedFormat === key ? 'selected' : ''}>
        ${format.icon} ${format.name}
      </option>
    `).join('');
  
  const hasPreference = SingleExportPreferences.exists();
  
  return `
    <div class="single-format-selector">
      <label class="single-format-label">Export Format:</label>
      <div class="single-format-select-container">
        <select id="single-format-select" class="single-format-select" title="Choose export format">
          ${options}
        </select>
        <div class="single-format-preferences">
          <label class="single-remember-format-label">
            <input type="checkbox" id="single-remember-format-checkbox" class="single-remember-format-checkbox" ${singleModalState.rememberFormat ? 'checked' : ''}>
            <span>🧠 Запомнить мой формат</span>
          </label>
          ${hasPreference ? `
            <button type="button" id="single-clear-format-preference" class="single-clear-preference-btn" title="Очистить сохраненный формат">
              🗑️
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
};

/**
 * Creates single export modal content
 */
const createSingleModalContent = (): string => {
  const format = SINGLE_EXPORT_FORMATS[singleModalState.selectedFormat];
  
  return `
    <div class="single-modal-header">
      <h3 class="single-modal-title">📊 Export Table</h3>
      <button class="single-close-button" id="single-close-modal-btn">×</button>
    </div>
    
    <div class="single-modal-body">
      ${createSingleFormatSelector()}
      
      <div class="single-export-info">
        <div class="single-format-description">
          <strong>${format.icon} ${format.name}</strong>
          <p>${format.description}</p>
        </div>
      </div>
    </div>
    
    <div class="single-modal-footer">
      <button class="single-cancel-button" id="single-cancel-btn">Cancel</button>
      <button class="single-export-button" id="single-export-btn">
        Export as ${format.name}
      </button>
    </div>
  `;
};

/**
 * Creates modal overlay for single export
 */
const createSingleModalOverlay = (): HTMLElement => {
  const overlay = document.createElement('div');
  overlay.id = SINGLE_OVERLAY_ID;
  
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(2px)',
    zIndex: '999999',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  });
  
  return overlay;
};

/**
 * Adds CSS styles for single export modal
 */
const addSingleModalStyles = (): void => {
  const styleId = 'tabxport-single-modal-styles';
  
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    #${SINGLE_MODAL_ID} {
      background: white;
      border-radius: 8px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-width: 400px;
      width: 90vw;
      max-height: 70vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .single-modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .single-modal-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
    }
    
    .single-close-button {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #6b7280;
      padding: 4px;
      border-radius: 4px;
    }
    
    .single-close-button:hover {
      background: #f3f4f6;
      color: #374151;
    }
    
    .single-modal-body {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
    }
    
    .single-format-selector {
      margin-bottom: 16px;
    }
    
    .single-format-label {
      display: block;
      font-weight: 500;
      color: #374151;
      margin-bottom: 8px;
    }
    
    .single-format-select-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .single-format-select {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      background: white;
      color: #1f2937;
      cursor: pointer;
    }
    
    .single-format-select:focus {
      outline: none;
      border-color: #1B9358;
      box-shadow: 0 0 0 1px #1B9358;
    }
    
    .single-format-preferences {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-left: 4px;
    }
    
    .single-remember-format-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #6b7280;
      cursor: pointer;
      user-select: none;
    }
    
    .single-remember-format-checkbox {
      cursor: pointer;
    }
    
    .single-clear-preference-btn {
      background: none;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 4px 6px;
      font-size: 12px;
      cursor: pointer;
      color: #6b7280;
      transition: all 0.2s ease;
    }
    
    .single-clear-preference-btn:hover {
      background: #f3f4f6;
      border-color: #9ca3af;
      color: #374151;
    }
    
    .single-export-info {
      background: #f8f9fa;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px;
    }
    
    .single-format-description strong {
      color: #1f2937;
      font-size: 14px;
    }
    
    .single-format-description p {
      margin: 4px 0 0 0;
      color: #6b7280;
      font-size: 12px;
    }
    
    .single-modal-footer {
      padding: 16px 20px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    
    .single-cancel-button, .single-export-button {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .single-cancel-button {
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      color: #374151;
    }
    
    .single-cancel-button:hover {
      background: #e5e7eb;
    }
    
    .single-export-button {
      background: linear-gradient(135deg, #1B9358, #16a085);
      border: 1px solid #1B9358;
      color: white;
    }
    
    .single-export-button:hover {
      background: linear-gradient(135deg, #166d42, #138b74);
    }
  `;
  
  document.head.appendChild(style);
};

/**
 * Updates single modal content
 */
const updateSingleModalContent = (): void => {
  const modal = document.getElementById(SINGLE_MODAL_ID);
  if (!modal) return;
  
  modal.innerHTML = createSingleModalContent();
  attachSingleModalEventListeners();
};

/**
 * Shows single export modal
 */
const showSingleExportModal = (tableData: TableData): void => {
  singleModalState.tableData = tableData;
  singleModalState.isVisible = true;
  
  // Load preferred format if available
  const preferredFormat = SingleExportPreferences.load();
  if (preferredFormat) {
    singleModalState.selectedFormat = preferredFormat;
    console.log(`🧠 Using remembered single export format: ${preferredFormat}`);
  }
  
  addSingleModalStyles();
  
  const overlay = createSingleModalOverlay();
  
  const modal = document.createElement('div');
  modal.id = SINGLE_MODAL_ID;
  modal.innerHTML = createSingleModalContent();
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hideSingleExportModal();
    }
  });
  
  attachSingleModalEventListeners();
};

/**
 * Hides single export modal
 */
const hideSingleExportModal = (): void => {
  const overlay = document.getElementById(SINGLE_OVERLAY_ID);
  if (overlay) {
    overlay.remove();
  }
  
  singleModalState.isVisible = false;
  singleModalState.tableData = null;
  singleModalState.selectedFormat = 'xlsx';
  singleModalState.rememberFormat = false;
};

/**
 * Attaches event listeners to single modal elements
 */
const attachSingleModalEventListeners = (): void => {
  // Close button
  const closeBtn = document.getElementById('single-close-modal-btn');
  closeBtn?.addEventListener('click', hideSingleExportModal);
  
  // Cancel button
  const cancelBtn = document.getElementById('single-cancel-btn');
  cancelBtn?.addEventListener('click', hideSingleExportModal);
  
  // Export button
  const exportBtn = document.getElementById('single-export-btn');
  exportBtn?.addEventListener('click', handleSingleExport);
  
  // Format selector
  const formatSelect = document.getElementById('single-format-select') as HTMLSelectElement;
  formatSelect?.addEventListener('change', (e) => {
    singleModalState.selectedFormat = (e.target as HTMLSelectElement).value as SingleExportFormat;
    updateSingleModalContent();
  });
  
  // Remember format checkbox
  const rememberFormatCheckbox = document.getElementById('single-remember-format-checkbox') as HTMLInputElement;
  rememberFormatCheckbox?.addEventListener('change', (e) => {
    singleModalState.rememberFormat = (e.target as HTMLInputElement).checked;
  });
  
  // Clear format preference button
  const clearPreferenceBtn = document.getElementById('single-clear-format-preference');
  clearPreferenceBtn?.addEventListener('click', () => {
    SingleExportPreferences.clear();
    updateSingleModalContent(); // Refresh to hide clear button
  });
};

/**
 * Handles single export from modal
 */
const handleSingleExport = async (): Promise<void> => {
  if (!singleModalState.tableData) return;
  
  console.log('🚀 Starting single export...');
  console.log(`📄 Format: ${singleModalState.selectedFormat}`);
  
  try {
    const message: ChromeMessage = {
      type: ChromeMessageType.EXPORT_TABLE,
      payload: {
        tableData: singleModalState.tableData,
        options: {
          format: singleModalState.selectedFormat,
          includeHeaders: true,
          destination: 'download', // Always download for single export
        },
      },
    };

    console.log('Sending single export message to background:', message);
    const result = await sendToBackground(message);
    console.log('Single export background response:', result);
    
    if (result?.success) {
      // Save format preference if remember checkbox is checked
      if (singleModalState.rememberFormat) {
        SingleExportPreferences.save(singleModalState.selectedFormat);
        console.log(`🧠 Saved single export format preference: ${singleModalState.selectedFormat}`);
      }
      
      showNotification(`Table exported as ${singleModalState.selectedFormat.toUpperCase()} successfully!`, 'success');
      hideSingleExportModal();
    } else {
      console.error('Single export failed:', result);
      showNotification(result?.error || 'Export failed', 'error');
    }
  } catch (error) {
    console.error('Single export error:', error);
    showNotification('Export failed. Please try again.', 'error');
  }
};

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
  
  // Специальная логика для DeepSeek с большими таблицами
  if (platform.isDeepSeek) {
    return calculateDeepSeekButtonPosition(element, rect);
  }
  
  const container = findPositionedContainer(element);
  console.log('TabXport: Using container:', container.tagName, container.className);
  
  const containerRect = container.getBoundingClientRect();
  const relativeX = rect.left - containerRect.left; // Изменено: теперь используем left вместо right
  const relativeY = rect.top - containerRect.top;
  
  const spaceOnLeft = rect.left; // Новое: пространство слева от таблицы
  const buttonWidth = 45;
  
  // Проверяем тип таблицы для ChatGPT
  const tableType = element.getAttribute('data-tabxport-table-type');
  const isChatGPTMarkdown = false; // Временно отключено из-за конфликтов с React
  
  // Унифицированная логика позиционирования с платформо-специфичными настройками
  const config = {
    spacing: platform.isGemini ? 12 : platform.isChatGPT || platform.isClaude ? 15 : 4, // Вернули обычный отступ
    verticalOffset: platform.isGemini ? -5 : platform.isChatGPT || platform.isClaude ? -2 : -2,
    rightSpacing: platform.isGemini ? 8 : 5, // Переименовано из insideSpacing
    rightVerticalOffset: platform.isGemini ? 3 : 5 // Переименовано из insideVerticalOffset
  };

  // ИЗМЕНЕНО: теперь по умолчанию размещаем кнопку СЛЕВА от таблицы
  const minSpacing = platform.isChatGPT ? 18 : 10;
  const position = spaceOnLeft >= buttonWidth + minSpacing 
    ? {
        // Размещаем слева от таблицы (по умолчанию)
        x: relativeX - buttonWidth - config.spacing,
        y: relativeY + config.verticalOffset,
        container
      }
    : {
        // Размещаем справа от таблицы (только если нет места слева)
        x: (rect.right - containerRect.left) + config.rightSpacing,
        y: relativeY + config.rightVerticalOffset,
        container
      };
  
  return position;
};

// Специальная функция позиционирования для DeepSeek
const calculateDeepSeekButtonPosition = (element: HTMLElement, rect: DOMRect): ButtonPosition => {
  console.log('TabXport: Using DeepSeek-specific positioning for large tables');
  
  // Проверяем размер таблицы и специальные атрибуты
  const isLargeTable = rect.height > 300 || rect.width > 600 || 
                       element.hasAttribute('data-tabxport-large-table');
  const isScrollable = element.hasAttribute('data-tabxport-scrollable');
  const tableType = element.getAttribute('data-tabxport-table-type') || 'unknown';
  
  // Проверяем, слишком ли широкая таблица (вызывает горизонтальный скролл)
  const viewportWidth = window.innerWidth;
  const isVeryWideTable = rect.width > viewportWidth * 0.8 || rect.right > viewportWidth - 60 ||
                         element.hasAttribute('data-tabxport-very-wide');
  
  console.log('TabXport: Large table detected:', isLargeTable);
  console.log('TabXport: Scrollable table:', isScrollable);
  console.log('TabXport: Very wide table:', isVeryWideTable);
  console.log('TabXport: Table type:', tableType);
  console.log('TabXport: Table width:', rect.width, 'Viewport width:', viewportWidth);
  
  // Ищем лучший контейнер для позиционирования
  let container = findPositionedContainer(element);
  
  // Для больших таблиц ищем message container
  if (isLargeTable) {
    const messageContainer = element.closest('.message, .chat-message, .response, .assistant-message, [class*="message"], [class*="response"]');
    if (messageContainer) {
      container = messageContainer as HTMLElement;
      console.log('TabXport: Using message container for large table:', container.className);
    }
  }
  
  // Проверяем видимую область таблицы
  const viewportHeight = window.innerHeight;
  const tableVisibleInViewport = rect.top < viewportHeight && rect.bottom > 0 && 
                                rect.left < viewportWidth && rect.right > 0;
  
  console.log('TabXport: Table visible in viewport:', tableVisibleInViewport);
  
  const containerRect = container.getBoundingClientRect();
  const buttonWidth = 45;
  const viewportMargin = 10; // Отступ от края viewport
  
  // Вычисляем Y позицию относительно таблицы/контейнера
  let relativeY = rect.top - containerRect.top;
  
  // Для прокручиваемых таблиц корректируем позицию
  if (isScrollable && !tableVisibleInViewport) {
    // Размещаем кнопку в видимой части viewport
    const visibleTop = Math.max(rect.top, 0);
    const visibleBottom = Math.min(rect.bottom, viewportHeight);
    const visibleMiddle = (visibleTop + visibleBottom) / 2;
    
    relativeY = visibleMiddle - containerRect.top;
    console.log('TabXport: Adjusted position for scrollable table:', relativeY);
  }
  
  // Специальная конфигурация для DeepSeek
  const config = {
    verticalOffset: isLargeTable ? (isScrollable ? 10 : 5) : 0,
  };
  
  let position: ButtonPosition;
  
  // ИЗМЕНЕНО: Всегда предпочитаем левое позиционирование для DeepSeek
  // независимо от размера таблицы и наличия batch кнопки
  const relativeXLeft = rect.left - containerRect.left;  // Позиция левого края таблицы
  const relativeXRight = rect.right - containerRect.left; // Позиция правого края таблицы
  const spaceOnLeft = rect.left; // Пространство слева от таблицы
  
  const spacing = isLargeTable ? (isScrollable ? 15 : 12) : 6;
  const leftSpacing = isLargeTable ? (isScrollable ? 15 : 10) : 8;
  const leftVerticalOffset = isLargeTable ? (isScrollable ? 12 : 8) : 5;
  
  // Для очень широких таблиц, которые не помещаются в viewport
  if (isVeryWideTable && spaceOnLeft < buttonWidth + 20) {
    // Используем viewport-based позиционирование по X (фиксируем кнопку слева)
    const viewportBasedX = viewportMargin;
    const containerBasedX = viewportBasedX - containerRect.left;
    
    position = {
      x: Math.max(containerBasedX, relativeXLeft - buttonWidth - leftSpacing),
      y: relativeY + config.verticalOffset,
      container
    };
    
    console.log('TabXport: Very wide table - using left viewport positioning');
  } else {
    // ПРИОРИТЕТ ЛЕВОМУ ПОЗИЦИОНИРОВАНИЮ: всегда пытаемся разместить слева
    if (spaceOnLeft >= buttonWidth + 10) { // Уменьшил требования к месту слева
      // Размещаем слева от таблицы (предпочтительно)
      position = {
        x: relativeXLeft - buttonWidth - leftSpacing,
        y: relativeY + leftVerticalOffset,
        container
      };
      console.log('TabXport: DeepSeek table - placing button to the left (preferred)');
    } else {
      // Только если совсем нет места слева - размещаем внутри таблицы слева
      position = {
        x: relativeXLeft + 10, // Небольшой отступ от левого края таблицы
        y: relativeY + leftVerticalOffset,
        container
      };
      console.log('TabXport: DeepSeek table - placing button inside table (left edge)');
    }
  }
  
  // Проверяем, что кнопка не выходит за пределы viewport по Y
  if (position.y + buttonWidth > viewportHeight - 10) {
    position.y = viewportHeight - buttonWidth - 10;
    console.log('TabXport: Adjusted Y position to fit viewport');
  }
  
  // Убеждаемся, что Y не отрицательная
  if (position.y < 0) {
    position.y = 10;
    console.log('TabXport: Adjusted Y position to be positive');
  }
  
  // Дополнительная корректировка для очень больших таблиц
  if (isLargeTable && rect.height > 500) {
    // Размещаем кнопку ближе к верху большой таблицы
    position.y = Math.max(relativeY + 20, position.y);
    console.log('TabXport: Adjusted position for very large table');
  }
  
  console.log('TabXport: DeepSeek final position:', position);
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
    z-index: 999995;
    padding: 12px 16px;
    border-radius: 6px;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    background-color: ${type === 'success' ? '#1B9358' : '#ef4444'};
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

// Функция для создания кнопки экспорта
export const createExportButton = (tableData: TableData, position: ButtonPosition): HTMLElement => {
  const button = document.createElement('button');
  
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7,10 12,15 17,10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  `;
  
  // Определяем, если это ChatGPT или DeepSeek
  const isChatGPT = window.location.href.includes('chat.openai.com');
  const isDeepSeek = window.location.href.includes('chat.deepseek.com') || window.location.href.includes('deepseek.com');
  
  // Создаем тултип
  const tooltip = createTooltip({
    text: 'Export this Table',
    targetElement: button
  });

  // Базовые стили
  let cssText = `
    position: absolute !important;
    top: ${position.y}px !important;
    left: ${position.x}px !important;
    z-index: 999990 !important;
    background-color: #1B9358 !important;
    color: white !important;
    border: none !important;
    border-radius: 100% !important;
    padding: 0 !important;
    font-size: 0 !important;
    cursor: pointer !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: background-color 0.2s ease, border 0.2s ease !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    width: 45px !important;
    height: 45px !important;
    min-width: 45px !important;
    min-height: 45px !important;
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: all !important;
    user-select: none !important;
    -webkit-user-select: none !important;
    touch-action: manipulation !important;
    -webkit-tap-highlight-color: transparent !important;
    -webkit-font-smoothing: antialiased !important;
  `;
  
  // Дополнительные стили для ChatGPT и DeepSeek больших таблиц
  if (isChatGPT || isDeepSeek) {
    cssText += `
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
    `;
  }
  
  button.style.cssText = cssText;
  
  // Добавляем дополнительный контейнер для улучшения обработки событий
  const buttonWrapper = document.createElement('div');
  buttonWrapper.style.cssText = `
    position: absolute !important;
    top: ${position.y}px !important;
    left: ${position.x}px !important;
    width: 45px !important;
    height: 45px !important;
    z-index: 999990 !important;
    pointer-events: all !important;
    touch-action: manipulation !important;
  `;
  
  buttonWrapper.appendChild(button);
  button.style.position = 'relative';
  button.style.top = '0';
  button.style.left = '0';
  
  button.title = `Export ${tableData.source} table - click to choose format`;
  
  // Обработчики событий
  buttonWrapper.addEventListener('mouseenter', () => {
    if (isDeepSeek) {
      button.style.backgroundColor = 'transparent';
      button.style.border = '2px solid #1B9358';
      button.style.transform = 'none';
      const svg = button.querySelector('svg');
      if (svg) {
        svg.style.stroke = '#1B9358';
        svg.style.transform = 'none';
      }
    } else {
      button.style.backgroundColor = 'transparent';
      button.style.border = '1px solid #1B9358';
      const svg = button.querySelector('svg');
      if (svg) {
        svg.style.stroke = '#1B9358';
      }
    }
    tooltip.show();
  });
  
  buttonWrapper.addEventListener('mouseleave', () => {
    if (isDeepSeek) {
      button.style.backgroundColor = '#1B9358';
      button.style.border = 'none';
      button.style.transform = 'none';
      const svg = button.querySelector('svg');
      if (svg) {
        svg.style.stroke = '#FFFFFF';
        svg.style.transform = 'none';
      }
    } else {
      button.style.backgroundColor = '#1B9358';
      button.style.border = 'none';
      const svg = button.querySelector('svg');
      if (svg) {
        svg.style.stroke = 'white';
      }
    }
    tooltip.hide();
  });
  
  // ИЗМЕНЕНО: теперь кнопка открывает модальное окно вместо прямого экспорта
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    showSingleExportModal(tableData);
  });
  
  // Очищаем тултип при удалении кнопки
  const cleanup = () => {
    tooltip.destroy();
  };
  
  buttonWrapper.addEventListener('remove', cleanup);
  
  console.log('TabXport: Button created with modal functionality');
  
  return buttonWrapper;
}; 