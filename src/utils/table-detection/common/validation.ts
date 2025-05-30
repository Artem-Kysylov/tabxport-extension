import { ValidationUtils } from '../types';

/**
 * Utilities for validating and sanitizing table data
 */
export const validationUtils: ValidationUtils = {
  /**
   * Validates table headers and rows
   */
  isValidTableData: (headers: string[], rows: string[][]): boolean => {
    // Must have at least one header and one row
    if (headers.length === 0 || rows.length === 0) {
      return false;
    }

    // Headers must contain meaningful text
    const validHeaders = headers.filter(header => 
      header.length > 1 && 
      !header.includes('Deep Research') &&
      !header.includes('Canvas') &&
      !/^[^\w]*$/.test(header) // Not just symbols
    );

    if (validHeaders.length < 2) {
      return false;
    }

    // Rows must have the same number of columns as headers
    const hasValidRows = rows.every(row => row.length === headers.length);
    if (!hasValidRows) {
      return false;
    }

    // At least one row must contain meaningful data
    const hasValidData = rows.some(row =>
      row.some(cell => cell.length > 1 && !/^[^\w]*$/.test(cell))
    );

    return hasValidData;
  },

  /**
   * Validates a chat title
   */
  isValidChatTitle: (title: string): boolean => {
    if (!title || title.length < 3) {
      return false;
    }

    const lowerTitle = title.toLowerCase();
    return !lowerTitle.includes('chat') &&
           !lowerTitle.includes('conversation') &&
           !lowerTitle.includes('assistant') &&
           !lowerTitle.includes('ai') &&
           !lowerTitle.includes('对话') &&
           !lowerTitle.includes('新建') &&
           !lowerTitle.includes('menu') &&
           !lowerTitle.includes('settings') &&
           !lowerTitle.includes('welcome') &&
           !lowerTitle.includes('hello') &&
           !lowerTitle.includes('untitled');
  },

  /**
   * Sanitizes table data by normalizing headers and rows
   */
  sanitizeTableData: (headers: string[], rows: string[][]): { headers: string[]; rows: string[][] } => {
    // Normalize headers
    const cleanHeaders = headers.map(header => header.trim());

    // Normalize rows
    const cleanRows = rows.map(row => {
      // Ensure row has correct number of columns
      const normalizedRow = [...row];
      while (normalizedRow.length < cleanHeaders.length) {
        normalizedRow.push('');
      }
      if (normalizedRow.length > cleanHeaders.length) {
        normalizedRow.splice(cleanHeaders.length);
      }
      return normalizedRow.map(cell => cell.trim());
    });

    return { headers: cleanHeaders, rows: cleanRows };
  }
}; 