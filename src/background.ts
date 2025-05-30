import { exportTable, validateTableData, cleanTableData } from './lib/export';
import { getUserSettings, getUserSubscription, saveLastExportTime } from './lib/storage';
import type { ChromeMessage, TableData, ExportOptions, ExportResult } from './types';
import { MessagingService } from './services/messaging';

const messagingService = new MessagingService();

// Обработчик сообщений от content scripts
chrome.runtime.onMessage.addListener((
  message: ChromeMessage,
  sender,
  sendResponse
) => {
  console.log('Background: Received message', message.type);
  
  // Передаем обработку сообщения в MessagingService
  messagingService.handleMessage(message, sender, sendResponse);
  return true; // Указывает, что ответ будет асинхронным
});

// Обработка экспорта таблицы
const handleTableExport = async (
  payload: { tableData: TableData; options: ExportOptions },
  sendResponse: (response: any) => void
): Promise<void> => {
  try {
    console.log('Background: Starting table export with payload:', payload);
    const { tableData, options } = payload;

    // Валидация данных таблицы
    console.log('Background: Validating table data...');
    if (!validateTableData(tableData)) {
      console.error('Background: Invalid table data');
      sendResponse({
        success: false,
        error: 'Invalid table data',
      });
      return;
    }

    // Проверка подписки пользователя
    console.log('Background: Checking user subscription...');
    const subscription = await getUserSubscription();
    console.log('Background: User subscription:', subscription);
    
    if (subscription && subscription.planType === 'free') {
      if (subscription.exportsUsed >= subscription.exportsLimit) {
        console.error('Background: Export limit reached');
        sendResponse({
          success: false,
          error: 'Export limit reached. Please upgrade to Pro.',
        });
        return;
      }
    }

    // Очистка данных таблицы
    console.log('Background: Cleaning table data...');
    const cleanedTableData = cleanTableData(tableData);
    console.log('Background: Cleaned table data:', cleanedTableData);

    // Экспорт таблицы
    console.log('Background: Starting export with options:', options);
    const result: ExportResult = await exportTable(cleanedTableData, options);
    console.log('Background: Export result:', result);

    if (result.success && result.downloadUrl) {
      // Скачивание файла через Chrome Downloads API
      console.log('Background: Starting download...');
      const downloadId = await chrome.downloads.download({
        url: result.downloadUrl,
        filename: result.filename,
        saveAs: false,
      });
      console.log('Background: Download started with ID:', downloadId);

      // Сохранение времени последнего экспорта
      await saveLastExportTime();

      // Обновление счетчика экспортов для Free пользователей
      if (subscription && subscription.planType === 'free') {
        // TODO: Обновить счетчик в Supabase
      }

      sendResponse({
        success: true,
        filename: result.filename,
        downloadId,
      });

      // Показ уведомления
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon-48.png',
        title: 'TabXport',
        message: `Table exported as ${result.filename}`,
      });
    } else {
      console.error('Background: Export failed:', result.error);
      sendResponse({
        success: false,
        error: result.error || 'Export failed',
      });
    }
  } catch (error) {
    console.error('Background: Export error:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Получение настроек пользователя
const handleGetSettings = async (sendResponse: (response: any) => void): Promise<void> => {
  try {
    const settings = await getUserSettings();
    sendResponse({ success: true, settings });
  } catch (error) {
    console.error('Get settings error:', error);
    sendResponse({
      success: false,
      error: 'Failed to get settings',
    });
  }
};

// Обновление настроек пользователя
const handleUpdateSettings = async (
  payload: any,
  sendResponse: (response: any) => void
): Promise<void> => {
  try {
    // TODO: Implement settings update
    sendResponse({ success: true });
  } catch (error) {
    console.error('Update settings error:', error);
    sendResponse({
      success: false,
      error: 'Failed to update settings',
    });
  }
};

// Проверка подписки пользователя
const handleCheckSubscription = async (sendResponse: (response: any) => void): Promise<void> => {
  try {
    const subscription = await getUserSubscription();
    sendResponse({ success: true, subscription });
  } catch (error) {
    console.error('Check subscription error:', error);
    sendResponse({
      success: false,
      error: 'Failed to check subscription',
    });
  }
};

// Обработчик установки расширения
chrome.runtime.onInstalled.addListener((details) => {
  console.log('TabXport: Extension installed', details.reason);
  
  if (details.reason === 'install') {
    // Показ welcome уведомления
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon-48.png',
      title: 'TabXport Installed!',
      message: 'Start exporting tables from AI chats to Excel/CSV',
    });
  }
});

// Обработчик ошибок скачивания
chrome.downloads.onChanged.addListener((downloadDelta) => {
  if (downloadDelta.error) {
    console.error('Download error:', downloadDelta.error);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon-48.png',
      title: 'TabXport Error',
      message: 'Failed to download exported file',
    });
  }
});

console.log('TabXport: Background script loaded');
