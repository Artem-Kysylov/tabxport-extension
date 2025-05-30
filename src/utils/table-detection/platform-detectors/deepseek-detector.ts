import { PlatformDetector } from '../types';
import { logger } from '../common/logging';
import { domUtils } from '../common/dom-utils';

/**
 * Detector for DeepSeek platform
 */
export const deepseekDetector: PlatformDetector = {
  canDetect: (url: string): boolean => {
    return url.includes('chat.deepseek.com') || url.includes('deepseek.com');
  },

  findTables: (): HTMLElement[] => {
    logger.debug('Searching for tables in DeepSeek interface');
    
    const elements: HTMLElement[] = [];
    const processedElements = new Set<HTMLElement>();
    
    // First find all HTML tables on the page
    const allHTMLTables = document.querySelectorAll('table');
    logger.debug(`Found ${allHTMLTables.length} total HTML tables on page`);
    
    allHTMLTables.forEach((table, index) => {
      const htmlTable = table as HTMLElement;
      logger.debug(`Checking HTML table ${index}`);
      logger.debug(`Table rows: ${(table as HTMLTableElement).rows.length}`);
      logger.debug(`Table visible: ${htmlTable.offsetParent !== null}`);
      
      if ((table as HTMLTableElement).rows.length > 0 && htmlTable.offsetParent !== null) {
        logger.debug(`Adding HTML table ${index} directly`);
        elements.push(htmlTable);
        processedElements.add(htmlTable);
      }
    });
    
    // Find message containers
    const messageContainers = document.querySelectorAll(
      '.message, .chat-message, .response, .assistant-message, [class*="message"], [class*="response"]'
    );
    logger.debug(`Found ${messageContainers.length} message containers in DeepSeek`);
    
    messageContainers.forEach((container, containerIndex) => {
      const messageElement = container as HTMLElement;
      logger.debug(`Processing message container ${containerIndex}`);
      
      // Find code blocks that might contain markdown tables
      const codeBlocks = messageElement.querySelectorAll('pre, code');
      logger.debug(`Found ${codeBlocks.length} code blocks in message ${containerIndex}`);
      
      codeBlocks.forEach((block, blockIndex) => {
        const htmlBlock = block as HTMLElement;
        if (processedElements.has(htmlBlock)) {
          return;
        }
        
        const blockText = domUtils.getTextContent(htmlBlock);
        if (blockText.includes('|') && blockText.includes('\n') && blockText.split('\n').length >= 3) {
          const lines = blockText.split('\n').filter(line => line.trim().length > 0);
          const tableLines = lines.filter(line => line.includes('|') && line.split('|').length >= 3);
          
          if (tableLines.length >= 2) {
            logger.debug(`Found markdown table in code block ${blockIndex} of message ${containerIndex}`);
            // Additional validation for markdown tables
            const validLines = tableLines.filter(line => {
              const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
              return cells.length >= 2 && cells.some(cell => cell.length > 1);
            });
            
            if (validLines.length >= 2) {
              logger.debug(`Adding markdown table ${blockIndex} from message ${containerIndex}`);
              elements.push(htmlBlock);
              processedElements.add(htmlBlock);
            }
          }
        }
      });
      
      // Find div tables in responses
      const contentDivs = messageElement.querySelectorAll('div, .content, .message-content, [class*="content"]');
      contentDivs.forEach((div, divIndex) => {
        const htmlDiv = div as HTMLElement;
        
        // Skip UI elements
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
        
        // Check for table-like structure
        const children = htmlDiv.children;
        if (children.length >= 2 && children.length <= 10) { // Reasonable number of columns
          const hasValidStructure = Array.from(children).some(child => {
            const text = domUtils.getTextContent(child as HTMLElement);
            return text.length > 1 && !/^[^\w]*$/.test(text); // Not just symbols
          });
          
          if (hasValidStructure && !processedElements.has(htmlDiv)) {
            logger.debug(`Adding div table ${divIndex} from message ${containerIndex}`);
            elements.push(htmlDiv);
            processedElements.add(htmlDiv);
          }
        }
      });
      
      // Find text-based tables
      const textElements = messageElement.querySelectorAll('p, div, span');
      textElements.forEach((element, elementIndex) => {
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
            // Additional validation for text tables
            const validLines = tableLines.filter(line => {
              const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0);
              return cells.length >= 2 && cells.some(cell => cell.length > 1);
            });
            
            if (validLines.length >= 2) {
              logger.debug(`Adding text table element ${elementIndex} from message ${containerIndex}`);
              elements.push(htmlElement);
              processedElements.add(htmlElement);
            }
          }
        }
      });
    });

    return elements;
  },

  extractChatTitle: (): string => {
    // Try to find the chat title in the header
    const titleElement = document.querySelector('.chat-title, .conversation-title, h1.title');
    if (titleElement) {
      const title = domUtils.getTextContent(titleElement as HTMLElement);
      if (title && title.length > 0) {
        return title;
      }
    }

    // Fallback to the page title
    const pageTitle = document.title.replace(' - DeepSeek', '').trim();
    return pageTitle || 'DeepSeek Conversation';
  }
}; 