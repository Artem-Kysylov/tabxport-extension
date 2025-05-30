import { logger } from '../common/logging';
import { domUtils } from '../common/dom-utils';
import { TitleExtractor } from '../types';

/**
 * Title extractor for DeepSeek platform
 */
export const deepseekTitleExtractor: TitleExtractor = {
  extractTitle: (): string => {
    logger.debug('Starting DeepSeek title extraction');
    
    // Variant 1: Active chat in sidebar
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
    
    logger.debug('Testing sidebar selectors...');
    for (const selector of sidebarSelectors) {
      const elements = document.querySelectorAll(selector);
      logger.debug(`Sidebar selector "${selector}" found ${elements.length} elements`);
      
      for (const element of elements) {
        const text = element.textContent?.trim();
        logger.debug(`Sidebar element text: "${text}"`);
        
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
            logger.debug('DeepSeek title from sidebar:', text);
            return text;
          }
        }
      }
    }
    
    // Variant 2: Chat header in main interface
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
    
    logger.debug('Testing chat header selectors...');
    for (const selector of chatHeaderSelectors) {
      const elements = document.querySelectorAll(selector);
      logger.debug(`Header selector "${selector}" found ${elements.length} elements`);
      
      for (const element of elements) {
        const text = element.textContent?.trim();
        logger.debug(`Header element text: "${text}"`);
        
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
            logger.debug('DeepSeek title from header:', text);
            return text;
          }
        }
      }
    }
    
    // Variant 3: First user message
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
    
    logger.debug('Testing user message selectors...');
    for (const selector of userMessageSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.trim();
        logger.debug(`User message "${selector}": "${text?.substring(0, 50)}..."`);
        
        if (text && text.length > 10 && text.length < 120) {
          const shortTitle = text.substring(0, 50).trim();
          if (shortTitle.length > 5) {
            logger.debug('DeepSeek title from first user message:', shortTitle);
            return shortTitle;
          }
        }
      }
    }
    
    // Variant 4: Navigation elements (more aggressive search)
    const navElements = document.querySelectorAll('a, button, div, span');
    logger.debug(`Testing ${navElements.length} navigation elements...`);
    
    for (const element of navElements) {
      const text = element.textContent?.trim();
      if (!text || text.length < 5 || text.length > 80) continue;
      
      const isActive = element.classList.contains('active') ||
                      element.classList.contains('selected') ||
                      element.classList.contains('current') ||
                      element.getAttribute('aria-current') === 'page' ||
                      element.getAttribute('data-active') === 'true' ||
                      element.classList.contains('chat-title') ||
                      element.classList.contains('conversation-title');
      
      if (isActive) {
        logger.debug(`Active nav element: "${text}"`);
        
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
          logger.debug('DeepSeek title from active navigation:', text);
          return text;
        }
      }
    }
    
    // Variant 5: Local/Session Storage
    logger.debug('Testing storage...');
    try {
      const storageKeys = ['currentChatTitle', 'chatTitle', 'conversationTitle', 'sessionTitle', 'title'];
      for (const key of storageKeys) {
        const stored = localStorage.getItem(key) || sessionStorage.getItem(key);
        logger.debug(`Storage ${key}: "${stored}"`);
        
        if (stored && stored.length > 3 && stored.length < 100) {
          const lowerStored = stored.toLowerCase();
          const isValidTitle = !lowerStored.includes('deepseek') &&
                             !lowerStored.includes('untitled') &&
                             !lowerStored.includes('new chat');
          
          if (isValidTitle) {
            logger.debug('DeepSeek title from storage:', stored);
            return stored;
          }
        }
      }
    } catch (error) {
      logger.error('Could not access storage for title extraction:', error);
    }
    
    // Variant 6: URL path
    logger.debug('Testing URL extraction...');
    const urlPath = window.location.pathname;
    logger.debug('URL path:', urlPath);
    
    const pathMatch = urlPath.match(/\/chat\/([^\/]+)/);
    if (pathMatch && pathMatch[1]) {
      const urlTitle = decodeURIComponent(pathMatch[1])
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/\+/g, ' ');
      
      logger.debug('URL title candidate:', urlTitle);
      
      if (urlTitle.length > 3 && urlTitle.length < 80 && 
          !urlTitle.includes('undefined') && 
          !urlTitle.includes('null') &&
          !/^[a-f0-9-]{20,}$/i.test(urlTitle)) {
        logger.debug('DeepSeek title from URL path:', urlTitle);
        return urlTitle;
      }
    }
    
    // Variant 7: Meta tags
    const metaSelectors = [
      'meta[name="title"]',
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'meta[property="twitter:title"]'
    ];
    
    logger.debug('Testing meta tags...');
    for (const selector of metaSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const content = element.getAttribute('content');
        logger.debug(`Meta ${selector}: "${content}"`);
        
        if (content && content.length > 3 && content.length < 100) {
          const lowerContent = content.toLowerCase();
          const isValidTitle = !lowerContent.includes('deepseek') &&
                             !lowerContent.includes('chat') &&
                             !lowerContent.includes('assistant');
          
          if (isValidTitle) {
            let cleanContent = content
              .replace(' - DeepSeek', '')
              .replace(' - Chat', '')
              .trim();
            
            if (cleanContent.length > 3) {
              logger.debug('DeepSeek title from meta:', cleanContent);
              return cleanContent;
            }
          }
        }
      }
    }
    
    // Variant 8: All headings (last attempt)
    logger.debug('Final fallback - searching all headings...');
    const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]');
    
    for (const heading of allHeadings) {
      const text = heading.textContent?.trim();
      logger.debug(`Heading candidate: "${text}"`);
      
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
          logger.debug('DeepSeek title from heading fallback:', text);
          return text;
        }
      }
    }
    
    // Variant 9: Page title (absolute last resort)
    logger.debug('Final attempt - checking page title as last resort...');
    const pageTitle = document.title;
    if (pageTitle && pageTitle.length > 3) {
      const cleanPageTitle = pageTitle.toLowerCase();
      const isGenericTitle = cleanPageTitle === 'deepseek' || 
                            cleanPageTitle === 'deepseek chat' ||
                            cleanPageTitle === 'chat' ||
                            cleanPageTitle.includes('deepseek - ') && cleanPageTitle.replace('deepseek - ', '').trim().length < 3;
      
      if (!isGenericTitle) {
        let cleanTitle = pageTitle
          .replace(/^deepseek - /i, '')
          .replace(/ - deepseek$/i, '')
          .trim();
        
        if (cleanTitle.length > 3) {
          logger.debug('DeepSeek title from page title (last resort):', cleanTitle);
          return cleanTitle;
        }
      }
    }
    
    logger.debug('No specific DeepSeek title found, using default');
    return 'DeepSeek_Chat';
  }
}; 