import type { BatchTableDetectionResult, TableDetectionResult, TableData, AISource } from './types';
import { platformDetectors } from './platform-detectors';
import { logger } from './common/logging';
import { addBatchTables, createTableDetectionResult, createBatchDetectionResult, getBatchTablesCount } from './batch-manager';
import { sourceDetector } from './source-detector';

// Import table parsers
import { htmlTableParser } from './table-parsers/html-parser';
import { markdownTableParser } from './table-parsers/markdown-parser';
import { divTableParser } from './table-parsers/div-parser';
import { textTableParser } from './table-parsers/text-parser';

/**
 * Available table parsers in order of priority
 */
const tableParsers = [
  htmlTableParser,
  markdownTableParser,
  divTableParser,
  textTableParser
];

/**
 * Validates parsed table data
 */
const isValidTableData = (data: { headers: string[]; rows: string[][] }): boolean => {
  // Must have at least 2 headers and 1 row
  if (data.headers.length < 2 || data.rows.length < 1) {
    return false;
  }

  // Headers must not be empty
  if (data.headers.every(header => !header.trim())) {
    return false;
  }

  // At least one row must have meaningful content
  const hasValidRow = data.rows.some(row => 
    row.some(cell => cell.trim().length > 0)
  );

  return hasValidRow;
};

/**
 * Simple hash function for content
 */
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

/**
 * Generates a unique ID for a table element
 */
const generateTableId = (element: HTMLElement): string => {
  // Use element's position, content hash, and timestamp for uniqueness
  const rect = element.getBoundingClientRect();
  const content = element.textContent?.trim() || '';
  const contentHash = simpleHash(content.substring(0, 100));
  
  return `table_${Math.round(rect.left)}_${Math.round(rect.top)}_${contentHash}_${Date.now()}`;
};

/**
 * Parses a single element into TableData
 */
const parseElement = async (element: HTMLElement, source: AISource): Promise<TableData | null> => {
  // Try each parser until one succeeds
  for (const parser of tableParsers) {
    try {
      if (parser.canParse(element)) {
        logger.debug(`Trying parser for element: ${element.tagName}`);
        
        const parseResult = parser.parse(element);
        
        if (parseResult && isValidTableData(parseResult)) {
          // Create TableData object
          const tableData: TableData = {
            id: generateTableId(element),
            headers: parseResult.headers,
            rows: parseResult.rows,
            source,
            timestamp: Date.now(),
            url: window.location.href,
            chatTitle: '' // Will be filled by the detector
          };

          logger.debug(`Successfully parsed table with ${parseResult.headers.length} headers and ${parseResult.rows.length} rows`);
          return tableData;
        }
      }
    } catch (error) {
      logger.warn(`Parser failed for element:`, error);
      continue;
    }
  }

  return null;
};

/**
 * Creates an empty batch result
 */
const createEmptyResult = (source: AISource): BatchTableDetectionResult => {
  return createBatchDetectionResult([], source, '');
};

/**
 * Detects all tables on the current page
 */
export const detectAllTables = async (): Promise<BatchTableDetectionResult> => {
  const currentUrl = window.location.href;
  const source = sourceDetector.detectSource(currentUrl);
  
  logger.debug('Starting batch table detection for source:', source);

  // Find the appropriate platform detector
  const detector = platformDetectors.find(d => d.canDetect(currentUrl));
  
  if (!detector) {
    logger.warn('No suitable platform detector found for URL:', currentUrl);
    return createEmptyResult(source);
  }

  logger.debug('Using platform detector for:', source);

  try {
    // Get all table elements from the platform detector
    const elements = detector.findTables();
    logger.debug(`Platform detector found ${elements.length} potential table elements`);

    // Parse and validate each element
    const tableResults: TableDetectionResult[] = [];
    
    for (const [index, element] of elements.entries()) {
      try {
        const tableData = await parseElement(element, source);
        
        if (tableData) {
          const result = createTableDetectionResult(element, tableData);
          tableResults.push(result);
          logger.debug(`Successfully parsed table ${index + 1}/${elements.length}`);
        } else {
          logger.debug(`Failed to parse table element ${index + 1}/${elements.length}`);
        }
      } catch (error) {
        logger.error(`Error parsing table element ${index + 1}:`, error);
      }
    }

    // Extract chat title
    const chatTitle = detector.extractChatTitle();
    
    // Create batch result
    const batchResult = createBatchDetectionResult(tableResults, source, chatTitle);
    
    // Update batch manager
    addBatchTables(tableResults);
    
    logger.debug(`Batch detection complete: found ${batchResult.count} valid tables`);
    
    return batchResult;

  } catch (error) {
    logger.error('Error during batch table detection:', error);
    return createEmptyResult(source);
  }
};

/**
 * Gets the current batch state
 */
export const getBatchState = (): { count: number; lastDetection: number } => {
  return {
    count: getBatchTablesCount(),
    lastDetection: Date.now()
  };
}; 