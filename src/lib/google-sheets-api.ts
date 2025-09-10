import { authService } from "./supabase/auth-service"
import { logExtensionError } from "./error-handlers"
import type { TableData } from "../types"
import { ensureGoogleApisHostPermissions } from "../services/permissions"

/**
 * Google Sheets API integration for creating native spreadsheets
 */

export interface SheetsCreateOptions {
  title: string
  sheetTitle?: string
}

export interface SheetsExportResult {
  success: boolean
  spreadsheetId?: string
  spreadsheetUrl?: string
  error?: string
}

export interface SheetData {
  range: string
  values: string[][]
}

/**
 * Google Sheets API v4 Service
 */
class GoogleSheetsService {
  private baseUrl = "https://sheets.googleapis.com/v4/spreadsheets"

  /**
   * Get valid Google token through authService
   */
  private async getValidToken(): Promise<string | null> {
    // удалены лишние console.log
    try {
      let token = authService.getGoogleToken()
      // удалены лишние console.log
      if (!token) {
        // удалён лишний console.log
        try {
          token = await authService.refreshGoogleToken()
          // удалены лишние console.log
        } catch (error) {
          const categorizedError = logExtensionError(
            error as Error,
            "Google token refresh via authService"
          )
          // удалён лишний console.log
          return null
        }
      }
      return token
    } catch (error) {
      logExtensionError(
        error as Error,
        "Google Sheets token retrieval via authService",
        { operation: "getValidToken" }
      )
      return null
    }
  }

  /**
   * Convert TableData to Google Sheets format
   */
  private tableDataToSheetsFormat(
    tableData: TableData,
    includeHeaders: boolean = true
  ): string[][] {
    const values: string[][] = []
    if (includeHeaders && tableData.headers.length > 0) {
      values.push(tableData.headers)
    }
    values.push(...tableData.rows)
    if (tableData.analytics?.summaryRows && tableData.analytics.summaryRows.length > 0) {
      // удалены лишние console.log
      values.push(new Array(tableData.headers.length).fill(""))
      values.push(...tableData.analytics.summaryRows)
      // удалены лишние console.log
    }
    return values
  }

  /**
   * Generate a clean sheet title from TableData
   */
  private generateSheetTitle(tableData: TableData, fallbackTitle: string = "Table"): string {
    let title = fallbackTitle

    // Try to use chat title or source as base name
    if (tableData.chatTitle && tableData.chatTitle !== `${tableData.source}_Chat`) {
      title = tableData.chatTitle
        .replace(/[<>:"/\\|?*\[\]]/g, "") // Remove invalid characters
        .replace(/\s+/g, "_")
        .substring(0, 100) // Google Sheets title limit
    } else {
      const source = tableData.source.charAt(0).toUpperCase() + tableData.source.slice(1)
      title = `${source}_Table`
    }

    // Ensure title is not empty
    if (title.length < 3) {
      title = fallbackTitle
    }

    return title
  }

  /**
   * Create a new Google Spreadsheet
   */
  async createSpreadsheet(options: SheetsCreateOptions): Promise<SheetsExportResult> {
    const token = await this.getValidToken()
    if (!token) {
      return {
        success: false,
        error: "Google authentication required. Please reconnect your Google Drive account."
      }
    }
    try {
      // удалён лишний console.log
      const requestBody = {
        properties: { title: options.title },
        sheets: [{ properties: { title: options.sheetTitle || "Sheet1" } }]
      }
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Spreadsheet creation failed: ${response.status} ${response.statusText} - ${errorText}`)
      }
      const spreadsheet = await response.json()
      // удалён лишний console.log
      return {
        success: true,
        spreadsheetId: spreadsheet.spreadsheetId,
        spreadsheetUrl: spreadsheet.spreadsheetUrl
      }
    } catch (error) {
      const categorizedError = logExtensionError(
        error as Error,
        "Google Sheets spreadsheet creation"
      )
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create spreadsheet"
      }
    }
  }

  /**
   * Add data to an existing sheet
   */
  async addSheetData(
    spreadsheetId: string,
    sheetName: string,
    values: string[][],
    range?: string
  ): Promise<{ success: boolean; error?: string }> {
    const token = await this.getValidToken()
    if (!token) {
      return { success: false, error: "Google authentication required" }
    }
    try {
      const targetRange = range || `${sheetName}!A1`
      // удалены лишние console.log
      const requestBody = { values }
      const response = await fetch(
        `${this.baseUrl}/${spreadsheetId}/values/${encodeURIComponent(targetRange)}?valueInputOption=RAW`,
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        }
      )
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Data addition failed: ${response.status} ${response.statusText} - ${errorText}`)
      }
      const result = await response.json()
      // удалён лишний console.log
      return { success: true }
    } catch (error) {
      logExtensionError(
        error as Error,
        "Google Sheets data addition",
        { spreadsheetId, sheetName, range }
      )
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add data to sheet"
      }
    }
  }

  /**
   * Format a sheet with headers styling
   */
  async formatSheet(
    spreadsheetId: string,
    sheetId: number,
    headerRowCount: number = 1
  ): Promise<{ success: boolean; error?: string }> {
    const token = await this.getValidToken()
    if (!token) {
      return { success: false, error: "Google authentication required" }
    }
    try {
      // удалён лишний console.log
      const requests = []

      // Format header row(s) if present
      if (headerRowCount > 0) {
        requests.push({
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: headerRowCount,
              startColumnIndex: 0
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 0.9,
                  green: 0.9,
                  blue: 0.9
                },
                textFormat: {
                  bold: true,
                  fontSize: 10
                },
                horizontalAlignment: "CENTER"
              }
            },
            fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
          }
        })

        // Add border to header
        requests.push({
          updateBorders: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: headerRowCount,
              startColumnIndex: 0
            },
            bottom: {
              style: "SOLID",
              width: 2,
              color: { red: 0.0, green: 0.0, blue: 0.0 }
            }
          }
        })
      }

      // Auto-resize columns
      requests.push({
        autoResizeDimensions: {
          dimensions: {
            sheetId: sheetId,
            dimension: "COLUMNS",
            startIndex: 0
          }
        }
      })

      // Freeze header row(s)
      if (headerRowCount > 0) {
        requests.push({
          updateSheetProperties: {
            properties: {
              sheetId: sheetId,
              gridProperties: {
                frozenRowCount: headerRowCount
              }
            },
            fields: "gridProperties.frozenRowCount"
          }
        })
      }

      const requestBody = {
        requests: requests
      }

      const response = await fetch(
        `${this.baseUrl}/${spreadsheetId}:batchUpdate`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        }
      )
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Sheet formatting failed: ${response.status} ${response.statusText} - ${errorText}`)
      }
      // удалён лишний console.log
      return { success: true }
    } catch (error) {
      logExtensionError(
        error as Error,
        "Google Sheets formatting",
        { spreadsheetId, sheetId }
      )
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to format sheet"
      }
    }
  }

  /**
   * Format analytics summary rows with special styling
   */
  async formatAnalyticsSummaryRows(
    spreadsheetId: string,
    sheetId: number,
    tableData: TableData,
    includeHeaders: boolean = true
  ): Promise<{ success: boolean; error?: string }> {
    const token = await this.getValidToken()
    if (!token) {
      return { success: false, error: "Google authentication required" }
    }
    if (!tableData.analytics?.summaryRows || tableData.analytics.summaryRows.length === 0) {
      return { success: true }
    }
    try {
      // удалён лишний console.log
      const headerOffset = includeHeaders ? 1 : 0
      const dataRowsCount = tableData.rows.length
      const summaryRowsCount = tableData.analytics.summaryRows.length
      const summaryStartRow = headerOffset + dataRowsCount + 1
      const summaryEndRow = summaryStartRow + summaryRowsCount
      // удалён лишний console.log
      const requests = []

      // Format summary rows with bold text and background
      requests.push({
        repeatCell: {
          range: {
            sheetId: sheetId,
            startRowIndex: summaryStartRow,
            endRowIndex: summaryEndRow,
            startColumnIndex: 0
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: {
                red: 0.95,
                green: 0.95,
                blue: 0.95
              },
              textFormat: {
                bold: true,
                fontSize: 10
              }
            }
          },
          fields: "userEnteredFormat(backgroundColor,textFormat)"
        }
      })

      // Add top border to summary section
      requests.push({
        updateBorders: {
          range: {
            sheetId: sheetId,
            startRowIndex: summaryStartRow,
            endRowIndex: summaryStartRow + 1,
            startColumnIndex: 0
          },
          top: {
            style: "SOLID",
            width: 2,
            color: { red: 0.0, green: 0.0, blue: 0.0 }
          }
        }
      })

      const requestBody = {
        requests: requests
      }

      const response = await fetch(
        `${this.baseUrl}/${spreadsheetId}:batchUpdate`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ requests })
        }
      )
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Summary row formatting failed: ${response.status} ${response.statusText} - ${errorText}`)
      }
      // удалён лишний console.log
      return { success: true }
    } catch (error) {
      logExtensionError(
        error as Error,
        "Google Sheets analytics formatting",
        { spreadsheetId, sheetId }
      )
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to format analytics summary rows"
      }
    }
  }

  /**
   * Create a new sheet within an existing spreadsheet
   */
  async addSheet(
    spreadsheetId: string,
    sheetTitle: string
  ): Promise<{ success: boolean; sheetId?: number; error?: string }> {
    const token = await this.getValidToken()
    if (!token) {
      return { success: false, error: "Google authentication required" }
    }
    try {
      // удалён лишний console.log
      const requestBody = {
        requests: [{ addSheet: { properties: { title: sheetTitle } } }]
      }
      const response = await fetch(
        `${this.baseUrl}/${spreadsheetId}:batchUpdate`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        }
      )
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Sheet addition failed: ${response.status} ${response.statusText} - ${errorText}`)
      }
      const result = await response.json()
      const sheetId = result.replies[0].addSheet.properties.sheetId
      // удалён лишний console.log
      return { success: true, sheetId }
    } catch (error) {
      logExtensionError(
        error as Error,
        "Google Sheets sheet addition",
        { spreadsheetId, sheetTitle }
      )
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to add sheet"
      }
    }
  }

  /**
   * Export single table to Google Sheets
   */
  async exportTable(
    tableData: TableData,
    options: {
      spreadsheetTitle?: string
      sheetTitle?: string
      includeHeaders?: boolean
    } = {}
  ): Promise<SheetsExportResult> {
    try {
      const {
        spreadsheetTitle = this.generateSheetTitle(tableData, "Exported_Table"),
        sheetTitle = "Table_Data",
        includeHeaders = true
      } = options

      const granted = await ensureGoogleApisHostPermissions()
      if (!granted) {
        return { success: false, error: "Требуется разрешение на доступ к Google API (optional host permissions не выданы)" }
      }

      // удалён лишний console.log
      const createResult = await this.createSpreadsheet({
        title: spreadsheetTitle,
        sheetTitle: sheetTitle
      })
      if (!createResult.success || !createResult.spreadsheetId) {
        return createResult
      }
      const values = this.tableDataToSheetsFormat(tableData, includeHeaders)
      const dataResult = await this.addSheetData(
        createResult.spreadsheetId,
        sheetTitle,
        values
      )
      if (!dataResult.success) {
        return { success: false, error: `Failed to add data: ${dataResult.error}` }
      }
      const formatResult = await this.formatSheet(
        createResult.spreadsheetId,
        0,
        includeHeaders ? 1 : 0
      )
      if (!formatResult.success) {
        console.warn(`⚠️ Sheet formatting failed: ${formatResult.error}`)
      }
      if (tableData.analytics?.summaryRows && tableData.analytics.summaryRows.length > 0) {
        // удалён лишний console.log
        const analyticsFormatResult = await this.formatAnalyticsSummaryRows(
          createResult.spreadsheetId,
          0,
          tableData,
          includeHeaders
        )
        if (!analyticsFormatResult.success) {
          console.warn(`⚠️ Analytics formatting failed: ${analyticsFormatResult.error}`)
        } else {
          // удалён лишний console.log
        }
      }
      // удалён лишний console.log
      return {
        success: true,
        spreadsheetId: createResult.spreadsheetId,
        spreadsheetUrl: createResult.spreadsheetUrl
      }
    } catch (error) {
      logExtensionError(
        error as Error,
        "Google Sheets table export"
      )
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to export to Google Sheets"
      }
    }
  }

  /**
   * Export multiple tables to a single Google Spreadsheet (batch export)
   */
  async exportMultipleTables(
    tables: TableData[],
    options: {
      spreadsheetTitle?: string
      includeHeaders?: boolean
    } = {}
  ): Promise<SheetsExportResult> {
    try {
      const {
        spreadsheetTitle = "Combined_Tables",
        includeHeaders = true
      } = options

      const granted = await ensureGoogleApisHostPermissions()
      if (!granted) {
        return { success: false, error: "Требуется разрешение на доступ к Google API (optional host permissions не выданы)" }
      }

      if (tables.length === 0) {
        return { success: false, error: "No tables to export" }
      }
      // удалён лишний console.log
      const firstTable = tables[0]
      const firstSheetTitle = this.generateSheetTitle(firstTable, "Table_1")
      const createResult = await this.createSpreadsheet({
        title: spreadsheetTitle,
        sheetTitle: firstSheetTitle
      })
      if (!createResult.success || !createResult.spreadsheetId) {
        return createResult
      }
      const firstValues = this.tableDataToSheetsFormat(firstTable, includeHeaders)
      const firstDataResult = await this.addSheetData(
        createResult.spreadsheetId,
        firstSheetTitle,
        firstValues
      )
      if (!firstDataResult.success) {
        return { success: false, error: `Failed to add first table data: ${firstDataResult.error}` }
      }
      await this.formatSheet(createResult.spreadsheetId, 0, includeHeaders ? 1 : 0)
      if (firstTable.analytics?.summaryRows && firstTable.analytics.summaryRows.length > 0) {
        // удалён лишний console.log
        const analyticsFormatResult = await this.formatAnalyticsSummaryRows(
          createResult.spreadsheetId,
          0,
          firstTable,
          includeHeaders
        )
        if (!analyticsFormatResult.success) {
          console.warn(`⚠️ Analytics formatting failed for first sheet: ${analyticsFormatResult.error}`)
        }
      }
      for (let i = 1; i < tables.length; i++) {
        const table = tables[i]
        const sheetTitle = this.generateSheetTitle(table, `Table_${i + 1}`)
        // удалён лишний console.log
        const addSheetResult = await this.addSheet(createResult.spreadsheetId, sheetTitle)
        if (!addSheetResult.success || addSheetResult.sheetId === undefined) {
          console.warn(`⚠️ Failed to add sheet "${sheetTitle}": ${addSheetResult.error}`)
          continue
        }
        const values = this.tableDataToSheetsFormat(table, includeHeaders)
        const dataResult = await this.addSheetData(
          createResult.spreadsheetId,
          sheetTitle,
          values
        )
        if (!dataResult.success) {
          console.warn(`⚠️ Failed to add data to sheet "${sheetTitle}": ${dataResult.error}`)
          continue
        }
        await this.formatSheet(
          createResult.spreadsheetId,
          addSheetResult.sheetId,
          includeHeaders ? 1 : 0
        )
        if (table.analytics?.summaryRows && table.analytics.summaryRows.length > 0) {
          // удалён лишний console.log
          const analyticsFormatResult = await this.formatAnalyticsSummaryRows(
            createResult.spreadsheetId,
            addSheetResult.sheetId,
            table,
            includeHeaders
          )
          if (!analyticsFormatResult.success) {
            console.warn(`⚠️ Analytics formatting failed for "${sheetTitle}": ${analyticsFormatResult.error}`)
          }
        }
      }
      // удалён лишний console.log
      return {
        success: true,
        spreadsheetId: createResult.spreadsheetId,
        spreadsheetUrl: createResult.spreadsheetUrl
      }
    } catch (error) {
      logExtensionError(
        error as Error,
        "Google Sheets batch export"
      )
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to batch export to Google Sheets"
      }
    }
  }
}

// Export singleton instance
export const googleSheetsService = new GoogleSheetsService()