import { domUtils } from "../common/dom-utils"
import { logger } from "../common/logging"
import { validationUtils } from "../common/validation"
import { TableParser } from "../types"

/**
 * Parser for table-like div structures
 */
export const divTableParser: TableParser = {
  canParse: (element: HTMLElement): boolean => {
    if (
      !domUtils.isVisible(element) ||
      domUtils.isUIElement(element) ||
      element.tagName.toLowerCase() !== "div"
    ) {
      return false
    }

    // Check for table role or class
    const hasTableRole =
      element.querySelector('[role="table"], .table, [class*="table"]') !== null
    if (hasTableRole) {
      return true
    }

    // Check for repeated div structure
    const children = element.children
    if (children.length >= 2 && children.length <= 10) {
      // Reasonable number of columns
      const hasValidStructure = Array.from(children).some((child) => {
        const text = domUtils.getTextContent(child as HTMLElement)
        return text.length > 1 && !/^[^\w]*$/.test(text) // Not just symbols
      })
      return hasValidStructure
    }

    return false
  },

  parse: (
    element: HTMLElement
  ): { headers: string[]; rows: string[][] } | null => {
    const headers: string[] = []
    const rows: string[][] = []

    logger.debug("Parsing div table structure")

    // Pattern 1: div with role="table" or table classes
    const tableDiv = element.querySelector(
      '[role="table"], .table, [class*="table"]'
    )
    if (tableDiv) {
      logger.debug("Found table-like div structure")

      // Find header row
      const headerRow = tableDiv.querySelector(
        '[role="row"]:first-child, .table-header, [class*="header"]'
      )
      if (headerRow) {
        const headerCells = headerRow.querySelectorAll(
          '[role="columnheader"], [role="cell"], .cell, [class*="cell"]'
        )
        headerCells.forEach((cell) => {
          const cellText = domUtils.getTextContent(cell as HTMLElement)
          if (cellText.length > 0) {
            headers.push(cellText)
          }
        })
        logger.debug("Found", headers.length, "header cells")
      }

      // Find data rows
      const dataRows = tableDiv.querySelectorAll(
        '[role="row"]:not(:first-child), .table-row, [class*="row"]:not([class*="header"])'
      )
      dataRows.forEach((row, rowIndex) => {
        const rowData: string[] = []
        const cells = row.querySelectorAll(
          '[role="cell"], .cell, [class*="cell"]'
        )
        cells.forEach((cell) => {
          rowData.push(domUtils.getTextContent(cell as HTMLElement))
        })
        if (rowData.length > 0) {
          rows.push(rowData)
          logger.debug(
            `Parsed row ${rowIndex + 1} with ${rowData.length} cells`
          )
        }
      })
    }

    // Pattern 2: Repeated div structure
    if (headers.length === 0 && rows.length === 0) {
      logger.debug("Trying repeated div structure pattern")
      const rowCandidates = Array.from(element.children)
        .filter((child) => !domUtils.isUIElement(child as HTMLElement))
        .map((child) => child as HTMLElement)

      if (rowCandidates.length >= 2) {
        const firstRowChildren = rowCandidates[0].children.length
        const consistentRows = rowCandidates.filter(
          (row) => row.children.length === firstRowChildren
        )

        if (consistentRows.length >= 2) {
          // First row as headers
          Array.from(consistentRows[0].children).forEach((child) => {
            const headerText = domUtils.getTextContent(child as HTMLElement)
            if (headerText.length > 0) {
              headers.push(headerText)
            }
          })
          logger.debug(
            "Found",
            headers.length,
            "headers from repeated structure"
          )

          // Rest as data
          consistentRows.slice(1).forEach((row, rowIndex) => {
            const rowData: string[] = []
            Array.from(row.children).forEach((child) => {
              rowData.push(domUtils.getTextContent(child as HTMLElement))
            })
            if (rowData.some((cell) => cell.length > 0)) {
              rows.push(rowData)
              logger.debug(
                `Parsed row ${rowIndex + 1} with ${rowData.length} cells`
              )
            }
          })
        }
      }
    }

    // Validate and sanitize the extracted data
    if (!validationUtils.isValidTableData(headers, rows)) {
      logger.warn("Invalid table data extracted from div structure")
      return null
    }

    const sanitizedData = validationUtils.sanitizeTableData(headers, rows)
    logger.debug(
      "Div table parsing complete - Headers:",
      sanitizedData.headers.length,
      "Data rows:",
      sanitizedData.rows.length
    )

    return sanitizedData
  }
}
