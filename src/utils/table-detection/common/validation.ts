import { ValidationUtils } from '../types';

/**
 * Helper function to check if text contains meaningful content including emojis
 */
const isValidContent = (text: string): boolean => {
  if (!text || text.length === 0) {
    return false;
  }

  // Расширенные диапазоны эмодзи и символов
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]|[\u{FE0F}]/u;
  
  // Проверка на эмодзи
  if (emojiRegex.test(text)) {
    return true;
  }
  
  // Проверка на буквы и цифры (включая кириллицу, китайские символы)
  const alphanumericRegex = /[a-zA-Z0-9\u0400-\u04FF\u4e00-\u9fff]/;
  if (alphanumericRegex.test(text)) {
    return true;
  }
  
  // Проверка на специальные символы валют и знаки
  const specialSymbolsRegex = /[©®™€£¥$¢₽]/;
  if (specialSymbolsRegex.test(text)) {
    return true;
  }
  
  // Проверка на Unicode символы (для случаев типа U+1F60A)
  const unicodeCodeRegex = /U\+[0-9A-F]{4,6}/i;
  if (unicodeCodeRegex.test(text)) {
    return true;
  }
  
  return false;
};

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
      console.debug('TabXport Validation: Failed - no headers or rows');
      return false;
    }

    // Headers must contain meaningful text - УЛУЧШЕНО: более гибкая валидация
    const validHeaders = headers.filter((header, index) => {
      const isValid = header.length > 0 && 
                     !header.includes('Deep Research') &&
                     !header.includes('Canvas') &&
                     isValidContent(header);
      
      if (!isValid) {
        console.debug(`TabXport Validation: Invalid header ${index}: "${header}"`);
      }
      
      return isValid;
    });

    if (validHeaders.length < 1) {
      console.debug('TabXport Validation: Failed - no valid headers');
      console.debug('Original headers:', headers);
      console.debug('Valid headers:', validHeaders);
      return false;
    }

    // УЛУЧШЕНО: Более гибкая проверка количества колонок
    const expectedColumns = headers.length;
    const hasValidRows = rows.every((row, rowIndex) => {
      const isValid = row.length === expectedColumns;
      if (!isValid) {
        console.debug(`TabXport Validation: Row ${rowIndex} has ${row.length} columns, expected ${expectedColumns}`);
      }
      return isValid;
    });
    
    if (!hasValidRows) {
      console.debug('TabXport Validation: Failed - column count mismatch');
      console.debug('Headers count:', headers.length);
      console.debug('Row lengths:', rows.map(row => row.length));
      console.debug('First few rows:', rows.slice(0, 3));
      return false;
    }

    // УЛУЧШЕНО: Проверяем каждую строку на наличие значимых данных
    const validRowsCount = rows.filter((row, rowIndex) => {
      const hasValidData = row.some((cell, cellIndex) => {
        const isValid = cell.length > 0 && isValidContent(cell);
        if (!isValid && cell.length > 0) {
          console.debug(`TabXport Validation: Row ${rowIndex}, Cell ${cellIndex} has invalid content: "${cell}"`);
        }
        return isValid;
      });
      return hasValidData;
    }).length;

    if (validRowsCount === 0) {
      console.debug('TabXport Validation: Failed - no rows with meaningful data');
      console.debug('Total rows:', rows.length);
      console.debug('First few rows:', rows.slice(0, 3));
      return false;
    }

    console.debug(`TabXport Validation: Success - ${headers.length} headers, ${validRowsCount}/${rows.length} valid rows`);
    return true;
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