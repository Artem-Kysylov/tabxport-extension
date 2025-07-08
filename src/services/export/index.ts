import * as XLSX from "xlsx"
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle
} from "docx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

import type { ExportOptions, ExportResult, TableData } from "../../types"
import { generateFilename } from "./utils"
import { googleSheetsService } from "../../lib/google-sheets-api"
import { analyticsService } from "../analytics"
import { getUserSettings } from "../../lib/storage"

export class ExportService {
  /**
   * Converts TableData array to table merger format
   */
  private convertToMergerFormat(tables: TableData[]): Array<{
    id: string
    name?: string
    columns: Array<{
      name: string
      values: (string | number)[]
    }>
  }> {
    return tables.map(table => {
      // Convert headers + rows to columns format
      const columns = table.headers.map((header, colIndex) => ({
        name: header,
        values: table.rows.map(row => row[colIndex] || '') as (string | number)[]
      }))

      return {
        id: table.id,
        name: table.chatTitle || `${table.source}_Table`,
        columns
      }
    })
  }

  /**
   * Converts merged table result back to TableData format
   */
  private convertFromMergerFormat(mergedTable: { 
    name: string, 
    columns: Array<{ 
      name: string, 
      values: (string | number)[] 
    }> 
  }): TableData {
    // Extract headers from merged columns
    const headers = mergedTable.columns.map(col => col.name)
    
    // Find maximum row count across all columns
    const maxRows = Math.max(...mergedTable.columns.map(col => col.values.length))
    
    // Convert columns back to rows format
    const rows: string[][] = []
    for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
      const row = headers.map((_, colIndex) => {
        const column = mergedTable.columns[colIndex]
        const value = column?.values[rowIndex]
        return value !== undefined && value !== null ? value.toString() : ''
      })
      rows.push(row)
    }

    // Create merged table data
    return {
      id: `merged_${Date.now()}`,
      headers,
      rows,
      source: 'batch-export' as const,
      timestamp: Date.now(),
      url: window.location.href,
      chatTitle: mergedTable.name || 'Merged Tables'
    }
  }

  private tableDataToWorksheet(
    tableData: TableData,
    includeHeaders: boolean = true
  ): XLSX.WorkSheet {
    const data: string[][] = []

    if (includeHeaders && tableData.headers.length > 0) {
      data.push(tableData.headers)
    }

    // Add regular table rows
    data.push(...tableData.rows)

    // Add analytics summary rows if available
    if (tableData.analytics?.summaryRows && tableData.analytics.summaryRows.length > 0) {
      console.log("📊 ExportService: Adding analytics summary rows to worksheet")
      
      // Add empty row for separation
      data.push(new Array(tableData.headers.length).fill(""))
      
      // Add summary rows with analytics data
      data.push(...tableData.analytics.summaryRows)
      
      console.log(`📊 ExportService: Added ${tableData.analytics.summaryRows.length} summary rows`)
    }

    const worksheet = XLSX.utils.aoa_to_sheet(data)

    // Apply styling to summary rows if analytics data exists
    if (tableData.analytics?.summaryRows && tableData.analytics.summaryRows.length > 0) {
      this.applySummaryRowStyling(worksheet, tableData, includeHeaders)
    }

    return worksheet
  }

  /**
   * Applies styling to summary rows in the worksheet
   */
  private applySummaryRowStyling(
    worksheet: XLSX.WorkSheet,
    tableData: TableData,
    includeHeaders: boolean
  ): void {
    try {
      const headerOffset = includeHeaders ? 1 : 0
      const dataRowsCount = tableData.rows.length
      const summaryRowsCount = tableData.analytics?.summaryRows?.length || 0
      
      // Calculate row indices for summary rows
      const summaryStartRow = headerOffset + dataRowsCount + 1 // +1 for empty separator row
      
      console.log(`📊 ExportService: Applying styling to summary rows starting at row ${summaryStartRow}`)
      
      // Initialize worksheet style object if not exists
      if (!worksheet['!rows']) {
        worksheet['!rows'] = []
      }
      
      // Apply bold formatting and borders to summary rows
      for (let i = 0; i < summaryRowsCount; i++) {
        const rowIndex = summaryStartRow + i
        
        // Set row style properties
        if (!worksheet['!rows'][rowIndex]) {
          worksheet['!rows'][rowIndex] = {}
        }
        
        // Apply styles to each cell in the summary row
        for (let col = 0; col < tableData.headers.length; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: col })
          
          if (!worksheet[cellAddress]) {
            worksheet[cellAddress] = { v: "", t: "s" }
          }
          
          // Apply bold font and border styling
          worksheet[cellAddress].s = {
            font: { bold: true },
            border: {
              top: { style: "medium", color: { rgb: "000000" } }
            },
            fill: {
              fgColor: { rgb: "F0F0F0" }
            }
          }
        }
      }
      
      console.log("✅ ExportService: Summary row styling applied successfully")
    } catch (error) {
      console.warn("⚠️ ExportService: Failed to apply summary row styling:", error)
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    // Fixed: Safe synchronous method for binary data (XLSX, PDF, DOCX)
    const bytes = new Uint8Array(buffer)
    
    // Convert to binary string using safe approach
    let binaryString = ""
    const len = bytes.byteLength
    
    // Process in chunks to avoid call stack limits on large files
    const chunkSize = 32768 // 32KB chunks
    
    for (let i = 0; i < len; i += chunkSize) {
      const end = Math.min(i + chunkSize, len)
      const chunk = bytes.subarray(i, end)
      
      // Convert chunk to array for safe fromCharCode usage
      const chunkArray = Array.prototype.slice.call(chunk)
      binaryString += String.fromCharCode.apply(null, chunkArray)
    }
    
    // Convert binary string to base64
    return btoa(binaryString)
  }

  private async exportToXLSX(
    tableData: TableData,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const worksheet = this.tableDataToWorksheet(
        tableData,
        options.includeHeaders
      )
      const workbook = XLSX.utils.book_new()

      XLSX.utils.book_append_sheet(workbook, worksheet, "Table")

      const filename = generateFilename(tableData, "xlsx", options.filename, {
        tableIndex: (options as any).tableIndex,
        batchMode: (options as any).tableIndex !== undefined
      })
      const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" })

      // Создаем data URL для скачивания
      const base64 = this.arrayBufferToBase64(buffer)
      const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`

      return {
        success: true,
        filename,
        downloadUrl: dataUrl
      }
    } catch (error) {
      console.error("Error exporting to XLSX:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }
    }
  }

  private async exportToCSV(
    tableData: TableData,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      // Use the same worksheet generation logic that handles analytics
      const worksheet = this.tableDataToWorksheet(
        tableData,
        options.includeHeaders
      )
      
      let csv = XLSX.utils.sheet_to_csv(worksheet)

      // Add special formatting for summary rows in CSV (comments/annotations)
      if (tableData.analytics?.summaryRows && tableData.analytics.summaryRows.length > 0) {
        console.log("📊 ExportService: Adding analytics info to CSV")
        
        const lines = csv.split('\n')
        const headerOffset = options.includeHeaders ? 1 : 0
        const dataRowsCount = tableData.rows.length
        const summaryStartIndex = headerOffset + dataRowsCount + 1 // +1 for empty separator
        
        // Add comments to identify summary rows
        for (let i = 0; i < tableData.analytics.summaryRows.length; i++) {
          const lineIndex = summaryStartIndex + i
          if (lines[lineIndex]) {
            // CSV doesn't support styling, but we can add comments
            lines[lineIndex] = `# ${lines[lineIndex]}`
          }
        }
        
        csv = lines.join('\n')
        console.log("📊 ExportService: CSV analytics formatting applied")
      }

      const filename = generateFilename(tableData, "csv", options.filename, {
        tableIndex: (options as any).tableIndex,
        batchMode: (options as any).tableIndex !== undefined
      })

      // Создаем data URL для CSV
      const base64 = btoa(unescape(encodeURIComponent(csv)))
      const dataUrl = `data:text/csv;charset=utf-8;base64,${base64}`

      return {
        success: true,
        filename,
        downloadUrl: dataUrl
      }
    } catch (error) {
      console.error("Error exporting to CSV:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }
    }
  }

  private async exportToGoogleSheets(
    tableData: TableData,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const title = options.filename || `${tableData.source}_Table_${Date.now()}`
      
      console.log(`📊 ExportService: Exporting table to Google Sheets: "${title}"`)
      
      // Log analytics status
      if (tableData.analytics?.summaryRows && tableData.analytics.summaryRows.length > 0) {
        console.log(`📊 ExportService: Table includes ${tableData.analytics.summaryRows.length} analytics summary rows`)
      }

      const result = await googleSheetsService.exportTable(tableData, {
        spreadsheetTitle: title,
        sheetTitle: "Table_Data",
        includeHeaders: options.includeHeaders
      })

      if (result.success) {
        console.log(`✅ ExportService: Successfully exported to Google Sheets`)
        
        // Log success with analytics info
        if (tableData.analytics?.summaryRows && tableData.analytics.summaryRows.length > 0) {
          console.log(`📊 ExportService: Google Sheets export completed with analytics data`)
        }
        
        return {
          success: true,
          filename: title,
          downloadUrl: result.spreadsheetUrl || "",
          googleSheetsId: result.spreadsheetId,
          googleSheetsUrl: result.spreadsheetUrl
        }
      } else {
        console.error(`❌ ExportService: Failed to export to Google Sheets: ${result.error}`)
        return {
          success: false,
          error: result.error || "Failed to export to Google Sheets"
        }
      }
    } catch (error) {
      console.error("Error exporting to Google Sheets:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }
    }
  }

  private async exportToDOCX(
    tableData: TableData,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      console.log("📄 ExportService: Starting DOCX export...")

      // Create document header
      const title = tableData.chatTitle && 
        tableData.chatTitle !== `${tableData.source.charAt(0).toUpperCase() + tableData.source.slice(1)}_Chat`
        ? `Table from ${tableData.chatTitle}`
        : `Table from ${tableData.source.charAt(0).toUpperCase() + tableData.source.slice(1)}`

      const headerParagraph = new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 28,
            font: "Calibri"
          })
        ],
        spacing: { after: 200 }
      })

      // Prepare table data including analytics summary rows
      const tableRows: string[][] = []
      
      // Add headers if enabled
      if (options.includeHeaders && tableData.headers.length > 0) {
        tableRows.push(tableData.headers)
      }

      // Add regular data rows
      tableRows.push(...tableData.rows)

      // Add analytics summary rows if available
      if (tableData.analytics?.summaryRows && tableData.analytics.summaryRows.length > 0) {
        console.log("📊 ExportService: Adding analytics summary rows to DOCX")
        
        // Add empty separator row
        tableRows.push(new Array(tableData.headers.length).fill(""))
        
        // Add summary rows
        tableRows.push(...tableData.analytics.summaryRows)
      }

      // Create DOCX table
      const docxRows: TableRow[] = tableRows.map((row, rowIndex) => {
        const isHeaderRow = options.includeHeaders && rowIndex === 0
        const isSummaryRow = tableData.analytics?.summaryRows && 
          rowIndex >= (options.includeHeaders ? 1 : 0) + tableData.rows.length + 1 // +1 for separator

        return new TableRow({
          children: row.map(cell => new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cell || "",
                    bold: isHeaderRow || isSummaryRow,
                    font: "Calibri",
                    size: 22
                  })
                ]
              })
            ],
            width: {
              size: 100 / row.length,
              type: WidthType.PERCENTAGE
            }
          }))
        })
      })

      const docxTable = new Table({
        rows: docxRows,
        width: {
          size: 100,
          type: WidthType.PERCENTAGE
        },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
          insideVertical: { style: BorderStyle.SINGLE, size: 1 }
        }
      })

      // Create document
      const doc = new Document({
        sections: [{
          children: [headerParagraph, docxTable]
        }]
      })

      // Generate file
      const buffer = await Packer.toBuffer(doc)
      const base64 = this.arrayBufferToBase64(buffer)
      const dataUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`
      
      const filename = generateFilename(tableData, "docx", options.filename, {
        tableIndex: (options as any).tableIndex,
        batchMode: (options as any).tableIndex !== undefined
      })

      console.log("✅ ExportService: DOCX export completed")
      if (tableData.analytics?.summaryRows) {
        console.log("📊 ExportService: DOCX export included analytics")
      }

      return {
        success: true,
        filename,
        downloadUrl: dataUrl
      }
    } catch (error) {
      console.error("Error exporting to DOCX:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }
    }
  }

  private async exportToPDF(
    tableData: TableData,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      console.log("📄 ExportService: Starting PDF export...")

      // Create PDF document
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true
      })

      // Helper function for safe text encoding
      const encodeTextForPDF = (text: string): string => {
        if (!text) return ""
        return text
          .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove invisible chars
          .replace(/\u00A0/g, " ") // Non-breaking spaces to regular spaces
          .normalize("NFKC")
          .trim()
      }

      // Add title
      const title = tableData.chatTitle && 
        tableData.chatTitle !== `${tableData.source.charAt(0).toUpperCase() + tableData.source.slice(1)}_Chat`
        ? `Table from ${tableData.chatTitle}`
        : `Table from ${tableData.source.charAt(0).toUpperCase() + tableData.source.slice(1)}`

      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.setTextColor(40, 40, 40)

      const pageWidth = doc.internal.pageSize.getWidth()
      const titleWidth = doc.getTextWidth(encodeTextForPDF(title))
      const titleX = (pageWidth - titleWidth) / 2

      doc.text(encodeTextForPDF(title), titleX, 20)

      // Prepare table data
      const tableData_processed: string[][] = []
      
      // Add headers if enabled
      if (options.includeHeaders && tableData.headers.length > 0) {
        tableData_processed.push(tableData.headers.map(encodeTextForPDF))
      }

      // Add regular data rows
      tableData.rows.forEach(row => {
        tableData_processed.push(row.map(encodeTextForPDF))
      })

      // Add analytics summary rows if available
      let summaryStartIndex = -1
      if (tableData.analytics?.summaryRows && tableData.analytics.summaryRows.length > 0) {
        console.log("📊 ExportService: Adding analytics summary rows to PDF")
        
        // Add empty separator row
        tableData_processed.push(new Array(tableData.headers.length).fill(""))
        
        // Mark where summary rows start
        summaryStartIndex = tableData_processed.length
        
        // Add summary rows
        tableData.analytics.summaryRows.forEach(row => {
          tableData_processed.push(row.map(encodeTextForPDF))
        })
      }

      // Create autoTable with styling for summary rows
      const autoTableOptions: any = {
        head: options.includeHeaders ? [tableData_processed[0]] : undefined,
        body: options.includeHeaders ? tableData_processed.slice(1) : tableData_processed,
        startY: 30,
        styles: {
          fontSize: 9,
          cellPadding: 3,
          font: 'helvetica'
        },
        headStyles: {
          fillColor: [52, 73, 94],
          textColor: 255,
          fontStyle: 'bold'
        },
        didParseCell: function(data: any) {
          // Style summary rows
          if (summaryStartIndex >= 0) {
            const actualRowIndex = options.includeHeaders ? data.row.index + 1 : data.row.index
            if (actualRowIndex >= summaryStartIndex) {
              data.cell.styles.fontStyle = 'bold'
              data.cell.styles.fillColor = [245, 245, 245]
            }
          }
        }
      }

      autoTable(doc, autoTableOptions)

      // Add footer
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)

        const footerText = `Generated at ${new Date().toLocaleString()} • Page ${i} of ${pageCount} • TabXport`
        const encodedFooterText = encodeTextForPDF(footerText)
        const footerWidth = doc.getTextWidth(encodedFooterText)
        const footerX = (pageWidth - footerWidth) / 2

        doc.text(encodedFooterText, footerX, doc.internal.pageSize.getHeight() - 10)
      }

      // Generate PDF
      const pdfArrayBuffer = doc.output("arraybuffer")
      const base64 = this.arrayBufferToBase64(pdfArrayBuffer)
      const dataUrl = `data:application/pdf;base64,${base64}`
      
      const filename = generateFilename(tableData, "pdf", options.filename, {
        tableIndex: (options as any).tableIndex,
        batchMode: (options as any).tableIndex !== undefined
      })

      console.log("✅ ExportService: PDF export completed")
      if (tableData.analytics?.summaryRows) {
        console.log("📊 ExportService: PDF export included analytics")
      }

      return {
        success: true,
        filename,
        downloadUrl: dataUrl
      }
    } catch (error) {
      console.error("Error exporting to PDF:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }
    }
  }

  public async exportTable(
    tableData: TableData,
    options: ExportOptions
  ): Promise<ExportResult> {
    console.log("ExportService: Starting export with options:", options)
    console.log("ExportService: Table data:", tableData)

    try {
      // Step 1: Apply analytics if enabled
      let processedTableData = tableData
      let analyticsApplied = false
      let analyticsErrors: any[] = []

      const userSettings = await getUserSettings()
      
      // Check if analytics should be applied
      const shouldApplyAnalytics = userSettings.analytics?.enabled && 
                                   (options.analytics?.enabled !== false) // Allow override in options
      
      if (shouldApplyAnalytics) {
        console.log("📊 ExportService: Analytics enabled, applying analysis...")
        
        const analyticsResult = await analyticsService.analyzeTable(
          tableData, 
          userSettings.analytics!
        )
        
        if (analyticsResult.success && analyticsResult.data) {
          processedTableData = analyticsResult.data
          analyticsApplied = true
          console.log("✅ ExportService: Analytics applied successfully")
          console.log("📊 Analytics summary:", processedTableData.analytics)
        } else {
          console.warn("⚠️ ExportService: Analytics failed:", analyticsResult.error)
          analyticsErrors.push(analyticsResult.error)
          // Continue with original data even if analytics failed
        }
      } else {
        console.log("📊 ExportService: Analytics disabled, proceeding without analysis")
      }

      // Step 2: Export processed data
      let exportResult: ExportResult

      switch (options.format) {
        case "xlsx":
          exportResult = await this.exportToXLSX(processedTableData, options)
          break
        case "csv":
          exportResult = await this.exportToCSV(processedTableData, options)
          break
        case "google_sheets":
          exportResult = await this.exportToGoogleSheets(processedTableData, options)
          break
        case "docx":
          exportResult = await this.exportToDOCX(processedTableData, options)
          break
        case "pdf":
          exportResult = await this.exportToPDF(processedTableData, options)
          break
        default:
          return {
            success: false,
            error: `Unsupported format: ${options.format}`
          }
      }

      // Step 3: Add analytics metadata to export result
      if (exportResult.success) {
        exportResult.analyticsApplied = analyticsApplied
        if (analyticsErrors.length > 0) {
          exportResult.analyticsErrors = analyticsErrors
        }
        
        if (analyticsApplied) {
          console.log("📊 ExportService: Export completed with analytics")
        }
      }

      return exportResult

    } catch (error) {
      console.error("ExportService: Export error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }
    }
  }
}

