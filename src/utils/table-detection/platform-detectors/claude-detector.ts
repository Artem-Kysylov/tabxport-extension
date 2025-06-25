import { domUtils } from "../common/dom-utils"
import { logger } from "../common/logging"
import { PlatformDetector } from "../types"

/**
 * Detector for Claude platform
 */
export const claudeDetector: PlatformDetector = {
  canDetect: (url: string): boolean => {
    return url.includes("claude.ai")
  },

  findTables: (): HTMLElement[] => {
    logger.debug("Searching for tables in Claude interface")
    console.log("TabXport Claude: Starting table search")

    const elements: HTMLElement[] = []
    const processedElements = new Set<HTMLElement>()
    const processedTableContent = new Set<string>()

    // Updated Claude selectors based on current DOM structure
    const messageSelectors = [
      '[data-testid="conversation-turn"]',
      '[class*="message"]',
      '[class*="assistant"]',
      ".prose",
      '[class*="content"]',
      'div[class*="claude-message"]',
      'div[class*="font-claude"]',
      ".message-content",
      '[class*="message-content"]'
    ]

    const allMessages = new Set<HTMLElement>()

    // Collect all potential message containers
    messageSelectors.forEach((selector) => {
      const found = document.querySelectorAll(selector)
      console.log(
        `TabXport Claude: Found ${found.length} elements with selector: ${selector}`
      )
      found.forEach((element) => {
        if (element instanceof HTMLElement) {
          allMessages.add(element)
        }
      })
    })

    logger.debug(`Found ${allMessages.size} unique Claude messages`)
    console.log(
      `TabXport Claude: Found ${allMessages.size} unique Claude messages`
    )

    // If no specific message containers found, scan the entire page
    if (allMessages.size === 0) {
      console.log(
        "TabXport Claude: No message containers found, scanning entire page"
      )
      const mainContent = document.querySelector(
        'main, [role="main"], .chat-container, .conversation'
      )
      if (mainContent) {
        allMessages.add(mainContent as HTMLElement)
      } else {
        allMessages.add(document.body)
      }
    }

    allMessages.forEach((message, messageIndex) => {
      logger.debug(`Processing Claude message ${messageIndex}`)
      console.log(`TabXport Claude: Processing message ${messageIndex}`)

      // Find HTML tables in the message
      const htmlTables = message.querySelectorAll("table")
      logger.debug(
        `Found ${htmlTables.length} HTML tables in message ${messageIndex}`
      )
      console.log(
        `TabXport Claude: Found ${htmlTables.length} HTML tables in message ${messageIndex}`
      )

      htmlTables.forEach((table) => {
        const htmlTable = table as HTMLElement
        if (table.rows.length > 0 && !processedElements.has(htmlTable)) {
          logger.debug(`Adding HTML table from message ${messageIndex}`)
          console.log(
            `TabXport Claude: Adding HTML table from message ${messageIndex} (${table.rows.length} rows)`
          )
          elements.push(htmlTable)
          processedElements.add(htmlTable)
        }
      })

      // Find markdown tables in code blocks
      const codeBlocks = message.querySelectorAll(
        'pre, code, [class*="language-"], [class*="whitespace-pre"]'
      )
      logger.debug(
        `Found ${codeBlocks.length} code blocks in message ${messageIndex}`
      )
      console.log(
        `TabXport Claude: Found ${codeBlocks.length} code blocks in message ${messageIndex}`
      )

      codeBlocks.forEach((block, blockIndex) => {
        const htmlBlock = block as HTMLElement
        const blockText = domUtils.getTextContent(htmlBlock)
        const contentHash = blockText.trim().substring(0, 100)

        if (
          processedElements.has(htmlBlock) ||
          processedTableContent.has(contentHash)
        ) {
          logger.debug(`Skipping already processed code block ${blockIndex}`)
          return
        }

        if (blockText.includes("|") && blockText.includes("\n")) {
          const lines = blockText
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
          const tableLines = lines.filter(
            (line) => line.includes("|") && line.split("|").length >= 3
          )

          if (tableLines.length >= 2) {
            logger.debug(
              `Adding markdown table from code block ${blockIndex} in message ${messageIndex}`
            )
            console.log(
              `TabXport Claude: Adding markdown table from code block ${blockIndex} in message ${messageIndex} (${tableLines.length} lines)`
            )
            elements.push(htmlBlock)
            processedElements.add(htmlBlock)
            processedTableContent.add(contentHash)
          }
        }
      })

      // Find text-based tables in message content
      const textContent = message.textContent || ""
      logger.debug(
        `Claude message ${messageIndex} text length: ${textContent.length}`
      )
      console.log(
        `TabXport Claude: Message ${messageIndex} text length: ${textContent.length}`
      )

      if (textContent.includes("|") && textContent.split("\n").length > 2) {
        logger.debug(`Message ${messageIndex} contains potential table markers`)
        console.log(
          `TabXport Claude: Message ${messageIndex} contains potential table markers`
        )

        const textElements = message.querySelectorAll("div, p, span")
        logger.debug(
          `Checking ${textElements.length} text containers in message ${messageIndex}`
        )
        console.log(
          `TabXport Claude: Checking ${textElements.length} text containers in message ${messageIndex}`
        )

        textElements.forEach((element, elementIndex) => {
          const htmlElement = element as HTMLElement
          const text = domUtils.getTextContent(htmlElement)
          const contentHash = text.trim().substring(0, 100)

          if (
            processedElements.has(htmlElement) ||
            processedTableContent.has(contentHash)
          ) {
            return
          }

          // Filter system elements and short text
          if (text.length < 20) {
            return
          }

          // Check if this element is inside an already processed code block
          const isInsideCodeBlock = Array.from(processedElements).some(
            (processed) =>
              processed.contains(htmlElement) || htmlElement.contains(processed)
          )

          if (isInsideCodeBlock) {
            logger.debug(
              `Skipping text element ${elementIndex} - inside code block`
            )
            return
          }

          const lines = text
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
          const tableLines = lines.filter(
            (line) => line.includes("|") && line.split("|").length >= 3
          )

          if (tableLines.length >= 2) {
            // Additional validation for text tables
            const validLines = tableLines.filter((line) => {
              const cells = line
                .split("|")
                .map((cell) => cell.trim())
                .filter((cell) => cell.length > 0)
              return cells.length >= 2 && cells.some((cell) => cell.length > 1)
            })

            if (validLines.length >= 2) {
              logger.debug(
                `Adding text table element ${elementIndex} from message ${messageIndex}`
              )
              console.log(
                `TabXport Claude: Adding text table element ${elementIndex} from message ${messageIndex} (${validLines.length} lines)`
              )
              elements.push(htmlElement)
              processedElements.add(htmlElement)
              processedTableContent.add(contentHash)
            }
          }
        })
      }
    })

    // Enhanced deduplication - remove elements that contain the same content
    const uniqueElements: HTMLElement[] = []
    const finalProcessedContent = new Set<string>()

    for (const element of elements) {
      const content = domUtils.getTextContent(element).trim()
      // Create a content hash from first 100 characters
      const contentHash = content.substring(0, 100).replace(/\s+/g, ' ')
      
      // Skip if we've seen this content before
      if (finalProcessedContent.has(contentHash)) {
        console.log(`TabXport Claude: Skipping duplicate content: ${contentHash.substring(0, 50)}...`)
        continue
      }
      
      // Skip if this element is contained within another element we already have
      const isContainedInExisting = uniqueElements.some(existing => 
        existing.contains(element) || element.contains(existing)
      )
      
      if (!isContainedInExisting) {
        // Additional check - ensure element is visible
        if (domUtils.isVisible(element)) {
          uniqueElements.push(element)
          finalProcessedContent.add(contentHash)
          console.log(`TabXport Claude: Added unique table: ${contentHash.substring(0, 50)}...`)
        } else {
          console.log(`TabXport Claude: Skipping invisible element: ${contentHash.substring(0, 50)}...`)
        }
      } else {
        console.log(`TabXport Claude: Skipping nested element: ${contentHash.substring(0, 50)}...`)
      }
    }

    console.log(
      `TabXport Claude: Final result - found ${uniqueElements.length} unique table elements (was ${elements.length} before deduplication)`
    )
    return uniqueElements
  },

  extractChatTitle: (): string => {
    // Try to find the chat title in the header
    const titleElement = document.querySelector(
      '[class*="ConversationTitle"], [class*="chat-title"]'
    )
    if (titleElement) {
      const title = domUtils.getTextContent(titleElement as HTMLElement)
      if (title && title.length > 0) {
        return title
      }
    }

    // Fallback to the page title
    const pageTitle = document.title.replace(" - Claude", "").trim()
    return pageTitle || "Claude Conversation"
  }
}
