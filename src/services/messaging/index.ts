import type { ChromeMessage, ChromeMessageType } from '../../types';
import { ExportService } from '../export';
import { SettingsService } from '../settings';
import { SubscriptionService } from '../subscription';

export class MessagingService {
  private exportService: ExportService;
  private settingsService: SettingsService;
  private subscriptionService: SubscriptionService;

  constructor() {
    console.log('MessagingService: Initializing services...');
    this.exportService = new ExportService();
    this.settingsService = new SettingsService();
    this.subscriptionService = new SubscriptionService();
    console.log('MessagingService: Services initialized');
  }

  public async handleMessage(
    message: ChromeMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): Promise<void> {
    console.log('MessagingService: Received message:', message.type);
    
    try {
      switch (message.type) {
        case 'EXPORT_TABLE': {
          console.log('MessagingService: Processing EXPORT_TABLE message');
          console.log('MessagingService: Table data:', message.payload.tableData);
          console.log('MessagingService: Export options:', message.payload.options);
          
          const exportResult = await this.exportService.exportTable(
            message.payload.tableData,
            message.payload.options
          );
          
          console.log('MessagingService: Export result:', exportResult);
          sendResponse(exportResult);
          break;
        }

        case 'GET_SETTINGS': {
          console.log('MessagingService: Processing GET_SETTINGS message');
          const settings = await this.settingsService.getSettings();
          console.log('MessagingService: Settings retrieved:', settings);
          sendResponse({ success: true, settings });
          break;
        }

        case 'UPDATE_SETTINGS': {
          console.log('MessagingService: Processing UPDATE_SETTINGS message');
          await this.settingsService.updateSettings(message.payload.settings);
          console.log('MessagingService: Settings updated');
          sendResponse({ success: true });
          break;
        }

        case 'CHECK_SUBSCRIPTION': {
          console.log('MessagingService: Processing CHECK_SUBSCRIPTION message');
          const subscription = await this.subscriptionService.checkSubscription(
            message.payload.userId
          );
          console.log('MessagingService: Subscription status:', subscription);
          sendResponse({ success: true, subscription });
          break;
        }

        case 'REFRESH_TABLES': {
          console.log('MessagingService: Processing REFRESH_TABLES message');
          sendResponse({ success: true });
          break;
        }

        default: {
          const _exhaustiveCheck: never = message;
          console.error('MessagingService: Unknown message type');
          sendResponse({ success: false, error: 'Unknown message type' });
        }
      }
    } catch (error) {
      console.error('MessagingService: Error handling message:', error);
      console.error('MessagingService: Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }
} 