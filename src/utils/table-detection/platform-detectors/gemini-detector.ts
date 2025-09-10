import { domUtils } from "../common/dom-utils"
import { logger } from "../common/logging"
import { PlatformDetector } from "../types"

/**
 * Helper function to check if text contains meaningful content including emojis
 */
const isValidContent = (text: string): boolean => {
  // Allow alphanumeric, Chinese characters, and emojis
  const meaningfulContentRegex =
    /[\w\u4e00-\u9fff\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}]/u
  return meaningfulContentRegex.test(text)
}

/**
 * Detector for Google Gemini platform
 */
export const geminiDetector: PlatformDetector = {
  canDetect: (url: string): boolean => {
    return url.includes("gemini.google.com") || url.includes("bard.google.com")
  },

  findTables: (): HTMLElement[] => {
    logger.debug("Searching for tables in Gemini interface")
    // console.log("TabXport Gemini: Starting table search")
    logger.info("TabXport Gemini: Starting table search");

    const elements: HTMLElement[] = []
    const processedElements = new Set<HTMLElement>()

    // First find all HTML tables on the page
    const allHTMLTables = document.querySelectorAll("table")
    logger.debug(`Found ${allHTMLTables.length} total HTML tables on page`)
    console.log(
      `TabXport Gemini: Found ${allHTMLTables.length} total HTML tables on page`
    )

    allHTMLTables.forEach((table, index) => {
      const htmlTable = table as HTMLElement
      logger.debug(`Checking HTML table ${index}`)
      logger.debug(`Table rows: ${(table as HTMLTableElement).rows.length}`)
      logger.debug(`Table visible: ${htmlTable.offsetParent !== null}`)
      if (
        (table as HTMLTableElement).rows.length > 0 &&
        htmlTable.offsetParent !== null
      ) {
        logger.debug(`Adding HTML table ${index} directly`)
        console.log(
          `TabXport Gemini: Adding HTML table ${index} directly (${(table as HTMLTableElement).rows.length} rows)`
        )
        elements.push(htmlTable)
        processedElements.add(htmlTable)
      }
    })

    // Then find Gemini response containers
    const responseContainers = document.querySelectorAll(
      "[data-response-id], .response-container, .model-response, .conversation-turn, mat-card"
    )
    logger.debug(`Found ${responseContainers.length} response containers`)
    console.log(
      `TabXport Gemini: Found ${responseContainers.length} response containers`
    )

    responseContainers.forEach((container, containerIndex) => {
      const responseElement = container as HTMLElement
      logger.debug(`Processing response container ${containerIndex}`)
      console.log(
        `TabXport Gemini: Processing response container ${containerIndex}`
      )

      // Find code blocks that might contain markdown tables
      const codeBlocks = responseElement.querySelectorAll("pre, code")
      logger.debug(
        `Found ${codeBlocks.length} code blocks in response ${containerIndex}`
      )
      console.log(
        `TabXport Gemini: Found ${codeBlocks.length} code blocks in response ${containerIndex}`
      )

      codeBlocks.forEach((block, blockIndex) => {
        const htmlBlock = block as HTMLElement
        if (processedElements.has(htmlBlock)) {
          return
        }

        const text = domUtils.getTextContent(htmlBlock)
        // Skip system elements and short content
        if (text.length < 20 || text.includes("Спросить Gemini")) {
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
              `Adding markdown table from code block ${blockIndex} in response ${containerIndex}`
            )
            console.log(
              `TabXport Gemini: Adding markdown table from code block ${blockIndex} in response ${containerIndex} (${tableLines.length} lines)`
            )
            elements.push(htmlBlock)
            processedElements.add(htmlBlock)
          }
        }
      })

      // Find div tables in responses
      const divElements = responseElement.querySelectorAll("div")
      divElements.forEach((div, divIndex) => {
        const htmlDiv = div as HTMLElement

        // Skip UI elements
        if (
          htmlDiv.classList.contains("text-input-field") ||
          htmlDiv.classList.contains("input") ||
          htmlDiv.classList.contains("toolbar") ||
          htmlDiv.classList.contains("button") ||
          htmlDiv.classList.contains("menu") ||
          htmlDiv.classList.contains("dropdown") ||
          htmlDiv.classList.contains("modal") ||
          htmlDiv.classList.contains("popup") ||
          htmlDiv.classList.contains("tooltip") ||
          htmlDiv.classList.contains("ng-tns")
        ) {
          return
        }

        // Check for table-like structure
        const children = htmlDiv.children
        if (children.length >= 2 && children.length <= 10) {
          // Reasonable number of columns
          const hasValidStructure = Array.from(children).some((child) => {
            const text = domUtils.getTextContent(child as HTMLElement)
            return (
              text.length > 0 &&
              !text.includes("Deep Research") &&
              !text.includes("Canvas") &&
              !text.includes("Спросить Gemini") &&
              isValidContent(text)
            ) // Use helper function that supports emojis
          })

          if (hasValidStructure && !processedElements.has(htmlDiv)) {
            logger.debug(
              `Adding div table ${divIndex} from response ${containerIndex}`
            )
            console.log(
              `TabXport Gemini: Adding div table ${divIndex} from response ${containerIndex} (${children.length} children)`
            )
            elements.push(htmlDiv)
            processedElements.add(htmlDiv)
          }
        }
      })

      // Find text-based tables
      const textElements = responseElement.querySelectorAll(
        ".markdown-content p, .response-content p"
      )
      textElements.forEach((element, elementIndex) => {
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
            logger.debug(`Adding text table from response ${containerIndex}`)
            console.log(
              `TabXport Gemini: Adding text table from response ${containerIndex} (${tableLines.length} lines)`
            )
            elements.push(htmlElement)
            processedElements.add(htmlElement)
          }
        }
      })
    })

    // Enhanced deduplication - remove elements that contain the same content
    const uniqueElements: HTMLElement[] = []
    const processedContent = new Set<string>()

    for (const element of elements) {
      const content = domUtils.getTextContent(element).trim()
      const contentHash = content.substring(0, 100).replace(/\s+/g, ' ')
      if (processedContent.has(contentHash)) {
        continue
      }
      const isContainedInExisting = uniqueElements.some(existing => 
        existing.contains(element) || element.contains(existing)
      )
      if (!isContainedInExisting) {
        if (domUtils.isVisible(element)) {
          uniqueElements.push(element)
          processedContent.add(contentHash)
        }
      }
    }
    return uniqueElements
  },

  extractChatTitle: (): string => {
    // Try to find the chat title in the header
    const titleElement = document.querySelector(
      '[class*="chat-title"], .conversation-title'
    )
    if (titleElement) {
      const title = domUtils.getTextContent(titleElement as HTMLElement)
      if (title && title.length > 0) {
        return title
      }
    }

    // Fallback to the page title
    const pageTitle = document.title
      .replace(" - Gemini", "")
      .replace(" - Bard", "")
      .trim()
    return pageTitle || "Gemini Conversation"
  }
}
