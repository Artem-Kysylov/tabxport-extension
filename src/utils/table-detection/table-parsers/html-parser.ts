import { domUtils } from "../common/dom-utils"
import { logger } from "../common/logging"
import { validationUtils } from "../common/validation"
import { TableParser } from "../types"

/**
 * Parser for HTML table elements
 */
export const htmlTableParser: TableParser = {
  canParse: (element: HTMLElement): boolean => {
    return (
      element.tagName.toLowerCase() === "table" &&
      domUtils.isVisible(element) &&
      !domUtils.isUIElement(element)
    )
  },

  parse: (
    element: HTMLElement
  ): { headers: string[]; rows: string[][] } | null => {
    if (!element || !(element instanceof HTMLTableElement)) {
      logger.warn("Invalid element type for HTML table parser")
      return null
    }

    const headers: string[] = []
    const rows: string[][] = []

    logger.debug("Parsing HTML table with", element.rows.length, "rows")

    // Find headers in thead or first row of tbody
    const thead = element.querySelector("thead")
    const tbody = element.querySelector("tbody") || element

    if (thead) {
      logger.debug("Found thead element")
      const headerRow = thead.querySelector("tr")
      if (headerRow) {
        const headerCells = headerRow.querySelectorAll("th, td")
        logger.debug("Found", headerCells.length, "header cells")
        headerCells.forEach((cell) => {
          const cellText = domUtils.getTextContent(cell as HTMLElement)
          headers.push(cellText)
        })
      }
    }

    // Parse data rows
    const dataRows = tbody.querySelectorAll("tr")
    logger.debug("Found", dataRows.length, "data rows")

    dataRows.forEach((row, index) => {
      // Skip first row if it was used as header and no thead exists
      if (!thead && index === 0 && headers.length === 0) {
        logger.debug("Using first row as headers (no thead found)")
        const cells = row.querySelectorAll("th, td")
        cells.forEach((cell) => {
          const cellText = domUtils.getTextContent(cell as HTMLElement)
          headers.push(cellText)
        })
        return
      }

      const rowData: string[] = []
      const cells = row.querySelectorAll("td, th")
      logger.debug(`Row ${index} has ${cells.length} cells`)

      cells.forEach((cell) => {
        const cellText = domUtils.getTextContent(cell as HTMLElement)
        rowData.push(cellText)
      })

      if (rowData.length > 0) {
        rows.push(rowData)
      }
    })

    // Validate and sanitize the extracted data
    if (!validationUtils.isValidTableData(headers, rows)) {
      logger.warn("Invalid table data extracted from HTML table")
      logger.debug(
        "Validation failed - Headers:",
        headers.length,
        "First header:",
        headers[0]
      )
      logger.debug(
        "Validation failed - Rows:",
        rows.length,
        "First row length:",
        rows[0]?.length
      )
      logger.debug("Headers:", headers)
      logger.debug("First few rows:", rows.slice(0, 3))
      return null
    }

    const sanitizedData = validationUtils.sanitizeTableData(headers, rows)
    logger.debug(
      "HTML table parsing complete - Headers:",
      sanitizedData.headers.length,
      "Data rows:",
      sanitizedData.rows.length
    )

    return sanitizedData
  }
}
