import { TableParser } from '../types';
import { logger } from '../common/logging';
import { domUtils } from '../common/dom-utils';
import { validationUtils } from '../common/validation';

/**
 * Parser for markdown tables in pre/code blocks
 */
export const markdownTableParser: TableParser = {
  canParse: (element: HTMLElement): boolean => {
    if (!domUtils.isVisible(element) || domUtils.isUIElement(element)) {
      return false;
    }

    const tagName = element.tagName.toLowerCase();
    if (tagName !== 'pre' && tagName !== 'code') {
      return false;
    }

    const text = domUtils.getTextContent(element);
    // Check for markdown table pattern: |---|---|
    const hasTablePattern = /\|.*\|.*\n.*\|.*---.*\|/.test(text);
    return hasTablePattern;
  },

  parse: (element: HTMLElement): { headers: string[]; rows: string[][] } | null => {
    const text = domUtils.getTextContent(element);
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length < 2) {
      logger.warn('Not enough lines for a markdown table');
      return null;
    }

    logger.debug('Parsing markdown table with', lines.length, 'lines');

    const headers: string[] = [];
    const rows: string[][] = [];

    // Parse header line
    const headerLine = lines[0];
    if (!headerLine.startsWith('|') || !headerLine.endsWith('|')) {
      logger.warn('Invalid header line format in markdown table');
      return null;
    }

    const headerCells = headerLine
      .slice(1, -1) // Remove outer pipes
      .split('|')
      .map(cell => cell.trim());

    headers.push(...headerCells);
    logger.debug('Found', headers.length, 'header cells');

    // Skip separator line (usually second line with |---|---|)
    let startIndex = 1;
    if (lines[1] && lines[1].includes('---')) {
      startIndex = 2;
      logger.debug('Skipping separator line');
    }

    // Parse data rows
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line.startsWith('|') || !line.endsWith('|')) {
        logger.warn(`Skipping invalid row format at line ${i + 1}`);
        continue;
      }

      const cells = line
        .slice(1, -1) // Remove outer pipes
        .split('|')
        .map(cell => cell.trim());

      if (cells.length === headers.length) {
        rows.push(cells);
        logger.debug(`Parsed row ${i + 1} with ${cells.length} cells`);
      } else {
        logger.warn(`Row ${i + 1} has incorrect number of cells:`, cells.length, 'expected:', headers.length);
      }
    }

    // Validate and sanitize the extracted data
    if (!validationUtils.isValidTableData(headers, rows)) {
      logger.warn('Invalid table data extracted from markdown table');
      return null;
    }

    const sanitizedData = validationUtils.sanitizeTableData(headers, rows);
    logger.debug('Markdown table parsing complete - Headers:', sanitizedData.headers.length, 'Data rows:', sanitizedData.rows.length);

    return sanitizedData;
  }
}; 