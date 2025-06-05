import { AISource } from './types';

/**
 * Detects the AI platform source based on the URL
 */
export const detectSource = (url: string): AISource => {
  if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) {
    return 'chatgpt';
  }
  if (url.includes('claude.ai')) {
    return 'claude';
  }
  if (url.includes('gemini.google.com') || url.includes('bard.google.com')) {
    return 'gemini';
  }
  if (url.includes('chat.deepseek.com') || url.includes('deepseek.com')) {
    return 'deepseek';
  }
  return 'other';
};

/**
 * Source detector object for consistent API
 */
export const sourceDetector = {
  detectSource
};

/**
 * Generates a unique ID for a table element
 */
export const generateTableId = (element: HTMLElement): string => {
  const timestamp = Date.now();
  const elementIndex = Array.from(document.querySelectorAll('table, pre, div')).indexOf(element);
  return `table_${timestamp}_${elementIndex}`;
};

/**
 * Cleans and validates a chat title
 */
export const sanitizeChatTitle = (title: string): string => {
  // Remove invalid file name characters
  const cleanTitle = title
    .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 50) // Limit length
    .trim();

  return cleanTitle || 'Chat';
}; 