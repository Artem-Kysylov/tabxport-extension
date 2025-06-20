import { domUtils } from "../common/dom-utils"
import { logger } from "../common/logging"
import { TitleExtractor } from "../types"

/**
 * Title extractor for ChatGPT platform
 */
export const chatGPTTitleExtractor: TitleExtractor = {
  extractTitle: (): string => {
    logger.debug("Extracting title from ChatGPT interface")

    // Try to find the chat title in the navigation
    const navTitleSelectors = [
      '[class*="nav-conversation-title"]',
      '[class*="ConversationTitle"]',
      ".conversation-title",
      ".chat-title",
      "nav .active",
      'nav [aria-current="page"]'
    ]

    for (const selector of navTitleSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        const text = domUtils.getTextContent(element as HTMLElement)
        if (
          text &&
          text.length > 0 &&
          !text.toLowerCase().includes("new chat")
        ) {
          logger.debug("ChatGPT title from navigation:", text)
          return text
        }
      }
    }

    // Try to find in the main header
    const headerSelectors = [
      "main h1",
      '[class*="main-title"]',
      '[class*="chat-title"]',
      '[role="heading"]'
    ]

    for (const selector of headerSelectors) {
      const element = document.querySelector(selector)
      if (element) {
        const text = domUtils.getTextContent(element as HTMLElement)
        if (
          text &&
          text.length > 0 &&
          !text.toLowerCase().includes("chatgpt")
        ) {
          logger.debug("ChatGPT title from header:", text)
          return text
        }
      }
    }

    // Try to get from the first user message
    const firstMessage = document.querySelector(
      '.text-base:first-child, [data-message-author="user"]:first-child'
    )
    if (firstMessage) {
      const text = domUtils.getTextContent(firstMessage as HTMLElement)
      if (text && text.length > 0) {
        const shortTitle = text.substring(0, 50).trim()
        if (shortTitle.length > 5) {
          logger.debug("ChatGPT title from first message:", shortTitle)
          return shortTitle
        }
      }
    }

    // Fallback to page title
    const pageTitle = document.title.replace(" - ChatGPT", "").trim()
    if (pageTitle && pageTitle.length > 0 && pageTitle !== "ChatGPT") {
      logger.debug("ChatGPT title from page title:", pageTitle)
      return pageTitle
    }

    logger.debug("No specific ChatGPT title found, using default")
    return "ChatGPT_Conversation"
  }
}
