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
    // удален console.log "Starting table search"

    const elements: HTMLElement[] = []
    const processedElements = new Set<HTMLElement>()

    let messageContainers = document.querySelectorAll(
      '[data-message-author-role="assistant"]'
    )
    // удален console.log количества сообщений

    if (messageContainers.length === 0) {
      // удален console.log "Trying fallback selectors..."
      const fallbackSelectors = [
        "[data-message-id]",
        '.message[data-message-author-role="assistant"]',
        '[class*="message"]:has([class*="assistant"])',
        '[class*="assistant"] [class*="message"]',
        ".prose",
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
          // удален console.log результатов селектора
          if (found.length > 0) {
            messageContainers = found
            // удален console.log выбранного селектора
            break
          }
        } catch (error) {
          // был console.log об ошибке — подавляем, чтобы не шуметь в проде
        }
      }
    }

    if (messageContainers.length === 0) {
      // удален console.log "No message containers..."
      const allTables = document.querySelectorAll("table")
      // удален console.log количества таблиц на странице

      allTables.forEach((table, index) => {
        if (
          table.rows.length > 0 &&
          !processedElements.has(table as HTMLElement)
        ) {
          // удален console.log добавления таблицы
          elements.push(table as HTMLElement)
          processedElements.add(table as HTMLElement)
        }
      })

      const allCodeBlocks = document.querySelectorAll("pre, code")
      // удален console.log количества блоков кода

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
            // удален console.log добавления markdown-таблицы
            elements.push(htmlBlock)
            processedElements.add(htmlBlock)
          }
        }
      })

      // удален console.log "Page scan complete..."
      return elements
    }

    logger.debug(`Found ${messageContainers.length} assistant messages`)
    // удален console.log количества сообщений ассистента

    messageContainers.forEach((container, containerIndex) => {
      const messageElement = container as HTMLElement
      logger.debug(`Processing assistant message ${containerIndex}`)
      // удален console.log "Processing message ..."

      const htmlTables = messageElement.querySelectorAll("table")
      logger.debug(
        `Found ${htmlTables.length} HTML tables in message ${containerIndex}`
      )
      // удален console.log количества HTML таблиц

      htmlTables.forEach((table) => {
        if (
          table.rows.length > 0 &&
          !processedElements.has(table as HTMLElement)
        ) {
          logger.debug(`Adding HTML table from message ${containerIndex}`)
          // удален console.log добавления таблицы
          elements.push(table as HTMLElement)
          processedElements.add(table as HTMLElement)
        }
      })

      const codeBlocks = messageElement.querySelectorAll("pre, code")
      logger.debug(
        `Found ${codeBlocks.length} code blocks in message ${containerIndex}`
      )
      // удален console.log количества блоков кода

      codeBlocks.forEach((block) => {
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
            logger.debug(
              `Adding markdown table from code block in message ${containerIndex}`
            )
            // удален console.log добавления markdown-таблицы
            elements.push(htmlBlock)
            processedElements.add(htmlBlock)
          }
        }
      })

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
            // удален console.log добавления текстовой таблицы
            elements.push(htmlElement)
            processedElements.add(htmlElement)
          }
        }
      })
    })

    // удален console.log финального результата
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
