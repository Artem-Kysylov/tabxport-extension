import type { ChromeMessage } from "../../types"
import { ChromeMessageType } from "../../types"
import { ExportService } from "../export"
import { SettingsService } from "../settings"
import { SubscriptionService } from "../subscription"

export class MessagingService {
  private exportService: ExportService
  private settingsService: SettingsService
  private subscriptionService: SubscriptionService

  constructor() {
    this.exportService = new ExportService()
    this.settingsService = new SettingsService()
    this.subscriptionService = new SubscriptionService()
  }

  public async handleMessage(
    message: ChromeMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      switch (message.type) {
        case ChromeMessageType.EXPORT_TABLE: {
          const exportResult = await this.exportService.exportTable(
            message.payload.tableData,
            message.payload.options
          )
          sendResponse(exportResult)
          break
        }

        case ChromeMessageType.GET_SETTINGS: {
          const settings = await this.settingsService.getSettings()
          sendResponse({ success: true, settings })
          break
        }

        case ChromeMessageType.UPDATE_SETTINGS: {
          await this.settingsService.updateSettings(message.payload.settings)
          sendResponse({ success: true })
          break
        }

        case ChromeMessageType.CHECK_SUBSCRIPTION: {
          const subscription = await this.subscriptionService.checkSubscription(
            message.payload.userId
          )
          sendResponse({ success: true, subscription })
          break
        }

        case ChromeMessageType.REFRESH_TABLES: {
          sendResponse({ success: true })
          break
        }

        default: {
          console.error("MessagingService: Unknown message type")
          sendResponse({ success: false, error: "Unknown message type" })
        }
      }
    } catch (error) {
      console.error("MessagingService: Error handling message:", error)
      console.error(
        "MessagingService: Stack trace:",
        error instanceof Error ? error.stack : "No stack trace"
      )
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      })
    }
  }
}
