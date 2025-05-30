/**
 * Core types for table detection functionality
 */

export type AISource = 'chatgpt' | 'claude' | 'gemini' | 'deepseek' | 'other';

export interface TableData {
  id: string;
  headers: string[];
  rows: string[][];
  source: AISource;
  timestamp: number;
  url: string;
  chatTitle: string;
}

export interface TableDetectionResult {
  element: HTMLElement;
  data: TableData;
  position: { x: number; y: number };
}

export interface TableParser {
  canParse: (element: HTMLElement) => boolean;
  parse: (element: HTMLElement) => { headers: string[]; rows: string[][] } | null;
}

export interface PlatformDetector {
  canDetect: (url: string) => boolean;
  findTables: () => HTMLElement[];
  extractChatTitle: () => string;
}

export interface DOMUtils {
  isVisible: (element: HTMLElement) => boolean;
  isUIElement: (element: HTMLElement) => boolean;
  getTextContent: (element: HTMLElement) => string;
  findElements: (selector: string, container?: HTMLElement) => HTMLElement[];
}

export interface ValidationUtils {
  isValidTableData: (headers: string[], rows: string[][]) => boolean;
  isValidChatTitle: (title: string) => boolean;
  sanitizeTableData: (headers: string[], rows: string[][]) => { headers: string[]; rows: string[][] };
}

export interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

/**
 * Interface for platform-specific title extractors
 */
export interface TitleExtractor {
  /**
   * Extracts the chat title from the current page
   * @returns The extracted title or a default value
   */
  extractTitle: () => string;
} 