// Основные типы для TabXport расширения

export interface TableData {
  id: string;
  headers: string[];
  rows: string[][];
  source: 'chatgpt' | 'claude' | 'gemini' | 'deepseek' | 'other';
  timestamp: number;
  url: string;
  chatTitle?: string; // Название чата для генерации имени файла
}

export interface ExportOptions {
  format: 'xlsx' | 'csv';
  filename?: string;
  includeHeaders: boolean;
  destination: 'download' | 'google-drive';
}

export interface UserSettings {
  defaultFormat: 'xlsx' | 'csv';
  defaultDestination: 'download' | 'google-drive';
  autoExport: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface UserSubscription {
  id: string;
  email: string;
  planType: 'free' | 'pro';
  exportsUsed: number;
  exportsLimit: number;
  validUntil?: string;
}

export interface ExportResult {
  success: boolean;
  filename?: string;
  error?: string;
  downloadUrl?: string;
}

// Типы для различных сообщений
export interface ExportTablePayload {
  tableData: TableData;
  options: ExportOptions;
}

export interface UpdateSettingsPayload {
  settings: UserSettings;
}

export interface CheckSubscriptionPayload {
  userId: string;
}

// Сообщения между content script и background
export interface ChromeMessage {
  type: 'EXPORT_TABLE' | 'GET_SETTINGS' | 'UPDATE_SETTINGS' | 'CHECK_SUBSCRIPTION' | 'REFRESH_TABLES';
  payload?: any;
}

export interface TableDetectionResult {
  element: HTMLElement;
  data: TableData;
  position: { x: number; y: number };
} 