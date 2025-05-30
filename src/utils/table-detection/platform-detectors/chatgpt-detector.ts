import { PlatformDetector } from '../types';
import { logger } from '../common/logging';
import { domUtils } from '../common/dom-utils';

/**
 * Detector for ChatGPT platform
 */
export const chatGPTDetector: PlatformDetector = {
  canDetect: (url: string): boolean => {
    return url.includes('chat.openai.com') || url.includes('chatgpt.com');
  },

  findTables: (): HTMLElement[] => {
    logger.debug('Searching for tables in ChatGPT interface');
    
    const elements: HTMLElement[] = [];
    const processedElements = new Set<HTMLElement>();
    
    // Find messages from the assistant
    const messageContainers = document.querySelectorAll('[data-message-author-role="assistant"]');
    logger.debug(`Found ${messageContainers.length} assistant messages`);

    messageContainers.forEach((container, containerIndex) => {
      const messageElement = container as HTMLElement;
      logger.debug(`Processing assistant message ${containerIndex}`);
      
      // Find HTML tables in the message
      const htmlTables = messageElement.querySelectorAll('table');
      logger.debug(`Found ${htmlTables.length} HTML tables in message ${containerIndex}`);
      
      htmlTables.forEach(table => {
        if (table.rows.length > 0 && !processedElements.has(table as HTMLElement)) {
          logger.debug(`Adding HTML table from message ${containerIndex}`);
          elements.push(table as HTMLElement);
          processedElements.add(table as HTMLElement);
        }
      });
      
      // Find markdown tables in code blocks
      const codeBlocks = messageElement.querySelectorAll('pre, code');
      logger.debug(`Found ${codeBlocks.length} code blocks in message ${containerIndex}`);
      
      codeBlocks.forEach(block => {
        const htmlBlock = block as HTMLElement;
        if (processedElements.has(htmlBlock)) {
          return;
        }

        const text = domUtils.getTextContent(htmlBlock);
        // Skip system elements and short content
        if (text.includes('window.__oai') || 
            text.includes('requestAnimationFrame') || 
            text.length < 20) {
          return;
        }

        if (text.includes('|') && text.includes('\n')) {
          const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          const tableLines = lines.filter(line => line.includes('|') && line.split('|').length >= 3);
          
          if (tableLines.length >= 2) {
            logger.debug(`Adding markdown table from code block in message ${containerIndex}`);
            elements.push(htmlBlock);
            processedElements.add(htmlBlock);
          }
        }
      });

      // Find text-based tables in message content
      const textElements = messageElement.querySelectorAll('.markdown p, .markdown div');
      textElements.forEach(element => {
        const htmlElement = element as HTMLElement;
        if (processedElements.has(htmlElement)) {
          return;
        }

        const text = domUtils.getTextContent(htmlElement);
        if (text.length < 20) {
          return;
        }

        // Check if this element is inside an already processed block
        const isInsideProcessed = Array.from(processedElements).some(processed => 
          processed.contains(htmlElement) || htmlElement.contains(processed)
        );

        if (!isInsideProcessed && text.includes('|')) {
          const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          const tableLines = lines.filter(line => line.includes('|') && line.split('|').length >= 3);
          
          if (tableLines.length >= 2) {
            logger.debug(`Adding text table from message ${containerIndex}`);
            elements.push(htmlElement);
            processedElements.add(htmlElement);
          }
        }
      });
    });

    return elements;
  },

  extractChatTitle: (): string => {
    // Try to find the chat title in the navigation
    const titleElement = document.querySelector('nav [class*="ConversationTitle"]');
    if (titleElement) {
      const title = domUtils.getTextContent(titleElement as HTMLElement);
      if (title && title.length > 0) {
        return title;
      }
    }

    // Fallback to the page title
    const pageTitle = document.title.replace(' - ChatGPT', '').trim();
    return pageTitle || 'ChatGPT Conversation';
  }
}; 