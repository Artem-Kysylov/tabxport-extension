import { TableParser } from '../types';
import { logger } from '../common/logging';
import { domUtils } from '../common/dom-utils';
import { validationUtils } from '../common/validation';

/**
 * Parser for text-based tables (pipe-separated or space-aligned)
 */
export const textTableParser: TableParser = {
  canParse: (element: HTMLElement): boolean => {
    if (!domUtils.isVisible(element) || domUtils.isUIElement(element)) {
      return false;
    }

    const text = domUtils.getTextContent(element);
    if (text.length < 20) {
      return false;
    }

    // Skip system elements
    if (text.includes('window.__oai') || text.includes('requestAnimationFrame')) {
      return false;
    }

    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) {
      return false;
    }

    // Check for pipe-separated table
    const pipeLines = lines.filter(line => line.includes('|'));
    if (pipeLines.length >= 2) {
      return true;
    }

    // Check for space/tab-aligned table
    const spaceSeparatedLines = lines.filter(line => 
      line.split(/\s{2,}|\t/).length >= 2 && !line.includes('|')
    );
    return spaceSeparatedLines.length >= 2;
  },

  parse: (element: HTMLElement): { headers: string[]; rows: string[][] } | null => {
    const text = domUtils.getTextContent(element);
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    logger.debug('Analyzing text content for tables, length:', text.length);
    logger.debug('Total non-empty lines:', lines.length);

    // Try pipe-separated format first
    const pipeLines = lines.filter(line => line.includes('|'));
    logger.debug('Lines with pipe separators:', pipeLines.length);

    if (pipeLines.length >= 2) {
      return parsePipeTable(pipeLines);
    }

    // Try space-separated format
    const spaceSeparatedLines = lines.filter(line => 
      line.split(/\s{2,}|\t/).length >= 2 && !line.includes('|')
    );

    if (spaceSeparatedLines.length >= 2) {
      return parseSpaceTable(spaceSeparatedLines);
    }

    logger.warn('No valid table structure found in text content');
    return null;
  }
};

/**
 * Helper function to parse pipe-separated tables
 */
function parsePipeTable(lines: string[]): { headers: string[]; rows: string[][] } | null {
  const headers: string[] = [];
  const rows: string[][] = [];

  // Parse header cells - handle markdown table format with optional leading/trailing pipes
  let headerLine = lines[0].trim();
  
  // Remove leading and trailing pipes if present (markdown format)
  if (headerLine.startsWith('|') && headerLine.endsWith('|')) {
    headerLine = headerLine.slice(1, -1);
  }
  
  const headerCells = headerLine
    .split('|')
    .map(cell => cell.trim());

  if (headerCells.length < 2) {
    logger.warn('Not enough header cells in pipe table');
    return null;
  }

  headers.push(...headerCells);
  logger.debug('Found', headers.length, 'header cells');

  // Skip separator line if present
  let startIndex = 1;
  if (lines[1] && lines[1].includes('---')) {
    startIndex = 2;
    logger.debug('Skipping separator line');
  }

  // Parse data rows
  for (let i = startIndex; i < lines.length; i++) {
    let dataLine = lines[i].trim();
    
    // Remove leading and trailing pipes if present (markdown format)
    if (dataLine.startsWith('|') && dataLine.endsWith('|')) {
      dataLine = dataLine.slice(1, -1);
    }
    
    const cells = dataLine
      .split('|')
      .map(cell => cell.trim());

    // Ensure row has the same number of cells as headers
    const normalizedRow = [...cells];
    while (normalizedRow.length < headers.length) {
      normalizedRow.push('');
    }
    if (normalizedRow.length > headers.length) {
      normalizedRow.splice(headers.length);
    }
    
    rows.push(normalizedRow);
    logger.debug(`Parsed row ${i + 1} with ${normalizedRow.length} cells`);
  }

  // Validate and sanitize
  if (!validationUtils.isValidTableData(headers, rows)) {
    logger.warn('Invalid data in pipe-separated table');
    return null;
  }

  return validationUtils.sanitizeTableData(headers, rows);
}

/**
 * Helper function to parse space/tab-separated tables
 */
function parseSpaceTable(lines: string[]): { headers: string[]; rows: string[][] } | null {
  const headers: string[] = [];
  const rows: string[][] = [];

  logger.debug('Parsing space-separated table');

  // Parse headers from first line
  headers.push(...lines[0].split(/\s{2,}|\t/).map(cell => cell.trim()));
  if (headers.length < 2) {
    logger.warn('Not enough header cells in space-separated table');
    return null;
  }

  // Parse data rows
  lines.slice(1).forEach((line, index) => {
    const cells = line.split(/\s{2,}|\t/).map(cell => cell.trim());
    if (cells.length === headers.length) {
      rows.push(cells);
      logger.debug(`Parsed row ${index + 1} with ${cells.length} cells`);
    } else {
      logger.warn(`Row ${index + 1} has incorrect number of cells:`, cells.length, 'expected:', headers.length);
    }
  });

  // Validate and sanitize
  if (!validationUtils.isValidTableData(headers, rows)) {
    logger.warn('Invalid data in space-separated table');
    return null;
  }

  return validationUtils.sanitizeTableData(headers, rows);
} 