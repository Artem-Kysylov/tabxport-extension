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
    
    // First find all HTML tables on the page with special handling for large tables
    const allHTMLTables = document.querySelectorAll('table');
    logger.debug(`Found ${allHTMLTables.length} total HTML tables on page`);
    
    allHTMLTables.forEach((table, index) => {
      const htmlTable = table as HTMLElement;
      logger.debug(`Checking HTML table ${index}`);
      logger.debug(`Table rows: ${(table as HTMLTableElement).rows.length}`);
      logger.debug(`Table visible: ${htmlTable.offsetParent !== null}`);
      
      const rect = htmlTable.getBoundingClientRect();
      const isLargeTable = rect.height > 300 || rect.width > 600 || (table as HTMLTableElement).rows.length > 10;
      const isVeryWideTable = rect.width > window.innerWidth * 0.8 || rect.right > window.innerWidth - 60;
      
      logger.debug(`Table ${index} is large: ${isLargeTable} (${rect.width}x${rect.height}, ${(table as HTMLTableElement).rows.length} rows)`);
      logger.debug(`Table ${index} is very wide: ${isVeryWideTable} (causes horizontal scroll)`);
      
      if ((table as HTMLTableElement).rows.length > 0 && htmlTable.offsetParent !== null) {
        logger.debug(`Adding HTML table ${index} directly`);
        
        // For large tables, add special data attributes for better positioning
        if (isLargeTable) {
          htmlTable.setAttribute('data-tabxport-large-table', 'true');
          htmlTable.setAttribute('data-tabxport-table-size', `${rect.width}x${rect.height}`);
          
          // Mark very wide tables that cause horizontal scrolling
          if (isVeryWideTable) {
            htmlTable.setAttribute('data-tabxport-very-wide', 'true');
            logger.debug(`Table ${index} marked as very wide`);
          }
          
          // Check if table is scrollable
          const isScrollable = htmlTable.scrollHeight > htmlTable.clientHeight || 
                              htmlTable.scrollWidth > htmlTable.clientWidth ||
                              getComputedStyle(htmlTable).overflow !== 'visible' ||
                              getComputedStyle(htmlTable).overflowX !== 'visible' ||
                              getComputedStyle(htmlTable).overflowY !== 'visible';
          
          if (isScrollable) {
            htmlTable.setAttribute('data-tabxport-scrollable', 'true');
            logger.debug(`Table ${index} is scrollable`);
          }
        }
        
        elements.push(htmlTable);
        processedElements.add(htmlTable);
      }
    });
    
    // Find message containers with improved large table detection
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
              
              // Check if this is a large markdown table
              const rect = htmlBlock.getBoundingClientRect();
              const isLargeTable = rect.height > 300 || rect.width > 600 || tableLines.length > 10;
              const isVeryWideTable = rect.width > window.innerWidth * 0.8 || rect.right > window.innerWidth - 60;
              
              if (isLargeTable) {
                htmlBlock.setAttribute('data-tabxport-large-table', 'true');
                htmlBlock.setAttribute('data-tabxport-table-type', 'markdown');
                logger.debug(`Large markdown table detected in block ${blockIndex}`);
                
                if (isVeryWideTable) {
                  htmlBlock.setAttribute('data-tabxport-very-wide', 'true');
                  logger.debug(`Very wide markdown table detected in block ${blockIndex}`);
                }
              }
              
              elements.push(htmlBlock);
              processedElements.add(htmlBlock);
            }
          }
        }
      });
      
      // Find div tables in responses with large table detection
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
            
            // Check if this is a large div table
            const rect = htmlDiv.getBoundingClientRect();
            const isLargeTable = rect.height > 300 || rect.width > 600 || children.length > 6;
            const isVeryWideTable = rect.width > window.innerWidth * 0.8 || rect.right > window.innerWidth - 60;
            
            if (isLargeTable) {
              htmlDiv.setAttribute('data-tabxport-large-table', 'true');
              htmlDiv.setAttribute('data-tabxport-table-type', 'div');
              logger.debug(`Large div table detected: ${divIndex}`);
              
              if (isVeryWideTable) {
                htmlDiv.setAttribute('data-tabxport-very-wide', 'true');
                logger.debug(`Very wide div table detected: ${divIndex}`);
              }
            }
            
            elements.push(htmlDiv);
            processedElements.add(htmlDiv);
          }
        }
      });
      
      // Find text-based tables with large table detection
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
              
              // Check if this is a large text table
              const rect = htmlElement.getBoundingClientRect();
              const isLargeTable = rect.height > 300 || rect.width > 600 || tableLines.length > 10;
              const isVeryWideTable = rect.width > window.innerWidth * 0.8 || rect.right > window.innerWidth - 60;
              
              if (isLargeTable) {
                htmlElement.setAttribute('data-tabxport-large-table', 'true');
                htmlElement.setAttribute('data-tabxport-table-type', 'text');
                logger.debug(`Large text table detected: ${elementIndex}`);
                
                if (isVeryWideTable) {
                  htmlElement.setAttribute('data-tabxport-very-wide', 'true');
                  logger.debug(`Very wide text table detected: ${elementIndex}`);
                }
              }
              
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