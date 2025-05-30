import { addSpinnerCSS } from './components/export-button';
import { scanAndProcessTables, setupMutationObserver } from './components/dom-observer';

// Функция для проверки готовности DOM
const isDOMReady = (): boolean => {
  const url = window.location.href;
  
  // Проверяем наличие ключевых элементов интерфейса для каждой платформы
  if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) {
    return !!document.querySelector('main, [class*="conversation-"]');
  }
  if (url.includes('claude.ai')) {
    return !!document.querySelector('.chat-messages, .message-container');
  }
  if (url.includes('gemini.google.com') || url.includes('bard.google.com')) {
    return !!document.querySelector('mat-card, .message-container');
  }
  if (url.includes('chat.deepseek.com') || url.includes('deepseek.com')) {
    return !!document.querySelector('.chat-container, .message-list');
  }
  
  // Для других платформ проверяем базовые элементы
  return !!document.querySelector('main, .main-content, .chat-container');
};

// Функция для ожидания готовности DOM
const waitForDOM = async (): Promise<void> => {
  const maxAttempts = 10;
  const interval = 500;
  let attempts = 0;
  
  while (!isDOMReady() && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, interval));
    attempts++;
    console.log(`TabXport: Waiting for DOM (attempt ${attempts}/${maxAttempts})`);
  }
  
  if (!isDOMReady()) {
    console.warn('TabXport: DOM readiness timeout, proceeding with initialization');
  } else {
    console.log('TabXport: DOM is ready');
  }
};

// Обработчик сообщений от popup и background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message.type);
  
  switch (message.type) {
    case 'REFRESH_TABLES':
      scanAndProcessTables();
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

// Инициализация content script
export const init = async (): Promise<void> => {
  console.log('TabXport: Content script loaded');
  
  // Ждем готовности DOM перед инициализацией
  await waitForDOM();
  
  // Добавляем CSS для анимации
  addSpinnerCSS();
  
  // Первоначальное сканирование
  console.log('TabXport: Running initial scan');
  scanAndProcessTables();
  
  // Настройка наблюдателя за изменениями DOM
  setupMutationObserver();
  
  // Настройка периодического сканирования только для AI платформ
  const source = window.location.href;
  if (source.includes('chat.openai.com') || 
      source.includes('claude.ai') || 
      source.includes('gemini.google.com') ||
      source.includes('chat.deepseek.com')) {
    
    console.log('TabXport: Setting up periodic scanning for AI platform');
    
    // Используем адаптивный интервал сканирования
    let scanInterval = 10000; // Начальный интервал: 10 секунд
    let lastTableCount = 0;
    
    setInterval(() => {
      const currentTables = document.querySelectorAll('table, pre, code').length;
      
      // Если количество таблиц изменилось, уменьшаем интервал
      if (currentTables !== lastTableCount) {
        scanInterval = Math.max(5000, scanInterval - 1000);
        lastTableCount = currentTables;
      } else {
        // Если количество таблиц стабильно, увеличиваем интервал
        scanInterval = Math.min(15000, scanInterval + 1000);
      }
      
      console.log(`TabXport: Running periodic scan (interval: ${scanInterval}ms)`);
      scanAndProcessTables();
    }, scanInterval);
  }
  
  console.log('TabXport: Content script initialization complete');
}; 