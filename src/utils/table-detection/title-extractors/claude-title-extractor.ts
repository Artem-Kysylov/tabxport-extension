import { domUtils } from "../common/dom-utils"
import { logger } from "../common/logging"
import { TitleExtractor } from "../types"

/**
 * Title extractor for Claude platform
 */
export const claudeTitleExtractor: TitleExtractor = {
  extractTitle: (): string => {
    logger.debug("Extracting title from Claude interface")

    // Try to find the chat title in the header
    const headerSelectors = [
      '[class*="ConversationTitle"]',
      '[class*="chat-title"]',
      ".conversation-title",
      ".chat-title",
      "header h1",
      "header h2",
      '[role="heading"]'
    ]

    for (const selector of headerSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        const text = domUtils.getTextContent(element as HTMLElement)
        if (text && text.length > 0 && !text.toLowerCase().includes("claude")) {
          logger.debug("Claude title from header:", text)
          return text
        }
      }
    }

    // Try to find in the sidebar
    const sidebarSelectors = [
      ".sidebar .active",
      ".chat-list .selected",
      '[aria-current="page"]',
      ".conversation-item.active"
    ]

    for (const selector of sidebarSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        const text = domUtils.getTextContent(element as HTMLElement)
        if (
          text &&
          text.length > 0 &&
          !text.toLowerCase().includes("new chat")
        ) {
          logger.debug("Claude title from sidebar:", text)
          return text
        }
      }
    }

    // Try to get from the first user message
    const firstMessage = document.querySelector(
      ".user-message:first-child, .human-message:first-child"
    )
    if (firstMessage) {
      const text = domUtils.getTextContent(firstMessage as HTMLElement)
      if (text && text.length > 0) {
        const shortTitle = text.substring(0, 50).trim()
        if (shortTitle.length > 5) {
          logger.debug("Claude title from first message:", shortTitle)
          return shortTitle
        }
      }
    }

    // Fallback to page title
    const pageTitle = document.title.replace(" - Claude", "").trim()
    if (pageTitle && pageTitle.length > 0 && pageTitle !== "Claude") {
      logger.debug("Claude title from page title:", pageTitle)
      return pageTitle
    }

    logger.debug("No specific Claude title found, using default")
    return "Claude_Conversation"
  }
}
