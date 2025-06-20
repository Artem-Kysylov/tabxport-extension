import { logger } from "../common/logging"
import { PlatformDetector } from "../types"

/**
 * Generic detector for fallback cases on unsupported platforms
 */
export const genericDetector: PlatformDetector = {
  canDetect: (url: string): boolean => {
    // Fallback detector for any URLs not handled by specific platform detectors
    return (
      !url.includes("chat.openai.com") &&
      !url.includes("chatgpt.com") &&
      !url.includes("claude.ai") &&
      !url.includes("gemini.google.com") &&
      !url.includes("bard.google.com") &&
      !url.includes("chat.deepseek.com") &&
      !url.includes("deepseek.com")
    )
  },

  findTables: (): HTMLElement[] => {
    logger.debug("Generic detector: Finding tables")

    const tables: HTMLElement[] = []
    const processedElements = new Set<HTMLElement>()

    // Find standard HTML tables (highest priority)
    const htmlTables = document.querySelectorAll("table")
    logger.debug(`Found ${htmlTables.length} HTML tables`)

    htmlTables.forEach((table) => {
      if (table instanceof HTMLElement && !processedElements.has(table)) {
        // Basic validation for HTML tables
        const rows = table.querySelectorAll("tr")
        if (rows.length >= 2) {
          // At least header + 1 data row
          tables.push(table)
          processedElements.add(table)
          logger.debug("Added HTML table with", rows.length, "rows")
        }
      }
    })

    // Find potential table content in pre/code blocks
    const codeBlocks = document.querySelectorAll("pre, code")
    logger.debug(`Found ${codeBlocks.length} code blocks`)

    codeBlocks.forEach((block) => {
      if (block instanceof HTMLElement && !processedElements.has(block)) {
        // Skip if this element is inside an already processed table
        if (
          Array.from(processedElements).some((processed) =>
            processed.contains(block)
          )
        ) {
          return
        }

        const text = block.textContent || ""
        // More strict validation for code blocks
        if (text.includes("|") && text.split("\n").length >= 3) {
          const lines = text.split("\n").filter((line) => line.trim())
          const tableLines = lines.filter(
            (line) => line.includes("|") && line.split("|").length >= 3
          )

          // Must have at least 2 valid table lines
          if (tableLines.length >= 2) {
            tables.push(block)
            processedElements.add(block)
            logger.debug(
              "Added code block table with",
              tableLines.length,
              "lines"
            )
          }
        }
      }
    })

    // Find div elements with table-like content (lowest priority, most strict)
    const divs = document.querySelectorAll("div")
    logger.debug(`Checking ${divs.length} div elements`)

    divs.forEach((div) => {
      if (div instanceof HTMLElement && !processedElements.has(div)) {
        // Skip our own UI elements
        if (
          div.id?.includes("tabxport") ||
          div.className?.includes("tabxport")
        ) {
          return
        }

        // Skip if this element is inside an already processed element
        if (
          Array.from(processedElements).some(
            (processed) => processed.contains(div) || div.contains(processed)
          )
        ) {
          return
        }

        // Skip very small or very large elements
        const rect = div.getBoundingClientRect()
        if (rect.height < 50 || rect.height > 2000 || rect.width < 100) {
          return
        }

        const text = div.textContent || ""

        // Very strict validation for div elements
        if (text.includes("|") && text.length > 50 && text.length < 5000) {
          const lines = text.split("\n").filter((line) => line.trim())
          const tableLines = lines.filter((line) => {
            const parts = line.split("|")
            return (
              parts.length >= 3 && parts.some((part) => part.trim().length > 0)
            )
          })

          // Must have at least 3 valid table lines and reasonable content
          if (tableLines.length >= 3) {
            // Additional check: must not contain too much non-table content
            const tableContent = tableLines.join("\n")
            const tableRatio = tableContent.length / text.length

            if (tableRatio > 0.7) {
              // At least 70% of content should be table
              tables.push(div)
              processedElements.add(div)
              logger.debug(
                "Added div table with",
                tableLines.length,
                "lines, ratio:",
                tableRatio.toFixed(2)
              )
            }
          }
        }
      }
    })

    logger.debug(`Generic detector found ${tables.length} valid tables`)
    return tables
  },

  extractChatTitle: (): string => {
    // Try to extract title from page
    const title = document.title
    if (title && title.trim()) {
      return title.trim()
    }

    // Try h1 elements
    const h1 = document.querySelector("h1")
    if (h1 && h1.textContent) {
      return h1.textContent.trim()
    }

    // Default for test pages
    return "Test Page Export"
  }
}
