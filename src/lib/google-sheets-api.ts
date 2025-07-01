import { authService } from "./supabase/auth-service"
import { logExtensionError } from "./error-handlers"
import type { TableData } from "../types"

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
    console.log("🔐 GoogleSheetsService: Getting valid token via authService...")
    
    try {
      let token = authService.getGoogleToken()
      console.log("📋 AuthService token status:", {
        hasToken: !!token,
        tokenLength: token?.length || 0
      })

      if (!token) {
        console.log("🔄 No token found, attempting refresh...")
        try {
          token = await authService.refreshGoogleToken()
          console.log("✅ Token refresh result:", {
            success: !!token,
            newTokenLength: token?.length || 0
          })
        } catch (error) {
          const categorizedError = logExtensionError(
            error as Error,
            "Google token refresh via authService"
          )
          
          if (categorizedError.type === 'AUTH_ERROR') {
            console.log("📝 User needs to re-authenticate with Google Drive")
          }
          
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
      console.log(`📊 Creating new Google Spreadsheet: "${options.title}"`)

      const requestBody = {
        properties: {
          title: options.title
        },
        sheets: [
          {
            properties: {
              title: options.sheetTitle || "Sheet1"
            }
          }
        ]
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
      
      console.log(`✅ Successfully created Google Spreadsheet:`, {
        spreadsheetId: spreadsheet.spreadsheetId,
        title: spreadsheet.properties.title,
        url: spreadsheet.spreadsheetUrl
      })

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
      return {
        success: false,
        error: "Google authentication required"
      }
    }

    try {
      const targetRange = range || `${sheetName}!A1`
      console.log(`📊 Adding data to sheet "${sheetName}" at range "${targetRange}"`)
      console.log(`📋 Data dimensions: ${values.length} rows × ${values[0]?.length || 0} columns`)

      const requestBody = {
        values: values
      }

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
      console.log(`✅ Successfully added data to sheet: ${result.updatedCells} cells updated`)

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
      return {
        success: false,
        error: "Google authentication required"
      }
    }

    try {
      console.log(`🎨 Formatting sheet ${sheetId} with ${headerRowCount} header rows`)

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

      console.log(`✅ Successfully formatted sheet ${sheetId}`)
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
   * Create a new sheet within an existing spreadsheet
   */
  async addSheet(
    spreadsheetId: string,
    sheetTitle: string
  ): Promise<{ success: boolean; sheetId?: number; error?: string }> {
    const token = await this.getValidToken()

    if (!token) {
      return {
        success: false,
        error: "Google authentication required"
      }
    }

    try {
      console.log(`📋 Adding new sheet "${sheetTitle}" to spreadsheet ${spreadsheetId}`)

      const requestBody = {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetTitle
              }
            }
          }
        ]
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

      console.log(`✅ Successfully added sheet "${sheetTitle}" with ID ${sheetId}`)

      return {
        success: true,
        sheetId: sheetId
      }
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

      console.log(`🚀 Starting Google Sheets export for table from ${tableData.source}`)

      // Step 1: Create spreadsheet
      const createResult = await this.createSpreadsheet({
        title: spreadsheetTitle,
        sheetTitle: sheetTitle
      })

      if (!createResult.success || !createResult.spreadsheetId) {
        return createResult
      }

      // Step 2: Prepare data
      const values = this.tableDataToSheetsFormat(tableData, includeHeaders)
      
      // Step 3: Add data to sheet
      const dataResult = await this.addSheetData(
        createResult.spreadsheetId,
        sheetTitle,
        values
      )

      if (!dataResult.success) {
        return {
          success: false,
          error: `Failed to add data: ${dataResult.error}`
        }
      }

      // Step 4: Format sheet (get sheetId from the first sheet which is 0)
      const formatResult = await this.formatSheet(
        createResult.spreadsheetId,
        0, // First sheet ID is always 0
        includeHeaders ? 1 : 0
      )

      if (!formatResult.success) {
        console.warn(`⚠️ Sheet formatting failed: ${formatResult.error}`)
        // Continue anyway - formatting is not critical
      }

      console.log(`✅ Google Sheets export completed successfully`)

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

      if (tables.length === 0) {
        return {
          success: false,
          error: "No tables to export"
        }
      }

      console.log(`🚀 Starting Google Sheets batch export for ${tables.length} tables`)

      // Step 1: Create spreadsheet with first table
      const firstTable = tables[0]
      const firstSheetTitle = this.generateSheetTitle(firstTable, "Table_1")
      
      const createResult = await this.createSpreadsheet({
        title: spreadsheetTitle,
        sheetTitle: firstSheetTitle
      })

      if (!createResult.success || !createResult.spreadsheetId) {
        return createResult
      }

      // Step 2: Add first table data
      const firstValues = this.tableDataToSheetsFormat(firstTable, includeHeaders)
      const firstDataResult = await this.addSheetData(
        createResult.spreadsheetId,
        firstSheetTitle,
        firstValues
      )

      if (!firstDataResult.success) {
        return {
          success: false,
          error: `Failed to add first table data: ${firstDataResult.error}`
        }
      }

      // Step 3: Format first sheet
      await this.formatSheet(createResult.spreadsheetId, 0, includeHeaders ? 1 : 0)

      // Step 4: Process remaining tables
      for (let i = 1; i < tables.length; i++) {
        const table = tables[i]
        const sheetTitle = this.generateSheetTitle(table, `Table_${i + 1}`)
        
        console.log(`📋 Processing table ${i + 1}/${tables.length}: ${sheetTitle}`)

        // Add new sheet
        const addSheetResult = await this.addSheet(createResult.spreadsheetId, sheetTitle)
        
        if (!addSheetResult.success || addSheetResult.sheetId === undefined) {
          console.warn(`⚠️ Failed to add sheet "${sheetTitle}": ${addSheetResult.error}`)
          continue
        }

        // Add data to new sheet
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

        // Format new sheet
        await this.formatSheet(
          createResult.spreadsheetId,
          addSheetResult.sheetId,
          includeHeaders ? 1 : 0
        )
      }

      console.log(`✅ Google Sheets batch export completed successfully`)

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