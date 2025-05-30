import { logger } from '../common/logging';
import { domUtils } from '../common/dom-utils';
import { TitleExtractor } from '../types';

/**
 * Title extractor for Gemini platform
 */
export const geminiTitleExtractor: TitleExtractor = {
  extractTitle: (): string => {
    logger.debug('Extracting title from Gemini interface');
    
    // Try to find the chat title in the header
    const headerSelectors = [
      '[class*="chat-title"]',
      '[class*="conversation-title"]',
      '.chat-header h1',
      '.chat-header h2',
      'header h1',
      'header h2',
      '[role="heading"]'
    ];

    for (const selector of headerSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = domUtils.getTextContent(element as HTMLElement);
        if (text && text.length > 0 && !text.toLowerCase().includes('gemini')) {
          logger.debug('Gemini title from header:', text);
          return text;
        }
      }
    }

    // Try to find in the sidebar/navigation
    const navSelectors = [
      'mat-tree-node.active',
      '.chat-list .selected',
      '[aria-current="page"]',
      '.conversation-item.active',
      'nav .active'
    ];

    for (const selector of navSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = domUtils.getTextContent(element as HTMLElement);
        if (text && text.length > 0 && !text.toLowerCase().includes('new chat')) {
          logger.debug('Gemini title from navigation:', text);
          return text;
        }
      }
    }

    // Try to get from the first user message
    const firstMessage = document.querySelector('.user-message:first-child, [data-message-author="user"]:first-child');
    if (firstMessage) {
      const text = domUtils.getTextContent(firstMessage as HTMLElement);
      if (text && text.length > 0) {
        const shortTitle = text.substring(0, 50).trim();
        if (shortTitle.length > 5) {
          logger.debug('Gemini title from first message:', shortTitle);
          return shortTitle;
        }
      }
    }

    // Fallback to page title
    const pageTitle = document.title
      .replace(' - Gemini', '')
      .replace(' - Google', '')
      .trim();
    if (pageTitle && pageTitle.length > 0 && !pageTitle.toLowerCase().includes('gemini')) {
      logger.debug('Gemini title from page title:', pageTitle);
      return pageTitle;
    }

    logger.debug('No specific Gemini title found, using default');
    return 'Gemini_Conversation';
  }
}; 