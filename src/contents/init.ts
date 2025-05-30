import { addSpinnerCSS } from './components/export-button';
import { scanAndProcessTables, setupMutationObserver } from './components/dom-observer';

// Функция для проверки поддерживаемых платформ
const isSupportedPlatform = (): boolean => {
  const url = window.location.href;
  console.log('TabXport: Checking platform support for URL:', url);
  
  const supportedDomains = [
    'chat.openai.com',
    'chatgpt.com',
    'claude.ai',
    'gemini.google.com',
    'bard.google.com',
    'chat.deepseek.com',
    'deepseek.com'
  ];
  
  const isSupported = supportedDomains.some(domain => {
    const matches = url.includes(domain);
    console.log(`TabXport: Checking domain '${domain}': ${matches}`);
    return matches;
  });
  
  console.log('TabXport: Platform support result:', isSupported);
  return isSupported;
};

// Функция для проверки готовности DOM
const isDOMReady = (): boolean => {
  const url = window.location.href;
  
  console.log('TabXport: Checking DOM readiness for URL:', url);
  
  // Проверяем наличие ключевых элементов интерфейса для каждой платформы
  if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) {
    const elements = document.querySelector('main, [class*="conversation-"]');
    console.log('TabXport: ChatGPT DOM elements found:', !!elements);
    return !!elements;
  }
  if (url.includes('claude.ai')) {
    const elements = document.querySelector('.chat-messages, .message-container, .prose, [class*="message"]');
    console.log('TabXport: Claude DOM elements found:', !!elements);
    return !!elements;
  }
  if (url.includes('gemini.google.com') || url.includes('bard.google.com')) {
    const elements = document.querySelector('mat-card, .message-container, [data-response-id], .conversation-turn');
    console.log('TabXport: Gemini DOM elements found:', !!elements);
    return !!elements;
  }
  if (url.includes('chat.deepseek.com') || url.includes('deepseek.com')) {
    // Проверяем более широкий набор селекторов для DeepSeek
    const selectors = [
      '.chat-container',
      '.message-list', 
      '.chat-content',
      '.conversation',
      '.messages',
      '.chat-main',
      '.chat-area',
      '.message-container',
      '.chat-box',
      '[class*="chat"]',
      '[class*="message"]',
      '[class*="conversation"]',
      'main',
      '.main-content',
      '#app',
      '.app',
      '.content'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`TabXport: DeepSeek DOM ready - found element with selector: ${selector}`);
        return true;
      }
    }
    
    // Если ничего не найдено, проверяем базовую структуру страницы
    const hasBody = document.body && document.body.children.length > 0;
    const hasScripts = document.querySelectorAll('script').length > 0;
    console.log('TabXport: DeepSeek basic page structure - body:', hasBody, 'scripts:', hasScripts);
    
    if (hasBody && hasScripts) {
      console.log('TabXport: DeepSeek DOM considered ready based on basic structure');
      return true;
    }
    
    console.log('TabXport: DeepSeek DOM not ready yet');
    return false;
  }
  
  // Для других платформ проверяем базовые элементы
  const elements = document.querySelector('main, .main-content, .chat-container, body');
  console.log('TabXport: Other platform DOM elements found:', !!elements);
  return !!elements;
};

// Функция для ожидания готовности DOM
const waitForDOM = async (): Promise<void> => {
  const maxAttempts = 10; // Уменьшаем количество попыток
  const interval = 500; // Уменьшаем интервал до 500ms
  let attempts = 0;
  
  console.log('TabXport: Starting DOM readiness check...');
  
  while (!isDOMReady() && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, interval));
    attempts++;
    console.log(`TabXport: Waiting for DOM (attempt ${attempts}/${maxAttempts})`);
  }
  
  if (!isDOMReady()) {
    console.warn('TabXport: DOM readiness timeout, proceeding with initialization anyway');
    console.log('TabXport: Current document state:', document.readyState);
    console.log('TabXport: Body children count:', document.body?.children.length || 0);
    console.log('TabXport: Available elements count:', document.querySelectorAll('*').length);
  } else {
    console.log('TabXport: DOM is ready after', attempts, 'attempts');
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
  
  // Проверяем, что мы на поддерживаемой платформе
  if (!isSupportedPlatform()) {
    console.log('TabXport: Current platform is not supported, skipping initialization');
    return;
  }
  
  console.log('TabXport: Platform is supported, proceeding with initialization');
  
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