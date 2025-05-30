import type { ChromeMessage, ChromeMessageType } from '../../types';
import { ExportService } from '../export';
import { SettingsService } from '../settings';
import { SubscriptionService } from '../subscription';

export class MessagingService {
  private exportService: ExportService;
  private settingsService: SettingsService;
  private subscriptionService: SubscriptionService;

  constructor() {
    this.exportService = new ExportService();
    this.settingsService = new SettingsService();
    this.subscriptionService = new SubscriptionService();
  }

  public async handleMessage(
    message: ChromeMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): Promise<void> {
    console.log('Handling message:', message.type);

    try {
      switch (message.type) {
        case 'EXPORT_TABLE': {
          const exportResult = await this.exportService.exportTable(
            message.payload.tableData,
            message.payload.options
          );
          sendResponse(exportResult);
          break;
        }

        case 'GET_SETTINGS': {
          const settings = await this.settingsService.getSettings();
          sendResponse({ success: true, settings });
          break;
        }

        case 'UPDATE_SETTINGS': {
          await this.settingsService.updateSettings(message.payload.settings);
          sendResponse({ success: true });
          break;
        }

        case 'CHECK_SUBSCRIPTION': {
          const subscription = await this.subscriptionService.checkSubscription(
            message.payload.userId
          );
          sendResponse({ success: true, subscription });
          break;
        }

        case 'REFRESH_TABLES': {
          sendResponse({ success: true });
          break;
        }

        default: {
          const _exhaustiveCheck: never = message;
          console.error('Unknown message type');
          sendResponse({ success: false, error: 'Unknown message type' });
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }
} 