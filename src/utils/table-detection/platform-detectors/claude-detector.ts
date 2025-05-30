import { PlatformDetector } from '../types';
import { logger } from '../common/logging';
import { domUtils } from '../common/dom-utils';

/**
 * Detector for Claude platform
 */
export const claudeDetector: PlatformDetector = {
  canDetect: (url: string): boolean => {
    return url.includes('claude.ai');
  },

  findTables: (): HTMLElement[] => {
    logger.debug('Searching for tables in Claude interface');
    
    const elements: HTMLElement[] = [];
    const processedElements = new Set<HTMLElement>();
    const processedTableContent = new Set<string>();
    
    // Find all Claude messages
    const allMessages = document.querySelectorAll('.prose, .message-content, [class*="message-content"]');
    logger.debug(`Found ${allMessages.length} Claude messages`);

    allMessages.forEach((message, messageIndex) => {
      const messageElement = message as HTMLElement;
      logger.debug(`Processing Claude message ${messageIndex}`);
      
      // Find HTML tables in the message
      const htmlTables = messageElement.querySelectorAll('table');
      logger.debug(`Found ${htmlTables.length} HTML tables in message ${messageIndex}`);
      
      htmlTables.forEach(table => {
        const htmlTable = table as HTMLElement;
        if (table.rows.length > 0 && !processedElements.has(htmlTable)) {
          logger.debug(`Adding HTML table from message ${messageIndex}`);
          elements.push(htmlTable);
          processedElements.add(htmlTable);
        }
      });
      
      // Find markdown tables in code blocks
      const codeBlocks = messageElement.querySelectorAll('pre, code');
      logger.debug(`Found ${codeBlocks.length} code blocks in message ${messageIndex}`);
      
      codeBlocks.forEach((block, blockIndex) => {
        const htmlBlock = block as HTMLElement;
        const blockText = domUtils.getTextContent(htmlBlock);
        const contentHash = blockText.trim().substring(0, 100);
        
        if (processedElements.has(htmlBlock) || processedTableContent.has(contentHash)) {
          logger.debug(`Skipping already processed code block ${blockIndex}`);
          return;
        }
        
        if (blockText.includes('|') && blockText.includes('\n')) {
          const lines = blockText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          const tableLines = lines.filter(line => line.includes('|') && line.split('|').length >= 3);
          
          if (tableLines.length >= 2) {
            logger.debug(`Adding markdown table from code block ${blockIndex} in message ${messageIndex}`);
            elements.push(htmlBlock);
            processedElements.add(htmlBlock);
            processedTableContent.add(contentHash);
          }
        }
      });
      
      // Find text-based tables in message content
      const textContent = messageElement.textContent || '';
      logger.debug(`Claude message ${messageIndex} text length: ${textContent.length}`);
      
      if (textContent.includes('|') && textContent.split('\n').length > 2) {
        logger.debug(`Message ${messageIndex} contains potential table markers`);
        
        const textElements = messageElement.querySelectorAll('div, p, span');
        logger.debug(`Checking ${textElements.length} text containers in message ${messageIndex}`);
        
        textElements.forEach((element, elementIndex) => {
          const htmlElement = element as HTMLElement;
          const text = domUtils.getTextContent(htmlElement);
          const contentHash = text.trim().substring(0, 100);
          
          if (processedElements.has(htmlElement) || processedTableContent.has(contentHash)) {
            return;
          }
          
          // Filter system elements and short text
          if (text.length < 20) {
            return;
          }
          
          // Check if this element is inside an already processed code block
          const isInsideCodeBlock = Array.from(processedElements).some(processed => 
            processed.contains(htmlElement) || htmlElement.contains(processed)
          );
          
          if (isInsideCodeBlock) {
            logger.debug(`Skipping text element ${elementIndex} - inside code block`);
            return;
          }
          
          const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          const tableLines = lines.filter(line => line.includes('|') && line.split('|').length >= 3);
          
          if (tableLines.length >= 2) {
            // Additional validation for text tables
            const validLines = tableLines.filter(line => {
              const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
              return cells.length >= 2 && cells.some(cell => cell.length > 1);
            });
            
            if (validLines.length >= 2) {
              logger.debug(`Adding text table element ${elementIndex} from message ${messageIndex}`);
              elements.push(htmlElement);
              processedElements.add(htmlElement);
              processedTableContent.add(contentHash);
            }
          }
        });
      }
    });

    return elements;
  },

  extractChatTitle: (): string => {
    // Try to find the chat title in the header
    const titleElement = document.querySelector('[class*="ConversationTitle"], [class*="chat-title"]');
    if (titleElement) {
      const title = domUtils.getTextContent(titleElement as HTMLElement);
      if (title && title.length > 0) {
        return title;
      }
    }

    // Fallback to the page title
    const pageTitle = document.title.replace(' - Claude', '').trim();
    return pageTitle || 'Claude Conversation';
  }
}; 