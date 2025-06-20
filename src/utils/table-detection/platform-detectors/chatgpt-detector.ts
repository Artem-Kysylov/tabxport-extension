import { domUtils } from "../common/dom-utils"
import { logger } from "../common/logging"
import { PlatformDetector } from "../types"

/**
 * Detector for ChatGPT platform
 */
export const chatGPTDetector: PlatformDetector = {
  canDetect: (url: string): boolean => {
    return url.includes("chat.openai.com") || url.includes("chatgpt.com")
  },

  findTables: (): HTMLElement[] => {
    logger.debug("Searching for tables in ChatGPT interface")
    console.log("TabXport ChatGPT: Starting table search")

    const elements: HTMLElement[] = []
    const processedElements = new Set<HTMLElement>()

    // Find messages from the assistant - try multiple selectors
    let messageContainers = document.querySelectorAll(
      '[data-message-author-role="assistant"]'
    )
    console.log(
      `TabXport ChatGPT: Found ${messageContainers.length} messages with data-message-author-role="assistant"`
    )

    // Fallback selectors if the main one doesn't work
    if (messageContainers.length === 0) {
      console.log("TabXport ChatGPT: Trying fallback selectors...")

      // Try other possible selectors
      const fallbackSelectors = [
        "[data-message-id]", // ChatGPT sometimes uses message IDs
        '.message[data-message-author-role="assistant"]',
        '[class*="message"]:has([class*="assistant"])',
        '[class*="assistant"] [class*="message"]',
        ".prose", // Common class for message content
        '[class*="prose"]',
        '[class*="conversation"] [class*="response"]',
        '[class*="ai-message"]',
        '[class*="bot-message"]',
        ".markdown",
        '[class*="markdown"]'
      ]

      for (const selector of fallbackSelectors) {
        try {
          const found = document.querySelectorAll(selector)
          console.log(
            `TabXport ChatGPT: Trying selector "${selector}" - found ${found.length} elements`
          )
          if (found.length > 0) {
            messageContainers = found
            console.log(
              `TabXport ChatGPT: Using fallback selector: ${selector}`
            )
            break
          }
        } catch (error) {
          console.log(`TabXport ChatGPT: Selector "${selector}" failed:`, error)
        }
      }
    }

    // If still no messages found, try to find any elements with tables
    if (messageContainers.length === 0) {
      console.log(
        "TabXport ChatGPT: No message containers found, searching entire page for tables..."
      )

      // Look for any tables on the page
      const allTables = document.querySelectorAll("table")
      console.log(
        `TabXport ChatGPT: Found ${allTables.length} HTML tables on entire page`
      )

      allTables.forEach((table, index) => {
        if (
          table.rows.length > 0 &&
          !processedElements.has(table as HTMLElement)
        ) {
          console.log(
            `TabXport ChatGPT: Adding HTML table ${index} from page scan (${table.rows.length} rows)`
          )
          elements.push(table as HTMLElement)
          processedElements.add(table as HTMLElement)
        }
      })

      // Look for code blocks with table content
      const allCodeBlocks = document.querySelectorAll("pre, code")
      console.log(
        `TabXport ChatGPT: Found ${allCodeBlocks.length} code blocks on entire page`
      )

      allCodeBlocks.forEach((block, index) => {
        const htmlBlock = block as HTMLElement
        if (processedElements.has(htmlBlock)) {
          return
        }

        const text = domUtils.getTextContent(htmlBlock)
        if (
          text.includes("window.__oai") ||
          text.includes("requestAnimationFrame") ||
          text.length < 20
        ) {
          return
        }

        if (text.includes("|") && text.includes("\n")) {
          const lines = text
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
          const tableLines = lines.filter(
            (line) => line.includes("|") && line.split("|").length >= 3
          )

          if (tableLines.length >= 2) {
            console.log(
              `TabXport ChatGPT: Adding markdown table from code block ${index} (${tableLines.length} lines)`
            )
            elements.push(htmlBlock)
            processedElements.add(htmlBlock)
          }
        }
      })

      console.log(
        `TabXport ChatGPT: Page scan complete - found ${elements.length} table elements`
      )
      return elements
    }

    logger.debug(`Found ${messageContainers.length} assistant messages`)
    console.log(
      `TabXport ChatGPT: Found ${messageContainers.length} assistant messages`
    )

    messageContainers.forEach((container, containerIndex) => {
      const messageElement = container as HTMLElement
      logger.debug(`Processing assistant message ${containerIndex}`)
      console.log(`TabXport ChatGPT: Processing message ${containerIndex}`)

      // Find HTML tables in the message
      const htmlTables = messageElement.querySelectorAll("table")
      logger.debug(
        `Found ${htmlTables.length} HTML tables in message ${containerIndex}`
      )
      console.log(
        `TabXport ChatGPT: Found ${htmlTables.length} HTML tables in message ${containerIndex}`
      )

      htmlTables.forEach((table) => {
        if (
          table.rows.length > 0 &&
          !processedElements.has(table as HTMLElement)
        ) {
          logger.debug(`Adding HTML table from message ${containerIndex}`)
          console.log(
            `TabXport ChatGPT: Adding HTML table from message ${containerIndex} (${table.rows.length} rows)`
          )
          elements.push(table as HTMLElement)
          processedElements.add(table as HTMLElement)
        }
      })

      // Find markdown tables in code blocks
      const codeBlocks = messageElement.querySelectorAll("pre, code")
      logger.debug(
        `Found ${codeBlocks.length} code blocks in message ${containerIndex}`
      )
      console.log(
        `TabXport ChatGPT: Found ${codeBlocks.length} code blocks in message ${containerIndex}`
      )

      codeBlocks.forEach((block) => {
        const htmlBlock = block as HTMLElement
        if (processedElements.has(htmlBlock)) {
          return
        }

        const text = domUtils.getTextContent(htmlBlock)
        // Skip system elements and short content
        if (
          text.includes("window.__oai") ||
          text.includes("requestAnimationFrame") ||
          text.length < 20
        ) {
          return
        }

        if (text.includes("|") && text.includes("\n")) {
          const lines = text
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
          const tableLines = lines.filter(
            (line) => line.includes("|") && line.split("|").length >= 3
          )

          if (tableLines.length >= 2) {
            logger.debug(
              `Adding markdown table from code block in message ${containerIndex}`
            )
            console.log(
              `TabXport ChatGPT: Adding markdown table from code block in message ${containerIndex} (${tableLines.length} lines)`
            )
            // Note: Removed attribute setting to avoid React conflicts
            elements.push(htmlBlock)
            processedElements.add(htmlBlock)
          }
        }
      })

      // Find text-based tables in message content
      const textElements = messageElement.querySelectorAll(
        ".markdown p, .markdown div, p, div"
      )
      textElements.forEach((element) => {
        const htmlElement = element as HTMLElement
        if (processedElements.has(htmlElement)) {
          return
        }

        const text = domUtils.getTextContent(htmlElement)
        if (text.length < 20) {
          return
        }

        // Check if this element is inside an already processed block
        const isInsideProcessed = Array.from(processedElements).some(
          (processed) =>
            processed.contains(htmlElement) || htmlElement.contains(processed)
        )

        if (!isInsideProcessed && text.includes("|")) {
          const lines = text
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
          const tableLines = lines.filter(
            (line) => line.includes("|") && line.split("|").length >= 3
          )

          if (tableLines.length >= 2) {
            logger.debug(`Adding text table from message ${containerIndex}`)
            console.log(
              `TabXport ChatGPT: Adding text table from message ${containerIndex} (${tableLines.length} lines)`
            )
            // Note: Removed attribute setting to avoid React conflicts
            elements.push(htmlElement)
            processedElements.add(htmlElement)
          }
        }
      })
    })

    console.log(
      `TabXport ChatGPT: Final result - found ${elements.length} table elements`
    )
    return elements
  },

  extractChatTitle: (): string => {
    // Try to find the chat title in the header
    const titleElement = document.querySelector(
      '[class*="chat-title"], [class*="conversation-title"], h1, h2'
    )
    if (titleElement) {
      const title = domUtils.getTextContent(titleElement as HTMLElement)
      if (title && title.length > 0 && !title.includes("ChatGPT")) {
        return title
      }
    }

    // Fallback to the page title
    const pageTitle = document.title
      .replace(" - ChatGPT", "")
      .replace("ChatGPT", "")
      .trim()
    return pageTitle || "ChatGPT Conversation"
  }
}
