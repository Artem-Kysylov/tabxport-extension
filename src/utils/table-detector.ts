import type { TableData } from '../types';

// Определение источника по URL
export const detectSource = (url: string): 'chatgpt' | 'claude' | 'gemini' | 'deepseek' | 'other' => {
  if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) return 'chatgpt';
  if (url.includes('claude.ai')) return 'claude';
  if (url.includes('gemini.google.com') || url.includes('bard.google.com')) return 'gemini';
  if (url.includes('chat.deepseek.com') || url.includes('deepseek.com')) return 'deepseek';
  if (url.includes('x.com') || url.includes('twitter.com')) return 'other'; // Grok
  return 'other';
};

// Извлечение названия чата для генерации имени файла
export const extractChatTitle = (source: 'chatgpt' | 'claude' | 'gemini' | 'deepseek' | 'other'): string => {
  console.log('TabXport: ===== STARTING CHAT TITLE EXTRACTION =====');
  console.log('TabXport: Extracting chat title for source:', source);
  console.log('TabXport: Current page URL:', window.location.href);
  console.log('TabXport: Current page title:', document.title);
  
  let chatTitle = '';
  
  try {
    console.log('TabXport: Entering switch statement for source:', source);
    switch (source) {
      case 'chatgpt':
        console.log('TabXport: Calling extractChatGPTTitle()');
        // ChatGPT - ищем в заголовке страницы или в навигации
        chatTitle = extractChatGPTTitle();
        break;
        
      case 'claude':
        console.log('TabXport: Calling extractClaudeTitle()');
        // Claude - ищем название чата в интерфейсе
        chatTitle = extractClaudeTitle();
        break;
        
      case 'gemini':
        console.log('TabXport: Calling extractGeminiTitle()');
        // Gemini - ищем в заголовке страницы
        chatTitle = extractGeminiTitle();
        break;
        
      case 'deepseek':
        console.log('TabXport: Calling extractDeepSeekTitle()');
        // DeepSeek - ищем название чата
        chatTitle = extractDeepSeekTitle();
        break;
        
      default:
        console.log('TabXport: Using default title extraction');
        // Для других платформ используем заголовок страницы
        chatTitle = document.title || 'Chat';
        break;
    }
    console.log('TabXport: Raw extracted title:', chatTitle);
  } catch (error) {
    console.error('TabXport: Error extracting chat title:', error);
    chatTitle = 'Chat';
  }
  
  // Очищаем название от недопустимых символов для имени файла
  const cleanTitle = chatTitle
    .replace(/[<>:"/\\|?*]/g, '') // Удаляем недопустимые символы
    .replace(/\s+/g, '_') // Заменяем пробелы на подчеркивания
    .substring(0, 50) // Ограничиваем длину
    .trim();
  
  const finalTitle = cleanTitle || 'Chat';
  console.log('TabXport: Extracted and cleaned chat title:', finalTitle);
  
  // Если получили дефолтное название, попробуем универсальную стратегию
  if (finalTitle === 'Chat' || finalTitle === `${source.charAt(0).toUpperCase() + source.slice(1)}_Chat`) {
    console.log('TabXport: Trying universal fallback strategy');
    const fallbackTitle = extractUniversalChatTitle();
    if (fallbackTitle !== 'Chat') {
      console.log('TabXport: Using fallback title:', fallbackTitle);
      return fallbackTitle;
    }
  }
  
  return finalTitle;
};

// Универсальная стратегия извлечения названия чата
const extractUniversalChatTitle = (): string => {
  console.log('TabXport: Starting universal fallback title extraction');
  
  // Ищем первое сообщение пользователя на странице (расширенный список)
  const universalUserSelectors = [
    '[role="user"]:first-child',
    '.user:first-child',
    '.human:first-child',
    '[class*="user"]:first-child',
    '[class*="human"]:first-child',
    '[data-role="user"]:first-child',
    '[data-author="user"]:first-child',
    '[data-message-author-role="user"]:first-child',
    '.user-message:first-child',
    '.human-message:first-child',
    '.message.user:first-child',
    '.msg-user:first-child'
  ];
  
  console.log('TabXport: Testing universal user message selectors...');
  for (const selector of universalUserSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.textContent?.trim();
      console.log(`TabXport: Universal user selector "${selector}": "${text?.substring(0, 50)}..."`);
      
      if (text && text.length > 10 && text.length < 120) {
        // Берем первые 40 символов как название
        const title = text.substring(0, 40).trim();
        if (title.length > 5) {
          console.log('TabXport: Universal fallback title from first message:', title);
          return title;
        }
      }
    }
  }
  
  // Ищем заголовки на странице (более агрессивный поиск)
  console.log('TabXport: Testing universal heading selectors...');
  const headingSelectors = ['h1', 'h2', 'h3', 'h4', '[role="heading"]'];
  for (const selector of headingSelectors) {
    const headings = document.querySelectorAll(selector);
    console.log(`TabXport: Universal heading selector "${selector}" found ${headings.length} elements`);
    
    for (const heading of headings) {
      const text = heading.textContent?.trim();
      console.log(`TabXport: Universal heading text: "${text}"`);
      
      if (text && text.length > 3 && text.length < 100) {
        const lowerText = text.toLowerCase();
        const isValidTitle = !lowerText.includes('chat') &&
                           !lowerText.includes('conversation') &&
                           !lowerText.includes('assistant') &&
                           !lowerText.includes('ai') &&
                           !lowerText.includes('对话') &&
                           !lowerText.includes('新建') &&
                           !lowerText.includes('chatgpt') &&
                           !lowerText.includes('claude') &&
                           !lowerText.includes('gemini') &&
                           !lowerText.includes('deepseek') &&
                           !lowerText.includes('menu') &&
                           !lowerText.includes('settings') &&
                           !lowerText.includes('welcome') &&
                           !lowerText.includes('hello') &&
                           !lowerText.includes('untitled') &&
                           !lowerText.includes('new conversation');
        
        if (isValidTitle) {
          console.log('TabXport: Universal fallback title from heading:', text);
          return text;
        }
      }
    }
  }
  
  // Ищем в активных элементах навигации
  console.log('TabXport: Testing universal active navigation elements...');
  const activeElements = document.querySelectorAll([
    '.active',
    '.selected', 
    '.current',
    '[aria-current="page"]',
    '[data-active="true"]'
  ].join(', '));
  
  for (const element of activeElements) {
    const text = element.textContent?.trim();
    console.log(`TabXport: Universal active element: "${text}"`);
    
    if (text && text.length > 5 && text.length < 80) {
      const lowerText = text.toLowerCase();
      const isValidTitle = !lowerText.includes('chat') &&
                         !lowerText.includes('conversation') &&
                         !lowerText.includes('assistant') &&
                         !lowerText.includes('menu') &&
                         !lowerText.includes('button') &&
                         !lowerText.includes('settings') &&
                         !lowerText.includes('new') &&
                         !lowerText.includes('untitled');
      
      if (isValidTitle) {
        console.log('TabXport: Universal fallback title from active element:', text);
        return text;
      }
    }
  }
  
  // Ищем в title атрибутах элементов
  console.log('TabXport: Testing universal title attributes...');
  const elementsWithTitle = document.querySelectorAll('[title]');
  for (const element of elementsWithTitle) {
    const titleAttr = element.getAttribute('title');
    console.log(`TabXport: Universal title attribute: "${titleAttr}"`);
    
    if (titleAttr && titleAttr.length > 5 && titleAttr.length < 80) {
      const lowerTitle = titleAttr.toLowerCase();
      const isValidTitle = !lowerTitle.includes('chat') &&
                         !lowerTitle.includes('conversation') &&
                         !lowerTitle.includes('tooltip') &&
                         !lowerTitle.includes('button') &&
                         !lowerTitle.includes('menu');
      
      if (isValidTitle) {
        console.log('TabXport: Universal fallback title from title attribute:', titleAttr);
        return titleAttr;
      }
    }
  }
  
  console.log('TabXport: Universal fallback could not find any suitable title');
  return 'Chat';
};

// Извлечение названия чата ChatGPT
const extractChatGPTTitle = (): string => {
  // Вариант 1: Ищем активный элемент в боковой панели
  const activeChat = document.querySelector('nav [class*="bg-gray-800"], nav [class*="bg-token"], nav [aria-current="page"]');
  if (activeChat) {
    const titleText = activeChat.textContent?.trim();
    if (titleText && titleText.length > 0 && !titleText.toLowerCase().includes('new chat')) {
      console.log('TabXport: ChatGPT title from active chat:', titleText);
      return titleText;
    }
  }
  
  // Вариант 2: Ищем в заголовке страницы
  const pageTitle = document.title;
  if (pageTitle && !pageTitle.toLowerCase().includes('chatgpt') && pageTitle !== 'ChatGPT') {
    console.log('TabXport: ChatGPT title from page title:', pageTitle);
    return pageTitle;
  }
  
  // Вариант 3: Ищем в элементах навигации
  const navElements = document.querySelectorAll('nav a, nav button, [class*="conversation"], [class*="chat"]');
  for (const element of navElements) {
    const text = element.textContent?.trim();
    if (text && text.length > 3 && text.length < 100 && 
        !text.toLowerCase().includes('new chat') &&
        !text.toLowerCase().includes('chatgpt') &&
        !text.toLowerCase().includes('menu')) {
      console.log('TabXport: ChatGPT title from navigation:', text);
      return text;
    }
  }
  
  console.log('TabXport: No specific ChatGPT title found, using default');
  return 'ChatGPT_Chat';
};

// Извлечение названия чата Claude
const extractClaudeTitle = (): string => {
  console.log('TabXport: Starting Claude title extraction');
  
  // Вариант 1: Ищем в заголовке страницы
  const pageTitle = document.title;
  if (pageTitle && 
      !pageTitle.toLowerCase().includes('claude') && 
      pageTitle !== 'Claude' &&
      !pageTitle.toLowerCase().includes('anthropic') &&
      pageTitle.length > 3) {
    console.log('TabXport: Claude title from page title:', pageTitle);
    return pageTitle;
  }
  
  // Вариант 2: Ищем в боковой панели Claude
  const sidebarSelectors = [
    '[data-testid="chat-list"] [data-testid="chat-item"]:first-child',
    '[data-testid="conversation-list"] button[aria-current="page"]',
    '.sidebar [class*="active"]',
    '.conversation-list .active',
    'nav [class*="selected"]',
    'aside [class*="current"]'
  ];
  
  for (const selector of sidebarSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.textContent?.trim();
      if (text && text.length > 3 && text.length < 100 &&
          !text.toLowerCase().includes('claude') &&
          !text.toLowerCase().includes('new conversation') &&
          !text.toLowerCase().includes('untitled')) {
        console.log('TabXport: Claude title from sidebar:', text);
        return text;
      }
    }
  }
  
  // Вариант 3: Ищем название чата в интерфейсе Claude
  const chatSelectors = [
    '[data-testid="chat-title"]',
    '[data-testid="conversation-title"]',
    '[class*="conversation-title"]',
    '[class*="chat-title"]',
    'header h1',
    'header h2',
    '.chat-header h1',
    '.conversation-header h1',
    '[role="heading"][aria-level="1"]'
  ];
  
  for (const selector of chatSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.textContent?.trim();
      if (text && text.length > 3 && text.length < 100 &&
          !text.toLowerCase().includes('claude') &&
          !text.toLowerCase().includes('assistant') &&
          !text.toLowerCase().includes('anthropic')) {
        console.log('TabXport: Claude title from selector:', selector, text);
        return text;
      }
    }
  }
  
  // Вариант 4: Ищем в URL
  const urlPath = window.location.pathname;
  console.log('TabXport: Claude URL path:', urlPath);
  
  // Пытаемся извлечь ID чата из URL и найти соответствующий элемент
  const pathParts = urlPath.split('/');
  if (pathParts.length >= 3 && pathParts[1] === 'chat') {
    const chatId = pathParts[2];
    if (chatId && chatId.length > 10) { // Проверяем, что это похоже на ID
      // Ищем элемент с этим ID в боковой панели
      const chatElementSelectors = [
        `[href*="${chatId}"]`,
        `[data-id="${chatId}"]`,
        `[data-chat-id="${chatId}"]`
      ];
      
      for (const selector of chatElementSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim();
          if (text && text.length > 3 && text.length < 100) {
            console.log('TabXport: Claude title from chat ID element:', text);
            return text;
          }
        }
      }
    }
    
    // Пробуем декодировать путь как название
    const pathMatch = urlPath.match(/\/chat\/([^\/]+)/);
    if (pathMatch && pathMatch[1]) {
      const urlTitle = decodeURIComponent(pathMatch[1])
        .replace(/-/g, ' ')
        .replace(/_/g, ' ');
      if (urlTitle.length > 3 && !urlTitle.includes('undefined')) {
        console.log('TabXport: Claude title from URL path:', urlTitle);
        return urlTitle;
      }
    }
  }
  
  // Вариант 5: Ищем первое сообщение пользователя в чате
  const userMessageSelectors = [
    '[data-testid="user-message"]:first-child',
    '[class*="user-message"]:first-child',
    '[class*="human"]:first-child',
    '.message.user:first-child',
    '[role="user"]:first-child'
  ];
  
  for (const selector of userMessageSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.textContent?.trim();
      if (text && text.length > 10 && text.length < 100) {
        const shortTitle = text.substring(0, 50) + (text.length > 50 ? '...' : '');
        console.log('TabXport: Claude title from first user message:', shortTitle);
        return shortTitle;
      }
    }
  }
  
  console.log('TabXport: No specific Claude title found, using default');
  return 'Claude_Chat';
};

// Извлечение названия чата Gemini
const extractGeminiTitle = (): string => {
  // Вариант 1: Ищем в заголовке страницы
  const pageTitle = document.title;
  if (pageTitle && !pageTitle.toLowerCase().includes('gemini') && pageTitle !== 'Gemini') {
    console.log('TabXport: Gemini title from page title:', pageTitle);
    return pageTitle;
  }
  
  // Вариант 2: Ищем в интерфейсе Gemini
  const geminiSelectors = [
    '[data-testid="conversation-title"]',
    '[class*="conversation-title"]',
    '[class*="chat-title"]',
    'h1[class*="title"]',
    'h2[class*="title"]'
  ];
  
  for (const selector of geminiSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.textContent?.trim();
      if (text && text.length > 3 && text.length < 100 &&
          !text.toLowerCase().includes('gemini') &&
          !text.toLowerCase().includes('bard')) {
        console.log('TabXport: Gemini title from selector:', selector, text);
        return text;
      }
    }
  }
  
  // Вариант 3: Ищем первое сообщение пользователя
  const userMessages = document.querySelectorAll('[class*="user"], [class*="human"]');
  if (userMessages.length > 0) {
    const firstMessage = userMessages[0].textContent?.trim();
    if (firstMessage && firstMessage.length > 10 && firstMessage.length < 80) {
      const shortTitle = firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '');
      console.log('TabXport: Gemini title from first message:', shortTitle);
      return shortTitle;
    }
  }
  
  console.log('TabXport: No specific Gemini title found, using default');
  return 'Gemini_Chat';
};

// Извлечение названия чата DeepSeek
const extractDeepSeekTitle = (): string => {
  console.log('TabXport: Starting DeepSeek title extraction');
  console.log('TabXport: Current URL:', window.location.href);
  console.log('TabXport: Page title:', document.title);
  
  // ВАЖНО: НЕ используем заголовок страницы как первый вариант для DeepSeek,
  // так как он может быть одинаковым для всех чатов
  
  // Вариант 1: Ищем в боковой панели (активный чат)
  const sidebarSelectors = [
    '.sidebar-chat-item.active',
    '.chat-list .selected',
    '.chat-sidebar .current',
    '[class*="sidebar"] [class*="active"]',
    '[class*="chat-list"] [class*="selected"]',
    'aside [aria-current="page"]',
    '.conversation-item.active',
    '[data-active="true"]',
    '.active.chat-title',
    '.selected.chat-title',
    '.current.chat-title',
    '.chat-item.active',
    '.conversation.active',
    '[class*="conversation"][class*="active"]',
    '[class*="chat"][class*="active"]'
  ];
  
  console.log('TabXport: Testing sidebar selectors first...');
  for (const selector of sidebarSelectors) {
    const elements = document.querySelectorAll(selector);
    console.log(`TabXport: Sidebar selector "${selector}" found ${elements.length} elements`);
    
    for (const element of elements) {
      const text = element.textContent?.trim();
      console.log(`TabXport: Sidebar element text: "${text}"`);
      
      if (text && text.length > 3 && text.length < 100) {
        const lowerText = text.toLowerCase();
        const isValidTitle = !lowerText.includes('deepseek') &&
                           !lowerText.includes('new chat') &&
                           !lowerText.includes('untitled') &&
                           !lowerText.includes('新对话') &&
                           !lowerText.includes('新建') &&
                           !lowerText.includes('menu') &&
                           !lowerText.includes('settings') &&
                           !lowerText.includes('logout');
        
        if (isValidTitle) {
          console.log('TabXport: DeepSeek title from sidebar:', text);
          return text;
        }
      }
    }
  }
  
  // Вариант 2: Ищем в заголовке чата в основном интерфейсе
  const chatHeaderSelectors = [
    '.chat-header h1',
    '.chat-header h2',
    '.conversation-header h1',
    '.conversation-header h2',
    '.chat-title',
    '.conversation-title',
    '.session-title',
    '[class*="conversation-title"]',
    '[class*="chat-title"]',
    '[class*="session-title"]',
    'header .title',
    'header h1',
    'header h2',
    '[role="heading"][aria-level="1"]',
    '[role="heading"][aria-level="2"]',
    '.title',
    '[class*="title"]'
  ];
  
  console.log('TabXport: Testing chat header selectors...');
  for (const selector of chatHeaderSelectors) {
    const elements = document.querySelectorAll(selector);
    console.log(`TabXport: Header selector "${selector}" found ${elements.length} elements`);
    
    for (const element of elements) {
      const text = element.textContent?.trim();
      console.log(`TabXport: Header element text: "${text}"`);
      
      if (text && text.length > 3 && text.length < 100) {
        const lowerText = text.toLowerCase();
        const isValidTitle = !lowerText.includes('deepseek') &&
                           !lowerText.includes('assistant') &&
                           !lowerText.includes('chat') &&
                           !lowerText.includes('对话') &&
                           !lowerText.includes('新建') &&
                           !lowerText.includes('untitled') &&
                           !lowerText.includes('new conversation') &&
                           !lowerText.includes('menu') &&
                           !lowerText.includes('button') &&
                           !lowerText.includes('settings');
        
        if (isValidTitle) {
          console.log('TabXport: DeepSeek title from header:', text);
          return text;
        }
      }
    }
  }
  
  // Вариант 3: Ищем первое сообщение пользователя
  const userMessageSelectors = [
    '.user-message:first-child',
    '.human-message:first-child',
    '[class*="user-message"]:first-child',
    '[class*="human-message"]:first-child',
    '[role="user"]:first-child',
    '.message.user:first-child',
    '.msg-user:first-child',
    '.user:first-child',
    '.human:first-child',
    '[data-role="user"]:first-child',
    '[data-author="user"]:first-child'
  ];
  
  console.log('TabXport: Testing user message selectors...');
  for (const selector of userMessageSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.textContent?.trim();
      console.log(`TabXport: User message "${selector}": "${text?.substring(0, 50)}..."`);
      
      if (text && text.length > 10 && text.length < 120) {
        const shortTitle = text.substring(0, 50).trim();
        if (shortTitle.length > 5) {
          console.log('TabXport: DeepSeek title from first user message:', shortTitle);
          return shortTitle;
        }
      }
    }
  }
  
  // Вариант 4: Ищем в навигационных элементах (более агрессивный поиск)
  const navElements = document.querySelectorAll([
    'a', 'button', 'div', 'span'
  ].join(', '));
  
  console.log(`TabXport: Testing ${navElements.length} navigation elements...`);
  let foundNavTitles = 0;
  
  for (const element of navElements) {
    const text = element.textContent?.trim();
    if (!text || text.length < 5 || text.length > 80) continue;
    
    // Проверяем, является ли это активным элементом
    const isActive = element.classList.contains('active') ||
                    element.classList.contains('selected') ||
                    element.classList.contains('current') ||
                    element.getAttribute('aria-current') === 'page' ||
                    element.getAttribute('data-active') === 'true' ||
                    element.classList.contains('chat-title') ||
                    element.classList.contains('conversation-title');
    
    if (isActive) {
      foundNavTitles++;
      console.log(`TabXport: Active nav element [${foundNavTitles}]: "${text}"`);
      
      const lowerText = text.toLowerCase();
      const isValidTitle = !lowerText.includes('deepseek') &&
                         !lowerText.includes('new') &&
                         !lowerText.includes('chat') &&
                         !lowerText.includes('新') &&
                         !lowerText.includes('对话') &&
                         !lowerText.includes('menu') &&
                         !lowerText.includes('button') &&
                         !lowerText.includes('settings') &&
                         !lowerText.includes('logout') &&
                         !lowerText.includes('profile');
      
      if (isValidTitle) {
        console.log('TabXport: DeepSeek title from active navigation:', text);
        return text;
      }
    }
  }
  
  // Вариант 5: Ищем в localStorage или sessionStorage
  console.log('TabXport: Testing storage...');
  try {
    const storageKeys = ['currentChatTitle', 'chatTitle', 'conversationTitle', 'sessionTitle', 'title'];
    for (const key of storageKeys) {
      const stored = localStorage.getItem(key) || sessionStorage.getItem(key);
      console.log(`TabXport: Storage ${key}: "${stored}"`);
      
      if (stored && stored.length > 3 && stored.length < 100) {
        const lowerStored = stored.toLowerCase();
        const isValidTitle = !lowerStored.includes('deepseek') &&
                           !lowerStored.includes('untitled') &&
                           !lowerStored.includes('new chat');
        
        if (isValidTitle) {
          console.log('TabXport: DeepSeek title from storage:', stored);
          return stored;
        }
      }
    }
  } catch (error) {
    console.log('TabXport: Could not access storage for title extraction:', error);
  }
  
  // Вариант 6: Ищем в URL (если есть читаемый путь)
  console.log('TabXport: Testing URL extraction...');
  const urlPath = window.location.pathname;
  console.log('TabXport: URL path:', urlPath);
  
  // Пытаемся извлечь название из пути URL
  const pathMatch = urlPath.match(/\/chat\/([^\/]+)/);
  if (pathMatch && pathMatch[1]) {
    const urlTitle = decodeURIComponent(pathMatch[1])
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\+/g, ' ');
    
    console.log('TabXport: URL title candidate:', urlTitle);
    
    if (urlTitle.length > 3 && urlTitle.length < 80 && 
        !urlTitle.includes('undefined') && 
        !urlTitle.includes('null') &&
        !/^[a-f0-9-]{20,}$/i.test(urlTitle)) { // Не UUID/ID
      console.log('TabXport: DeepSeek title from URL path:', urlTitle);
      return urlTitle;
    }
  }
  
  // Вариант 7: Ищем в метаданных страницы
  const metaSelectors = [
    'meta[name="title"]',
    'meta[property="og:title"]',
    'meta[name="twitter:title"]',
    'meta[property="twitter:title"]'
  ];
  
  console.log('TabXport: Testing meta tags...');
  for (const selector of metaSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const content = element.getAttribute('content');
      console.log(`TabXport: Meta ${selector}: "${content}"`);
      
      if (content && content.length > 3 && content.length < 100) {
        const lowerContent = content.toLowerCase();
        const isValidTitle = !lowerContent.includes('deepseek') &&
                           !lowerContent.includes('chat') &&
                           !lowerContent.includes('assistant');
        
        if (isValidTitle) {
          // Очищаем от суффиксов
          let cleanContent = content;
          if (cleanContent.includes(' - DeepSeek')) {
            cleanContent = cleanContent.replace(' - DeepSeek', '');
          }
          if (cleanContent.includes(' - Chat')) {
            cleanContent = cleanContent.replace(' - Chat', '');
          }
          
          cleanContent = cleanContent.trim();
          if (cleanContent.length > 3) {
            console.log('TabXport: DeepSeek title from meta:', cleanContent);
            return cleanContent;
          }
        }
      }
    }
  }
  
  // Вариант 8: Последняя попытка - ищем любой осмысленный текст в заголовках
  console.log('TabXport: Final fallback - searching all headings...');
  const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
  
  for (const heading of allHeadings) {
    const text = heading.textContent?.trim();
    console.log(`TabXport: Heading candidate: "${text}"`);
    
    if (text && text.length > 5 && text.length < 100) {
      const lowerText = text.toLowerCase();
      const isValidTitle = !lowerText.includes('deepseek') &&
                         !lowerText.includes('chat') &&
                         !lowerText.includes('conversation') &&
                         !lowerText.includes('assistant') &&
                         !lowerText.includes('ai') &&
                         !lowerText.includes('对话') &&
                         !lowerText.includes('新建') &&
                         !lowerText.includes('menu') &&
                         !lowerText.includes('settings') &&
                         !lowerText.includes('welcome') &&
                         !lowerText.includes('hello');
      
      if (isValidTitle) {
        console.log('TabXport: DeepSeek title from heading fallback:', text);
        return text;
      }
    }
  }
  
  // Вариант 9: ТОЛЬКО СЕЙЧАС пробуем заголовок страницы (как последний вариант)
  console.log('TabXport: Final attempt - checking page title as last resort...');
  const pageTitle = document.title;
  if (pageTitle && pageTitle.length > 3) {
    // Проверяем, не содержит ли заголовок только название платформы
    const cleanPageTitle = pageTitle.toLowerCase();
    const isGenericTitle = cleanPageTitle === 'deepseek' || 
                          cleanPageTitle === 'deepseek chat' ||
                          cleanPageTitle === 'chat' ||
                          cleanPageTitle.includes('deepseek - ') && cleanPageTitle.replace('deepseek - ', '').trim().length < 3;
    
    if (!isGenericTitle) {
      // Очищаем заголовок от префиксов платформы
      let cleanTitle = pageTitle;
      if (cleanTitle.toLowerCase().startsWith('deepseek - ')) {
        cleanTitle = cleanTitle.substring(11);
      }
      if (cleanTitle.toLowerCase().endsWith(' - deepseek')) {
        cleanTitle = cleanTitle.substring(0, cleanTitle.length - 11);
      }
      
      cleanTitle = cleanTitle.trim();
      if (cleanTitle.length > 3) {
        console.log('TabXport: DeepSeek title from page title (last resort):', cleanTitle);
        return cleanTitle;
      }
    }
  }
  
  console.log('TabXport: No specific DeepSeek title found, using default');
  return 'DeepSeek_Chat';
};

// Генерация уникального ID для таблицы
export const generateTableId = (element: HTMLElement): string => {
  const timestamp = Date.now();
  const elementIndex = Array.from(document.querySelectorAll('table, pre, div')).indexOf(element);
  return `table_${timestamp}_${elementIndex}`;
};

// Парсинг HTML таблицы
export const parseHTMLTable = (table: HTMLTableElement): { headers: string[]; rows: string[][] } => {
  if (!table || !table.rows) {
    console.error('TabXport: Invalid table element provided to parseHTMLTable');
    return { headers: [], rows: [] };
  }

  const headers: string[] = [];
  const rows: string[][] = [];

  try {
    console.log('TabXport: Parsing HTML table with', table.rows.length, 'rows');

    // Ищем заголовки в thead или первой строке tbody
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody') || table;

    if (thead) {
      console.log('TabXport: Found thead element');
      const headerRow = thead.querySelector('tr');
      if (headerRow) {
        const headerCells = headerRow.querySelectorAll('th, td');
        console.log('TabXport: Found', headerCells.length, 'header cells');
        headerCells.forEach((cell, index) => {
          const cellText = cell.textContent?.trim() || '';
          console.log(`TabXport: Header cell ${index}:`, cellText);
          headers.push(cellText);
        });
      }
    }

    // Парсим строки данных
    const dataRows = tbody.querySelectorAll('tr');
    console.log('TabXport: Found', dataRows.length, 'data rows');
    
    dataRows.forEach((row, index) => {
      // Пропускаем первую строку, если она была использована как заголовок и нет thead
      if (!thead && index === 0 && headers.length === 0) {
        console.log('TabXport: Using first row as headers (no thead found)');
        const cells = row.querySelectorAll('th, td');
        cells.forEach((cell, cellIndex) => {
          const cellText = cell.textContent?.trim() || '';
          console.log(`TabXport: Header from first row ${cellIndex}:`, cellText);
          headers.push(cellText);
        });
        return;
      }

      const rowData: string[] = [];
      const cells = row.querySelectorAll('td, th');
      console.log(`TabXport: Row ${index} has ${cells.length} cells`);
      
      cells.forEach((cell, cellIndex) => {
        const cellText = cell.textContent?.trim() || '';
        console.log(`TabXport: Row ${index}, cell ${cellIndex}:`, cellText);
        rowData.push(cellText);
      });

      if (rowData.length > 0) {
        rows.push(rowData);
        console.log(`TabXport: Added row ${index} with ${rowData.length} cells`);
      }
    });

    console.log('TabXport: HTML table parsing complete - Headers:', headers.length, 'Data rows:', rows.length);
  } catch (error) {
    console.error('TabXport: Error parsing HTML table:', error);
  }

  return { headers, rows };
};

// Парсинг div-таблицы (используется в ChatGPT, Claude)
export const parseDivTable = (container: HTMLElement): { headers: string[]; rows: string[][] } => {
  const headers: string[] = [];
  const rows: string[][] = [];

  // Исключаем UI элементы на раннем этапе
  if (container.classList.contains('text-input-field') ||
      container.classList.contains('input') ||
      container.classList.contains('toolbar') ||
      container.classList.contains('button') ||
      container.classList.contains('menu') ||
      container.classList.contains('dropdown') ||
      container.classList.contains('modal') ||
      container.classList.contains('popup') ||
      container.classList.contains('tooltip') ||
      container.classList.contains('ng-tns') ||
      container.id?.includes('input') ||
      container.id?.includes('toolbar') ||
      container.textContent?.includes('Deep Research') ||
      container.textContent?.includes('Canvas') ||
      container.textContent?.includes('Спросить Gemini') ||
      (container.textContent?.trim().length || 0) < 20) {
    return { headers: [], rows: [] };
  }

  // Ищем различные паттерны div-таблиц
  
  // Паттерн 1: div с role="table" или классами table
  const tableDiv = container.querySelector('[role="table"], .table, [class*="table"]');
  if (tableDiv) {
    const headerRow = tableDiv.querySelector('[role="row"]:first-child, .table-header, [class*="header"]');
    if (headerRow) {
      const headerCells = headerRow.querySelectorAll('[role="columnheader"], [role="cell"], .cell, [class*="cell"]');
      headerCells.forEach(cell => {
        const cellText = cell.textContent?.trim() || '';
        if (cellText.length > 0 && !cellText.includes('Deep Research') && !cellText.includes('Canvas')) {
          headers.push(cellText);
        }
      });
    }

    const dataRows = tableDiv.querySelectorAll('[role="row"]:not(:first-child), .table-row, [class*="row"]:not([class*="header"])');
    dataRows.forEach(row => {
      const rowData: string[] = [];
      const cells = row.querySelectorAll('[role="cell"], .cell, [class*="cell"]');
      cells.forEach(cell => {
        const cellText = cell.textContent?.trim() || '';
        rowData.push(cellText);
      });
      if (rowData.length > 0 && rowData.some(cell => cell.length > 0)) {
        rows.push(rowData);
      }
    });
  }

  // Паттерн 2: Поиск структур с повторяющимися div-ами
  if (headers.length === 0 && rows.length === 0) {
    const potentialRows = container.querySelectorAll('div');
    const rowCandidates: HTMLElement[] = [];
    
    // Ищем div-ы с одинаковой структурой (потенциальные строки таблицы)
    potentialRows.forEach(div => {
      // Исключаем UI элементы
      if (div.classList.contains('text-input-field') ||
          div.classList.contains('input') ||
          div.classList.contains('toolbar') ||
          div.classList.contains('button') ||
          div.classList.contains('ng-tns')) {
        return;
      }
      
      const children = div.children;
      if (children.length >= 2 && children.length <= 10) { // Разумное количество колонок
        // Проверяем, что дочерние элементы содержат осмысленный текст
        const hasValidText = Array.from(children).some(child => {
          const text = child.textContent?.trim() || '';
          return text.length > 1 && 
                 !text.includes('Deep Research') && 
                 !text.includes('Canvas') &&
                 !text.includes('Спросить Gemini') &&
                 !/^[^\w]*$/.test(text); // Не только символы
        });
        if (hasValidText) {
          rowCandidates.push(div);
        }
      }
    });

    // Если нашли несколько похожих строк
    if (rowCandidates.length >= 2) {
      const firstRowChildren = rowCandidates[0].children.length;
      const consistentRows = rowCandidates.filter(row => row.children.length === firstRowChildren);
      
      if (consistentRows.length >= 2) {
        // Первая строка как заголовки
        Array.from(consistentRows[0].children).forEach(child => {
          const headerText = child.textContent?.trim() || '';
          if (headerText.length > 0 && 
              !headerText.includes('Deep Research') && 
              !headerText.includes('Canvas')) {
            headers.push(headerText);
          }
        });

        // Остальные как данные
        consistentRows.slice(1).forEach(row => {
          const rowData: string[] = [];
          Array.from(row.children).forEach(child => {
            rowData.push(child.textContent?.trim() || '');
          });
          if (rowData.some(cell => cell.length > 0)) {
            rows.push(rowData);
          }
        });
      }
    }
  }

  // Дополнительная валидация: убеждаемся, что у нас есть реальные табличные данные
  if (headers.length >= 2 && rows.length >= 1) {
    // Проверяем, что заголовки содержат осмысленный текст
    const validHeaders = headers.filter(header => 
      header.length > 1 && 
      !header.includes('Deep Research') && 
      !header.includes('Canvas') &&
      !/^[^\w]*$/.test(header)
    );
    
    if (validHeaders.length < 2) {
      return { headers: [], rows: [] };
    }
  }

  return { headers, rows };
};

// Парсинг markdown таблицы из текста
export const parseMarkdownTable = (text: string): { headers: string[]; rows: string[][] } => {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  const headers: string[] = [];
  const rows: string[][] = [];

  // Первая строка - заголовки
  const headerLine = lines[0];
  if (headerLine.startsWith('|') && headerLine.endsWith('|')) {
    const headerCells = headerLine.slice(1, -1).split('|').map(cell => cell.trim());
    headers.push(...headerCells);
  }

  // Пропускаем разделительную строку (обычно вторая строка с |---|---|)
  let startIndex = 1;
  if (lines[1] && lines[1].includes('---')) {
    startIndex = 2;
  }

  // Парсим строки данных
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.slice(1, -1).split('|').map(cell => cell.trim());
      if (cells.length === headers.length) {
        rows.push(cells);
      }
    }
  }

  return { headers, rows };
};

// Поиск markdown таблиц в pre блоках и code блоках
export const findMarkdownTablesInElement = (element: HTMLElement): { headers: string[]; rows: string[][] } | null => {
  const text = element.textContent || '';
  
  // Проверяем, содержит ли текст markdown таблицу
  const hasTablePattern = /\|.*\|.*\n.*\|.*---.*\|/;
  if (!hasTablePattern.test(text)) {
    return null;
  }

  return parseMarkdownTable(text);
};

// Поиск таблиц в тексте сообщений (для ChatGPT, Claude)
export const findTablesInTextContent = (container: HTMLElement): { headers: string[]; rows: string[][] } | null => {
  const text = container.textContent || '';
  
  // Фильтруем системные элементы ChatGPT
  if (text.includes('window.__oai') || text.includes('requestAnimationFrame') || text.length < 20) {
    console.log('TabXport: Skipping system element in text content analysis');
    return null;
  }
  
  console.log('TabXport: Analyzing text content for tables, length:', text.length);
  console.log('TabXport: Text preview:', text.substring(0, 150));
  
  // Ищем паттерны таблиц в тексте
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  console.log('TabXport: Total non-empty lines:', lines.length);
  
  // Ищем строки с разделителями |
  const pipeLines = lines.filter(line => line.includes('|'));
  console.log('TabXport: Lines with pipe separators:', pipeLines.length);
  
  if (pipeLines.length >= 2) {
    const headers: string[] = [];
    const rows: string[][] = [];

    // Парсим первую строку как заголовки
    const firstLine = pipeLines[0];
    console.log('TabXport: First pipe line:', firstLine);
    
    // Парсим ячейки из строки с |
    const headerCells = firstLine.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0);
    
    console.log('TabXport: Parsed header cells:', headerCells);
    
    if (headerCells.length >= 2) {
      headers.push(...headerCells);
      
      // Парсим остальные строки как данные (пропускаем разделители с ---)
      pipeLines.slice(1).forEach((line, index) => {
        if (line.includes('---')) {
          console.log(`TabXport: Skipping separator line ${index + 1}:`, line);
          return;
        }
        
        const cells = line.split('|')
          .map(cell => cell.trim())
          .filter(cell => cell.length > 0);
        
        console.log(`TabXport: Parsed row ${index + 1} cells:`, cells);
        
        // Проверяем, что количество ячеек соответствует заголовкам
        if (cells.length === headers.length) {
          rows.push(cells);
        } else if (cells.length > 0) {
          // Если количество ячеек не совпадает, дополняем или обрезаем
          const normalizedCells = [...cells];
          while (normalizedCells.length < headers.length) {
            normalizedCells.push('');
          }
          if (normalizedCells.length > headers.length) {
            normalizedCells.splice(headers.length);
          }
          rows.push(normalizedCells);
        }
      });
    }

    console.log('TabXport: Final parsed table - headers:', headers, 'rows:', rows);
    
    if (headers.length > 0 && rows.length > 0) {
      return { headers, rows };
    }
  }
  
  // Альтернативный метод: поиск таблиц с множественными пробелами или табуляцией
  const spaceSeparatedLines = lines.filter(line => 
    line.split(/\s{2,}|\t/).length >= 2 && 
    !line.includes('|') // Исключаем уже обработанные строки с |
  );
  
  if (spaceSeparatedLines.length >= 2) {
    console.log('TabXport: Trying space-separated table parsing');
    const headers: string[] = [];
    const rows: string[][] = [];

    // Первая строка как заголовки
    const firstLine = spaceSeparatedLines[0];
    headers.push(...firstLine.split(/\s{2,}|\t/).map(cell => cell.trim()));
    
    // Остальные строки как данные
    spaceSeparatedLines.slice(1).forEach(line => {
      const cells = line.split(/\s{2,}|\t/).map(cell => cell.trim());
      if (cells.length === headers.length) {
        rows.push(cells);
      }
    });

    if (headers.length > 0 && rows.length > 0) {
      console.log('TabXport: Space-separated table found - headers:', headers, 'rows:', rows);
      return { headers, rows };
    }
  }

  console.log('TabXport: No valid table structure found in text content');
  return null;
};

// Основная функция для извлечения данных таблицы
export const extractTableData = (element: HTMLElement): TableData | null => {
  if (!element || !element.tagName) {
    console.error('TabXport: Invalid element provided to extractTableData');
    return null;
  }

  const url = window.location.href;
  const source = detectSource(url);
  const id = generateTableId(element);
  const timestamp = Date.now();

  let headers: string[] = [];
  let rows: string[][] = [];

  try {
    console.log('TabXport: extractTableData called for element:', element.tagName, element.className);
    console.log('TabXport: Element text content preview:', element.textContent?.substring(0, 200));

    // HTML таблица
    if (element.tagName.toLowerCase() === 'table') {
      console.log('TabXport: Processing HTML table');
      try {
        const tableData = parseHTMLTable(element as HTMLTableElement);
        headers = tableData.headers;
        rows = tableData.rows;
        console.log('TabXport: HTML table headers:', headers);
        console.log('TabXport: HTML table rows:', rows);
        console.log('TabXport: HTML table rows count:', rows.length);
        
        // Дополнительная проверка для HTML таблиц
        if (headers.length === 0 && rows.length > 0) {
          console.log('TabXport: No headers found, using first row as headers');
          headers = rows[0] || [];
          rows = rows.slice(1);
        }
      } catch (error) {
        console.error('TabXport: Error processing HTML table:', error);
        return null;
      }
    }
    // Pre или code блоки с markdown
    else if (element.tagName.toLowerCase() === 'pre' || element.tagName.toLowerCase() === 'code') {
      console.log('TabXport: Processing pre/code block');
      const markdownData = findMarkdownTablesInElement(element);
      if (markdownData) {
        headers = markdownData.headers;
        rows = markdownData.rows;
        console.log('TabXport: Markdown table headers:', headers);
        console.log('TabXport: Markdown table rows:', rows);
      }
    }
    // Div контейнеры (ChatGPT, Claude)
    else if (element.tagName.toLowerCase() === 'div') {
      console.log('TabXport: Processing div container');
      // Сначала пробуем div-таблицу
      const divTableData = parseDivTable(element);
      console.log('TabXport: Div table data:', divTableData);
      
      if (divTableData.headers.length > 0 || divTableData.rows.length > 0) {
        headers = divTableData.headers;
        rows = divTableData.rows;
        console.log('TabXport: Using div table data - headers:', headers);
        console.log('TabXport: Using div table data - rows:', rows);
      } else {
        // Затем ищем в текстовом содержимом
        console.log('TabXport: Trying text content analysis');
        const textTableData = findTablesInTextContent(element);
        if (textTableData) {
          headers = textTableData.headers;
          rows = textTableData.rows;
          console.log('TabXport: Using text table data - headers:', headers);
          console.log('TabXport: Using text table data - rows:', rows);
        }
      }
    }

    // Валидация данных
    if (headers.length === 0 && rows.length === 0) {
      console.log('TabXport: No valid table data found');
      return null;
    }

    // Убеждаемся, что у нас есть минимальные данные для экспорта
    if (headers.length === 0 && rows.length > 0) {
      console.log('TabXport: Creating default headers');
      const maxColumns = Math.max(...rows.map(row => row.length));
      headers = Array.from({ length: maxColumns }, (_, i) => `Column ${i + 1}`);
    }

    // Извлекаем название чата для имени файла
    console.log('TabXport: About to extract chat title for source:', source);
    console.log('TabXport: Current URL for title extraction:', window.location.href);
    const chatTitle = extractChatTitle(source);
    console.log('TabXport: Chat title extraction completed, result:', chatTitle);

    const result: TableData = {
      id,
      headers,
      rows,
      source,
      timestamp,
      url,
      chatTitle,
    };

    console.log('TabXport: Final extracted table data:', result);
    console.log('TabXport: Export data summary - Headers:', headers.length, 'Rows:', rows.length, 'Chat title:', chatTitle);
    return result;
  } catch (error) {
    console.error('TabXport: Error in extractTableData:', error);
    return null;
  }
};

// Поиск всех таблиц на странице
export const findAllTables = (): HTMLElement[] => {
  const tables: HTMLElement[] = [];
  const url = window.location.href;
  
  console.log('TabXport: findAllTables() called');
  console.log('TabXport: Current URL:', url);
  
  // Специальный детектор для ChatGPT
  if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) {
    console.log('TabXport: Using ChatGPT-specific detector');
    const chatGPTTables = findChatGPTTables();
    console.log('TabXport: ChatGPT tables found:', chatGPTTables.length);
    tables.push(...chatGPTTables);
    
    // Для ChatGPT возвращаем только результаты специального детектора
    console.log('TabXport: Returning ChatGPT tables:', tables.length);
    return tables;
  }
  
  // Специальный детектор для Claude
  if (url.includes('claude.ai')) {
    console.log('TabXport: Using Claude-specific detector');
    const claudeTables = findClaudeTables();
    console.log('TabXport: Claude tables found:', claudeTables.length);
    tables.push(...claudeTables);
    
    // Для Claude возвращаем только результаты специального детектора
    console.log('TabXport: Returning only Claude-specific results, skipping general detection');
    console.log('TabXport: Returning Claude tables:', tables.length);
    return tables;
  }
  
  // Специальный детектор для Gemini
  if (url.includes('gemini.google.com') || url.includes('bard.google.com')) {
    console.log('TabXport: Using Gemini-specific detector');
    const geminiTables = findGeminiTables();
    console.log('TabXport: Gemini tables found:', geminiTables.length);
    tables.push(...geminiTables);
    
    // Для Gemini возвращаем только результаты специального детектора
    console.log('TabXport: Returning only Gemini-specific results, skipping general detection');
    console.log('TabXport: Returning Gemini tables:', tables.length);
    return tables;
  }
  
  // Специальный детектор для DeepSeek
  if (url.includes('chat.deepseek.com') || url.includes('deepseek.com')) {
    console.log('TabXport: Using DeepSeek-specific detector');
    const deepseekTables = findDeepSeekTables();
    console.log('TabXport: DeepSeek tables found:', deepseekTables.length);
    tables.push(...deepseekTables);
    
    // Для DeepSeek возвращаем только результаты специального детектора
    console.log('TabXport: Returning only DeepSeek-specific results, skipping general detection');
    console.log('TabXport: Returning DeepSeek tables:', tables.length);
    return tables;
  }
  
  // Для других сайтов используем улучшенный общий алгоритм
  console.log('TabXport: Using improved general detector for other sites');
  
  // HTML таблицы
  const htmlTables = document.querySelectorAll('table');
  console.log('TabXport: HTML tables found:', htmlTables.length);
  htmlTables.forEach(table => {
    if (table.offsetParent !== null && table.rows.length > 0) {
      tables.push(table);
    }
  });

  // Pre и code блоки с markdown таблицами
  const codeElements = document.querySelectorAll('pre, code');
  console.log('TabXport: Code elements found:', codeElements.length);
  codeElements.forEach(element => {
    const htmlElement = element as HTMLElement;
    if (htmlElement.offsetParent !== null && findMarkdownTablesInElement(htmlElement)) {
      tables.push(htmlElement);
    }
  });

  // Div контейнеры с таблицами (только для не-ChatGPT, не-Claude и не-Gemini сайтов)
  // Используем более строгие критерии для избежания UI элементов
  const divElements = document.querySelectorAll('div');
  console.log('TabXport: Div elements found:', divElements.length);
  let divTablesFound = 0;
  
  divElements.forEach(div => {
    const htmlDiv = div as HTMLElement;
    
    // Исключаем UI элементы и системные div-ы
    if (htmlDiv.classList.contains('text-input-field') ||
        htmlDiv.classList.contains('input') ||
        htmlDiv.classList.contains('toolbar') ||
        htmlDiv.classList.contains('button') ||
        htmlDiv.classList.contains('menu') ||
        htmlDiv.classList.contains('dropdown') ||
        htmlDiv.classList.contains('modal') ||
        htmlDiv.classList.contains('popup') ||
        htmlDiv.classList.contains('tooltip') ||
        htmlDiv.classList.contains('navigation') ||
        htmlDiv.classList.contains('header') ||
        htmlDiv.classList.contains('footer') ||
        htmlDiv.id?.includes('input') ||
        htmlDiv.id?.includes('toolbar') ||
        htmlDiv.id?.includes('menu') ||
        (htmlDiv.textContent?.trim().length || 0) < 20) {
      return;
    }
    
    if (htmlDiv.offsetParent !== null) {
      // Проверяем, содержит ли div табличные данные с более строгими критериями
      const hasTableData = parseDivTable(htmlDiv);
      const hasTextTable = findTablesInTextContent(htmlDiv);
      
      if ((hasTableData.headers.length >= 2 && hasTableData.rows.length >= 1) || hasTextTable) {
        // Избегаем дублирования - не добавляем родительские элементы
        const isChildOfExisting = tables.some(existing => existing.contains(htmlDiv) || htmlDiv.contains(existing));
        if (!isChildOfExisting) {
          tables.push(htmlDiv);
          divTablesFound++;
        }
      }
    }
  });
  
  console.log('TabXport: Div tables found:', divTablesFound);
  console.log('TabXport: Total unique tables:', tables.length);

  return tables;
};

// Проверка, является ли элемент валидной таблицей
export const isValidTable = (element: HTMLElement): boolean => {
  const tableData = extractTableData(element);
  return tableData !== null && (tableData.headers.length > 0 || tableData.rows.length > 0);
};

// Специальный детектор для ChatGPT
export const findChatGPTTables = (): HTMLElement[] => {
  const tables: HTMLElement[] = [];
  
  console.log('TabXport: Starting ChatGPT table detection');
  
  // Ищем сообщения ChatGPT с более точными селекторами
  const messageContainers = document.querySelectorAll('[data-message-author-role="assistant"]');
  console.log(`TabXport: Found ${messageContainers.length} assistant messages`);

  messageContainers.forEach((container, containerIndex) => {
    const messageElement = container as HTMLElement;
    console.log(`TabXport: Processing assistant message ${containerIndex}`);
    
    // 1. Ищем HTML таблицы в сообщении
    const htmlTables = messageElement.querySelectorAll('table');
    console.log(`TabXport: Found ${htmlTables.length} HTML tables in message ${containerIndex}`);
    htmlTables.forEach((table, tableIndex) => {
      if (table.rows.length > 0) {
        console.log(`TabXport: Adding HTML table ${tableIndex} from message ${containerIndex}`);
        tables.push(table as HTMLElement);
      }
    });
    
    // 2. Ищем pre/code блоки с markdown таблицами
    const codeBlocks = messageElement.querySelectorAll('pre, code');
    console.log(`TabXport: Found ${codeBlocks.length} code blocks in message ${containerIndex}`);
    codeBlocks.forEach((block, blockIndex) => {
      const htmlBlock = block as HTMLElement;
      const blockText = htmlBlock.textContent || '';
      
      // Проверяем на markdown таблицу
      if (blockText.includes('|') && blockText.includes('\n')) {
        const markdownTable = findMarkdownTablesInElement(htmlBlock);
        if (markdownTable && markdownTable.headers.length > 0) {
          console.log(`TabXport: Adding markdown table ${blockIndex} from message ${containerIndex}`);
          tables.push(htmlBlock);
        }
      }
    });
    
    // 3. Ищем текстовые таблицы (но только в контенте сообщения, не в системных элементах)
    const contentElements = messageElement.querySelectorAll('.markdown, .prose, [class*="content"], p');
    console.log(`TabXport: Found ${contentElements.length} content elements in message ${containerIndex}`);
    
    contentElements.forEach((element, elementIndex) => {
      const htmlElement = element as HTMLElement;
      const text = htmlElement.textContent || '';
      
      // Фильтруем системные элементы
      if (text.includes('window.__oai') || text.includes('requestAnimationFrame') || text.length < 10) {
        console.log(`TabXport: Skipping system element ${elementIndex} in message ${containerIndex}`);
        return;
      }
      
      // Проверяем на таблицу с разделителями |
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const tableLines = lines.filter(line => line.includes('|') && line.split('|').length >= 3);
      
      if (tableLines.length >= 2) {
        console.log(`TabXport: Found potential text table in element ${elementIndex} of message ${containerIndex}`);
        console.log(`TabXport: Table lines:`, tableLines.slice(0, 3)); // Показываем первые 3 строки для отладки
        
        // Проверяем, что это не уже найденная таблица
        const isAlreadyFound = tables.some(existingTable => 
          existingTable.contains(htmlElement) || htmlElement.contains(existingTable)
        );
        
        if (!isAlreadyFound) {
          // Дополнительная проверка - должны быть минимум 2 колонки в каждой строке
          const validLines = tableLines.filter(line => {
            const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
            return cells.length >= 2;
          });
          
          if (validLines.length >= 2) {
            console.log(`TabXport: Adding text table element ${elementIndex} from message ${containerIndex}`);
            tables.push(htmlElement);
          }
        }
      }
    });
  });
  
  console.log(`TabXport: Total ChatGPT tables found: ${tables.length}`);
  return tables;
};

// Специальный детектор для Claude AI
export const findClaudeTables = (): HTMLElement[] => {
  const tables: HTMLElement[] = [];
  const processedElements = new Set<HTMLElement>(); // Для избежания дублирования
  const processedTableContent = new Set<string>(); // Для избежания дублирования по содержимому
  
  console.log('TabXport: Starting Claude table detection');
  
  // Ищем сообщения Claude (могут быть разные селекторы)
  const messageSelectors = [
    '[data-testid="conversation-turn"]',
    '[class*="message"]',
    '[class*="assistant"]',
    '.prose',
    '[class*="content"]'
  ];
  
  let allMessages: HTMLElement[] = [];
  
  messageSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    console.log(`TabXport: Found ${elements.length} elements with selector: ${selector}`);
    elements.forEach(element => {
      allMessages.push(element as HTMLElement);
    });
  });
  
  // Удаляем дубликаты
  allMessages = allMessages.filter((element, index, arr) => 
    arr.findIndex(el => el === element) === index
  );
  
  console.log(`TabXport: Total unique Claude message containers: ${allMessages.length}`);

  allMessages.forEach((message, messageIndex) => {
    console.log(`TabXport: Processing Claude message ${messageIndex}`);
    
    // 1. Ищем HTML таблицы в сообщении
    const htmlTables = message.querySelectorAll('table');
    console.log(`TabXport: Found ${htmlTables.length} HTML tables in Claude message ${messageIndex}`);
    htmlTables.forEach((table, tableIndex) => {
      const htmlTable = table as HTMLElement;
      const tableContent = htmlTable.textContent?.trim() || '';
      const contentHash = tableContent.substring(0, 100); // Первые 100 символов как хеш
      
      if (table.rows.length > 0 && 
          !processedElements.has(htmlTable) && 
          !processedTableContent.has(contentHash)) {
        console.log(`TabXport: Adding HTML table ${tableIndex} from Claude message ${messageIndex}`);
        tables.push(htmlTable);
        processedElements.add(htmlTable);
        processedTableContent.add(contentHash);
      } else {
        console.log(`TabXport: Skipping duplicate HTML table ${tableIndex} in message ${messageIndex}`);
      }
    });
    
    // 2. Ищем pre/code блоки с markdown таблицами
    const codeBlocks = message.querySelectorAll('pre, code');
    console.log(`TabXport: Found ${codeBlocks.length} code blocks in Claude message ${messageIndex}`);
    codeBlocks.forEach((block, blockIndex) => {
      const htmlBlock = block as HTMLElement;
      const blockText = htmlBlock.textContent || '';
      const contentHash = blockText.trim().substring(0, 100);
      
      if (processedElements.has(htmlBlock) || processedTableContent.has(contentHash)) {
        console.log(`TabXport: Skipping already processed code block ${blockIndex}`);
        return;
      }
      
      // Проверяем на markdown таблицу
      if (blockText.includes('|') && blockText.includes('\n')) {
        const markdownTable = findMarkdownTablesInElement(htmlBlock);
        if (markdownTable && markdownTable.headers.length > 0) {
          console.log(`TabXport: Adding markdown table ${blockIndex} from Claude message ${messageIndex}`);
          tables.push(htmlBlock);
          processedElements.add(htmlBlock);
          processedTableContent.add(contentHash);
        }
      }
    });
    
    // 3. Ищем текстовые таблицы в содержимом (но только если не нашли в pre/code)
    const textContent = message.textContent || '';
    console.log(`TabXport: Claude message ${messageIndex} text length: ${textContent.length}`);
    
    if (textContent.includes('|') && textContent.split('\n').length > 2) {
      console.log(`TabXport: Claude message ${messageIndex} contains potential table markers`);
      
      // Ищем конкретные элементы с табличным содержимым
      const textElements = message.querySelectorAll('div, p, span');
      console.log(`TabXport: Checking ${textElements.length} text containers in Claude message ${messageIndex}`);
      
      textElements.forEach((element, elementIndex) => {
        const htmlElement = element as HTMLElement;
        const text = htmlElement.textContent || '';
        const contentHash = text.trim().substring(0, 100);
        
        if (processedElements.has(htmlElement) || processedTableContent.has(contentHash)) {
          return;
        }
        
        // Фильтруем системные элементы и слишком короткий текст
        if (text.length < 20) {
          return;
        }
        
        // Проверяем, не содержится ли этот элемент в уже найденных pre/code блоках
        const isInsideCodeBlock = Array.from(processedElements).some(processed => 
          processed.contains(htmlElement) || htmlElement.contains(processed)
        );
        
        if (isInsideCodeBlock) {
          console.log(`TabXport: Skipping text element ${elementIndex} - inside code block`);
          return;
        }
        
        // Проверяем на таблицу с разделителями |
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const tableLines = lines.filter(line => line.includes('|') && line.split('|').length >= 3);
        
        if (tableLines.length >= 2) {
          console.log(`TabXport: Found potential text table in Claude element ${elementIndex} of message ${messageIndex}`);
          console.log(`TabXport: Table lines:`, tableLines.slice(0, 3)); // Показываем первые 3 строки для отладки
          
          // Проверяем, что это не уже найденная таблица
          const isAlreadyFound = tables.some(existingTable => 
            existingTable.contains(htmlElement) || htmlElement.contains(existingTable)
          );
          
          if (!isAlreadyFound) {
            // Дополнительная проверка - должны быть минимум 2 колонки в каждой строке
            const validLines = tableLines.filter(line => {
              const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
              return cells.length >= 2;
            });
            
            if (validLines.length >= 2) {
              console.log(`TabXport: Adding text table element ${elementIndex} from Claude message ${messageIndex}`);
              tables.push(htmlElement);
              processedElements.add(htmlElement);
              processedTableContent.add(contentHash);
            }
          }
        }
      });
    }
  });
  
  console.log(`TabXport: Total Claude tables found: ${tables.length}`);
  console.log(`TabXport: Processed elements count: ${processedElements.size}`);
  console.log(`TabXport: Unique content hashes: ${processedTableContent.size}`);
  return tables;
};

// Специальный детектор для Gemini
export const findGeminiTables = (): HTMLElement[] => {
  const tables: HTMLElement[] = [];
  
  console.log('TabXport: Starting Gemini table detection');
  
  // Сначала ищем все HTML таблицы на странице
  const allHTMLTables = document.querySelectorAll('table');
  console.log(`TabXport: Found ${allHTMLTables.length} total HTML tables on page`);
  
  allHTMLTables.forEach((table, index) => {
    const htmlTable = table as HTMLElement;
    console.log(`TabXport: Checking HTML table ${index}:`, htmlTable);
    console.log(`TabXport: Table rows: ${table.rows.length}`);
    console.log(`TabXport: Table visible: ${htmlTable.offsetParent !== null}`);
    console.log(`TabXport: Table text preview:`, htmlTable.textContent?.substring(0, 100));
    
    if (table.rows.length > 0 && htmlTable.offsetParent !== null) {
      console.log(`TabXport: Adding HTML table ${index} directly`);
      tables.push(htmlTable);
    }
  });
  
  // Затем ищем контейнеры с ответами Gemini для других типов таблиц
  const responseContainers = document.querySelectorAll('[data-response-id], .response-container, .model-response, .conversation-turn');
  console.log(`TabXport: Found ${responseContainers.length} response containers`);

  responseContainers.forEach((container, containerIndex) => {
    const responseElement = container as HTMLElement;
    console.log(`TabXport: Processing response container ${containerIndex}`);
    
    // Исключаем UI элементы и системные контейнеры
    if (responseElement.classList.contains('text-input-field') ||
        responseElement.classList.contains('input-container') ||
        responseElement.classList.contains('toolbar') ||
        responseElement.classList.contains('header') ||
        responseElement.classList.contains('footer') ||
        responseElement.classList.contains('navigation') ||
        responseElement.id?.includes('input') ||
        responseElement.id?.includes('toolbar')) {
      console.log(`TabXport: Skipping UI element in container ${containerIndex}`);
      return;
    }
    
    // Ищем pre/code блоки с markdown таблицами
    const codeBlocks = responseElement.querySelectorAll('pre, code');
    console.log(`TabXport: Found ${codeBlocks.length} code blocks in response ${containerIndex}`);
    codeBlocks.forEach((block, blockIndex) => {
      const htmlBlock = block as HTMLElement;
      const blockText = htmlBlock.textContent || '';
      
      // Проверяем на markdown таблицу
      if (blockText.includes('|') && blockText.includes('\n')) {
        const markdownTable = findMarkdownTablesInElement(htmlBlock);
        if (markdownTable && markdownTable.headers.length > 0) {
          console.log(`TabXport: Adding markdown table ${blockIndex} from response ${containerIndex}`);
          tables.push(htmlBlock);
        }
      }
    });
    
    // Ищем div-таблицы, но с более строгими критериями
    const divElements = responseElement.querySelectorAll('div');
    divElements.forEach((div, divIndex) => {
      const htmlDiv = div as HTMLElement;
      
      // Исключаем UI элементы и системные div-ы
      if (htmlDiv.classList.contains('text-input-field') ||
          htmlDiv.classList.contains('input') ||
          htmlDiv.classList.contains('toolbar') ||
          htmlDiv.classList.contains('button') ||
          htmlDiv.classList.contains('menu') ||
          htmlDiv.classList.contains('dropdown') ||
          htmlDiv.classList.contains('modal') ||
          htmlDiv.classList.contains('popup') ||
          htmlDiv.classList.contains('tooltip') ||
          htmlDiv.classList.contains('ng-tns')) {
        return;
      }
      
      // Проверяем, содержит ли div реальные табличные данные
      const divTableData = parseDivTable(htmlDiv);
      if (divTableData.headers.length >= 2 && divTableData.rows.length >= 1) {
        // Дополнительная проверка: убеждаемся, что это не UI элемент
        const hasValidTableContent = divTableData.headers.some(header => 
          header.length > 1 && !header.includes('Deep Research') && !header.includes('Canvas')
        );
        
        if (hasValidTableContent) {
          console.log(`TabXport: Adding div table ${divIndex} from response ${containerIndex}`);
          tables.push(htmlDiv);
        }
      }
    });
  });
  
  // Если не нашли в контейнерах ответов, ищем в основном контенте
  if (tables.length <= allHTMLTables.length) {
    console.log('TabXport: Searching in main content for additional tables');
    
    // Ищем markdown таблицы в code блоках
    const mainCodeBlocks = document.querySelectorAll('main pre, main code, .content pre, .content code, pre, code');
    console.log(`TabXport: Found ${mainCodeBlocks.length} code blocks in main content`);
    mainCodeBlocks.forEach((block, blockIndex) => {
      const htmlBlock = block as HTMLElement;
      if (htmlBlock.offsetParent !== null && findMarkdownTablesInElement(htmlBlock)) {
        // Проверяем, не добавили ли уже эту таблицу
        if (!tables.includes(htmlBlock)) {
          console.log(`TabXport: Adding main content markdown table ${blockIndex}`);
          tables.push(htmlBlock);
        }
      }
    });
  }
  
  console.log(`TabXport: Gemini detection complete, found ${tables.length} tables`);
  tables.forEach((table, index) => {
    console.log(`TabXport: Table ${index}:`, table.tagName, table.className || 'no-class');
  });
  
  return tables;
};

// Специальный детектор для DeepSeek
export const findDeepSeekTables = (): HTMLElement[] => {
  const tables: HTMLElement[] = [];
  
  console.log('TabXport: Starting DeepSeek table detection');
  
  // Сначала ищем все HTML таблицы на странице
  const allHTMLTables = document.querySelectorAll('table');
  console.log(`TabXport: Found ${allHTMLTables.length} total HTML tables on page`);
  
  allHTMLTables.forEach((table, index) => {
    const htmlTable = table as HTMLElement;
    console.log(`TabXport: Checking HTML table ${index}:`, htmlTable);
    console.log(`TabXport: Table rows: ${table.rows.length}`);
    console.log(`TabXport: Table visible: ${htmlTable.offsetParent !== null}`);
    console.log(`TabXport: Table text preview:`, htmlTable.textContent?.substring(0, 100));
    
    if (table.rows.length > 0 && htmlTable.offsetParent !== null) {
      console.log(`TabXport: Adding HTML table ${index} directly`);
      tables.push(htmlTable);
    }
  });
  
  // Затем ищем контейнеры с ответами DeepSeek
  const messageContainers = document.querySelectorAll('.message, .chat-message, .response, .assistant-message, [class*="message"], [class*="response"]');
  console.log(`TabXport: Found ${messageContainers.length} message containers in DeepSeek`);

  messageContainers.forEach((container, containerIndex) => {
    const messageElement = container as HTMLElement;
    console.log(`TabXport: Processing DeepSeek message container ${containerIndex}`);
    
    // Исключаем пользовательские сообщения и UI элементы
    if (messageElement.classList.contains('user-message') ||
        messageElement.classList.contains('human-message') ||
        messageElement.classList.contains('input-container') ||
        messageElement.classList.contains('toolbar') ||
        messageElement.classList.contains('header') ||
        messageElement.classList.contains('navigation') ||
        messageElement.id?.includes('input') ||
        messageElement.id?.includes('toolbar')) {
      console.log(`TabXport: Skipping user message or UI element in container ${containerIndex}`);
      return;
    }
    
    // Ищем pre/code блоки с markdown таблицами
    const codeBlocks = messageElement.querySelectorAll('pre, code, .code-block, [class*="code"]');
    console.log(`TabXport: Found ${codeBlocks.length} code blocks in DeepSeek message ${containerIndex}`);
    codeBlocks.forEach((block, blockIndex) => {
      const htmlBlock = block as HTMLElement;
      const blockText = htmlBlock.textContent || '';
      
      // Проверяем на markdown таблицу
      if (blockText.includes('|') && blockText.includes('\n') && blockText.split('\n').length >= 3) {
        const lines = blockText.split('\n').filter(line => line.trim().length > 0);
        const tableLines = lines.filter(line => line.includes('|') && line.split('|').length >= 3);
        
        if (tableLines.length >= 2) {
          console.log(`TabXport: Found markdown table in code block ${blockIndex} of DeepSeek message ${containerIndex}`);
          const markdownTable = findMarkdownTablesInElement(htmlBlock);
          if (markdownTable && markdownTable.headers.length > 0) {
            console.log(`TabXport: Adding markdown table ${blockIndex} from DeepSeek message ${containerIndex}`);
            tables.push(htmlBlock);
          }
        }
      }
    });
    
    // Ищем div-таблицы в ответах
    const contentDivs = messageElement.querySelectorAll('div, .content, .message-content, [class*="content"]');
    contentDivs.forEach((div, divIndex) => {
      const htmlDiv = div as HTMLElement;
      
      // Исключаем UI элементы
      if (htmlDiv.classList.contains('input') ||
          htmlDiv.classList.contains('toolbar') ||
          htmlDiv.classList.contains('button') ||
          htmlDiv.classList.contains('menu') ||
          htmlDiv.classList.contains('header') ||
          htmlDiv.classList.contains('footer') ||
          htmlDiv.textContent?.includes('Deep Research') ||
          htmlDiv.textContent?.includes('Canvas')) {
        return;
      }
      
      // Проверяем на div-таблицу
      const divTableData = parseDivTable(htmlDiv);
      if (divTableData.headers.length >= 2 && divTableData.rows.length >= 1) {
        // Дополнительная валидация для DeepSeek
        const hasValidContent = divTableData.headers.some(header => 
          header.length > 1 && !/^[^\w]*$/.test(header) // Не только символы
        ) && divTableData.rows.some(row => 
          row.some(cell => cell.length > 1 && !/^[^\w]*$/.test(cell))
        );
        
        if (hasValidContent) {
          console.log(`TabXport: Adding div table ${divIndex} from DeepSeek message ${containerIndex}`);
          tables.push(htmlDiv);
        }
      }
    });
    
    // Ищем текстовые таблицы с разделителями |
    const textContent = messageElement.textContent || '';
    if (textContent.includes('|') && textContent.split('\n').length >= 3) {
      const textElements = messageElement.querySelectorAll('p, div, span');
      textElements.forEach((element, elementIndex) => {
        const htmlElement = element as HTMLElement;
        const text = htmlElement.textContent || '';
        
        if (text.length < 20) return;
        
        // Проверяем, не является ли этот элемент частью уже найденной таблицы
        const isAlreadyProcessed = tables.some(existingTable => 
          existingTable.contains(htmlElement) || htmlElement.contains(existingTable)
        );
        
        if (isAlreadyProcessed) return;
        
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        const tableLines = lines.filter(line => line.includes('|') && line.split('|').length >= 3);
        
        if (tableLines.length >= 2) {
          // Проверяем валидность таблицы
          const validLines = tableLines.filter(line => {
            const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
            return cells.length >= 2 && cells.some(cell => cell.length > 1);
          });
          
          if (validLines.length >= 2) {
            console.log(`TabXport: Adding text table element ${elementIndex} from DeepSeek message ${containerIndex}`);
            tables.push(htmlElement);
          }
        }
      });
    }
  });
  
  // Если не нашли достаточно таблиц в контейнерах сообщений, ищем в основном контенте
  if (tables.length <= allHTMLTables.length) {
    console.log('TabXport: Searching in main content for additional DeepSeek tables');
    
    // Ищем markdown таблицы в любых code блоках на странице
    const mainCodeBlocks = document.querySelectorAll('pre, code, .code-block');
    console.log(`TabXport: Found ${mainCodeBlocks.length} code blocks in main content`);
    mainCodeBlocks.forEach((block, blockIndex) => {
      const htmlBlock = block as HTMLElement;
      if (htmlBlock.offsetParent !== null) {
        const markdownTable = findMarkdownTablesInElement(htmlBlock);
        if (markdownTable && markdownTable.headers.length > 0) {
          // Проверяем, не добавили ли уже эту таблицу
          if (!tables.includes(htmlBlock)) {
            console.log(`TabXport: Adding main content markdown table ${blockIndex}`);
            tables.push(htmlBlock);
          }
        }
      }
    });
  }
  
  console.log(`TabXport: DeepSeek detection complete, found ${tables.length} tables`);
  tables.forEach((table, index) => {
    console.log(`TabXport: DeepSeek table ${index}:`, table.tagName, table.className || 'no-class');
  });
  
  return tables;
}; 