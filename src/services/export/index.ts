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

  /**
   * Export multiple tables to a single combined file with analytics support
   */
  public async combineTables(
    tables: TableData[],
    options: ExportOptions & { combinedFileName?: string }
  ): Promise<ExportResult> {
    try {
      console.log(`🔄 ExportService: Starting combined export for ${tables.length} tables`)

      if (tables.length === 0) {
        return {
          success: false,
          error: "No tables to export"
        }
      }

      // Get user settings for analytics
      const userSettings = await getUserSettings()

      // Apply analytics to each table if enabled
      const processedTables = await Promise.all(
        tables.map(async (table) => {
          // Fixed analytics logic: check both options and user settings
          const analyticsFromOptions = options.analytics?.enabled === true
          const analyticsFromSettings = userSettings.analytics?.enabled === true
          const shouldApplyAnalytics = analyticsFromOptions || analyticsFromSettings

          console.log(`📊 ExportService: Analytics check for table ${table.id}:`, {
            analyticsFromOptions,
            analyticsFromSettings, 
            shouldApplyAnalytics,
            optionsAnalytics: options.analytics,
            userAnalytics: userSettings.analytics
          })

          if (shouldApplyAnalytics && userSettings.analytics) {
            console.log(`📊 ExportService: Applying analytics to table ${table.id}`)
            const analyticsResult = await analyticsService.analyzeTable(table, userSettings.analytics)
            
            if (analyticsResult.success && analyticsResult.data) {
              // Fixed: analyticsResult.data already contains the enhanced table
              return analyticsResult.data
            } else {
              console.warn(`⚠️ ExportService: Analytics failed for table ${table.id}: ${analyticsResult.error}`)
            }
          } else {
            console.log(`📊 ExportService: Skipping analytics for table ${table.id}`)
          }
          
          return table
        })
      )

      // Generate combined file based on format
      switch (options.format) {
        case "xlsx":
          return await this.exportCombinedXLSX(processedTables, options)
        case "csv":
          return await this.exportCombinedCSV(processedTables, options)
        case "docx":
          return await this.exportCombinedDOCX(processedTables, options)
        case "pdf":
          return await this.exportCombinedPDF(processedTables, options)
        case "google_sheets":
          return await this.exportCombinedGoogleSheets(processedTables, options)
        default:
          return {
            success: false,
            error: `Unsupported format for combined export: ${options.format}`
          }
      }
    } catch (error) {
      console.error("Error in combined tables export:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }
    }
  }

  private async exportCombinedXLSX(
    tables: TableData[],
    options: ExportOptions & { combinedFileName?: string }
  ): Promise<ExportResult> {
    try {
      console.log(`📊 ExportService: Creating combined XLSX with ${tables.length} sheets`)

      const workbook = XLSX.utils.book_new()
      const existingSheetNames = new Set<string>()

      tables.forEach((table, index) => {
        // Generate unique sheet name
        const baseSheetName = table.chatTitle && 
          table.chatTitle !== `${table.source}_Chat`
          ? table.chatTitle.replace(/[^\w\s-]/g, "").trim().substring(0, 25)
          : `Table_${index + 1}`
          
        let sheetName = baseSheetName
        let counter = 1
        while (existingSheetNames.has(sheetName)) {
          sheetName = `${baseSheetName}_${counter}`
          counter++
        }
        existingSheetNames.add(sheetName)

        // Create worksheet with analytics support
        const worksheet = this.tableDataToWorksheet(table, options.includeHeaders)
        
        // Apply analytics styling if available
        if (table.analytics?.summaryRows) {
          this.applySummaryRowStyling(worksheet, table, options.includeHeaders || true)
        }

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
        console.log(`✅ ExportService: Added sheet "${sheetName}" ${table.analytics?.summaryRows ? 'with analytics' : ''}`)
      })

      // Generate filename
      const baseFilename = options.combinedFileName || "Combined_Tables"
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
      const filename = `${baseFilename}_${timestamp}.xlsx`

      // Write workbook
      const arrayBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
      const base64 = this.arrayBufferToBase64(arrayBuffer)
      const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`

      console.log(`✅ ExportService: Combined XLSX export completed with analytics`)

      return {
        success: true,
        filename,
        downloadUrl: dataUrl,
        analyticsApplied: tables.some(t => t.analytics?.summaryRows)
      }
    } catch (error) {
      console.error("Error in combined XLSX export:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }
    }
  }

  private async exportCombinedCSV(
    tables: TableData[],
    options: ExportOptions & { combinedFileName?: string }
  ): Promise<ExportResult> {
    try {
      console.log(`📄 ExportService: Creating combined CSV with ${tables.length} sections`)

      const csvSections: string[] = []

      tables.forEach((table, index) => {
        // Add section separator (except for first table)
        if (index > 0) {
          csvSections.push("") // Empty line separator
        }

        // Generate section title
        const sectionTitle = table.chatTitle && 
          table.chatTitle !== `${table.source}_Chat`
          ? `Table ${index + 1}: ${table.chatTitle}`
          : `Table ${index + 1}: ${table.source.charAt(0).toUpperCase() + table.source.slice(1)} Data`

        csvSections.push(`=== ${sectionTitle} ===`)
        csvSections.push("") // Empty line after title

        // Convert table to CSV data
        const tableData: string[][] = []

        if (options.includeHeaders && table.headers.length > 0) {
          tableData.push(table.headers)
        }

        tableData.push(...table.rows)

        // Add analytics summary rows if available
        if (table.analytics?.summaryRows && table.analytics.summaryRows.length > 0) {
          console.log(`📊 ExportService: Adding analytics to CSV section ${index + 1}`)
          tableData.push([]) // Empty separator row
          table.analytics.summaryRows.forEach(row => {
            tableData.push(row.map(cell => `# ${cell}`)) // Add comment prefix for CSV
          })
        }

        // Convert to CSV format
        const csvRows = tableData.map((row) =>
          row
            .map((cell) => {
              const cleanCell = (cell || "").toString().trim()
              if (
                cleanCell.includes(",") ||
                cleanCell.includes('"') ||
                cleanCell.includes("\n")
              ) {
                return `"${cleanCell.replace(/"/g, '""')}"`
              }
              return cleanCell
            })
            .join(",")
        )

        csvSections.push(...csvRows)
      })

      // Join all sections
      const combinedCSV = csvSections.join("\n")

      // Generate filename
      const baseFilename = options.combinedFileName || "Combined_Tables"
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
      const filename = `${baseFilename}_${timestamp}.csv`

      // Create data URL
      const base64 = btoa(unescape(encodeURIComponent(combinedCSV)))
      const dataUrl = `data:text/csv;charset=utf-8;base64,${base64}`

      console.log(`✅ ExportService: Combined CSV export completed with analytics`)

      return {
        success: true,
        filename,
        downloadUrl: dataUrl,
        analyticsApplied: tables.some(t => t.analytics?.summaryRows)
      }
    } catch (error) {
      console.error("Error in combined CSV export:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }
    }
  }

  private async exportCombinedDOCX(
    tables: TableData[],
    options: ExportOptions & { combinedFileName?: string }
  ): Promise<ExportResult> {
    try {
      console.log(`📝 ExportService: Creating combined DOCX with ${tables.length} tables`)

      const documentElements: (Paragraph | Table)[] = []

      // Add main document title
      const mainTitle = options.combinedFileName || "Combined Tables Report"
      documentElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: mainTitle,
              bold: true,
              size: 36,
              font: "Calibri"
            })
          ],
          spacing: { after: 400 }
        })
      )

      // Process each table
      tables.forEach((table, index) => {
        // Generate section title
        const sectionTitle = table.chatTitle && 
          table.chatTitle !== `${table.source}_Chat`
          ? `Table ${index + 1}: ${table.chatTitle}`
          : `Table ${index + 1}: ${table.source.charAt(0).toUpperCase() + table.source.slice(1)} Data`

        // Add section title
        documentElements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: sectionTitle,
                bold: true,
                size: 28,
                font: "Calibri"
              })
            ],
            spacing: {
              before: index === 0 ? 200 : 600,
              after: 200
            }
          })
        )

        // Prepare table data including analytics
        const tableRows: string[][] = []
        
        if (options.includeHeaders && table.headers.length > 0) {
          tableRows.push(table.headers)
        }

        tableRows.push(...table.rows)

        // Add analytics summary rows if available
        if (table.analytics?.summaryRows && table.analytics.summaryRows.length > 0) {
          console.log(`📊 ExportService: Adding analytics to DOCX table ${index + 1}`)
          tableRows.push(new Array(table.headers.length).fill("")) // Separator
          tableRows.push(...table.analytics.summaryRows)
        }

        // Create DOCX table
        const docxRows: TableRow[] = tableRows.map((row, rowIndex) => {
          const isHeaderRow = options.includeHeaders && rowIndex === 0
          const isSummaryRow = table.analytics?.summaryRows && 
            rowIndex >= (options.includeHeaders ? 1 : 0) + table.rows.length + 1

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

        documentElements.push(docxTable)
      })

      // Add footer
      documentElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `\nDocument generated at ${new Date().toLocaleString()}`,
              italics: true,
              size: 18,
              color: "666666",
              font: "Calibri"
            })
          ],
          spacing: { before: 400 }
        })
      )

      // Create document
      const doc = new Document({
        sections: [{
          children: documentElements
        }]
      })

      // Generate file
      const buffer = await Packer.toBuffer(doc)
      const base64 = this.arrayBufferToBase64(buffer)
      const dataUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`
      
      const baseFilename = options.combinedFileName || "Combined_Tables"
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
      const filename = `${baseFilename}_${timestamp}.docx`

      console.log(`✅ ExportService: Combined DOCX export completed with analytics`)

      return {
        success: true,
        filename,
        downloadUrl: dataUrl,
        analyticsApplied: tables.some(t => t.analytics?.summaryRows)
      }
    } catch (error) {
      console.error("Error in combined DOCX export:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }
    }
  }

  private async exportCombinedPDF(
    tables: TableData[],
    options: ExportOptions & { combinedFileName?: string }
  ): Promise<ExportResult> {
    try {
      console.log(`📋 ExportService: Creating combined PDF with ${tables.length} tables`)

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
          .replace(/[\u200B-\u200D\uFEFF]/g, "")
          .replace(/\u00A0/g, " ")
          .normalize("NFKC")
          .trim()
      }

      const pageHeight = doc.internal.pageSize.getHeight()
      const pageWidth = doc.internal.pageSize.getWidth()
      let currentY = 20

      // Add main document title
      const mainTitle = options.combinedFileName || "Combined Tables Report"
      doc.setFont("helvetica", "bold")
      doc.setFontSize(18)
      doc.setTextColor(40, 40, 40)

      const mainTitleWidth = doc.getTextWidth(encodeTextForPDF(mainTitle))
      const mainTitleX = (pageWidth - mainTitleWidth) / 2

      doc.text(encodeTextForPDF(mainTitle), mainTitleX, currentY)
      currentY += 25

      // Process each table
      tables.forEach((table, index) => {
        console.log(`📋 ExportService: Processing PDF table ${index + 1}/${tables.length}`)

        // Check if we need a new page
        if (currentY > pageHeight - 60) {
          doc.addPage()
          currentY = 20
        }

        // Add section title
        const sectionTitle = table.chatTitle && 
          table.chatTitle !== `${table.source}_Chat`
          ? `Table ${index + 1}: ${table.chatTitle}`
          : `Table ${index + 1}: ${table.source.charAt(0).toUpperCase() + table.source.slice(1)} Data`

        doc.setFont("helvetica", "bold")
        doc.setFontSize(14)
        doc.setTextColor(60, 60, 60)
        doc.text(encodeTextForPDF(sectionTitle), 20, currentY)
        currentY += 15

        // Prepare table data
        const tableData_processed: string[][] = []
        
        if (options.includeHeaders && table.headers.length > 0) {
          tableData_processed.push(table.headers.map(encodeTextForPDF))
        }

        table.rows.forEach(row => {
          tableData_processed.push(row.map(encodeTextForPDF))
        })

        // Add analytics summary rows if available
        let summaryStartIndex = -1
        if (table.analytics?.summaryRows && table.analytics.summaryRows.length > 0) {
          console.log(`📊 ExportService: Adding analytics to PDF table ${index + 1}`)
          summaryStartIndex = tableData_processed.length
          table.analytics.summaryRows.forEach(row => {
            tableData_processed.push(row.map(encodeTextForPDF))
          })
        }

        // Add table to PDF
        ;(autoTable as any)(doc, {
          head: options.includeHeaders && table.headers.length > 0 ? [table.headers.map(encodeTextForPDF)] : [],
          body: tableData_processed.slice(options.includeHeaders ? 1 : 0),
          startY: currentY,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          didParseCell: (data: any) => {
            // Style summary rows
            if (summaryStartIndex >= 0 && data.row.index >= summaryStartIndex - (options.includeHeaders ? 1 : 0)) {
              data.cell.styles.fillColor = [220, 220, 220]
              data.cell.styles.fontStyle = "bold"
            }
          },
          margin: { left: 20, right: 20 }
        })

        currentY = (doc as any).lastAutoTable.finalY + 20

        // Add page break between tables (except for last one)
        if (index < tables.length - 1) {
          doc.addPage()
          currentY = 20
        }
      })

      // Add footer
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)

        const footerText = `Generated at ${new Date().toLocaleString()} • Page ${i} of ${pageCount} • TabXport`
        const footerWidth = doc.getTextWidth(encodeTextForPDF(footerText))
        const footerX = (pageWidth - footerWidth) / 2

        doc.text(encodeTextForPDF(footerText), footerX, pageHeight - 10)
      }

      // Generate file
      const pdfArrayBuffer = doc.output("arraybuffer")
      const base64 = this.arrayBufferToBase64(pdfArrayBuffer)
      const dataUrl = `data:application/pdf;base64,${base64}`

      const baseFilename = options.combinedFileName || "Combined_Tables"
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
      const filename = `${baseFilename}_${timestamp}.pdf`

      console.log(`✅ ExportService: Combined PDF export completed with analytics`)

      return {
        success: true,
        filename,
        downloadUrl: dataUrl,
        analyticsApplied: tables.some(t => t.analytics?.summaryRows)
      }
    } catch (error) {
      console.error("Error in combined PDF export:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }
    }
  }

  private async exportCombinedGoogleSheets(
    tables: TableData[],
    options: ExportOptions & { combinedFileName?: string }
  ): Promise<ExportResult> {
    try {
      console.log(`🟢 ExportService: Creating combined Google Sheets with ${tables.length} sheets`)

      const baseTitle = options.combinedFileName || "Combined_Tables"
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
      const spreadsheetTitle = `${baseTitle}_${timestamp}`

      // Use Google Sheets service to export multiple tables
      const result = await googleSheetsService.exportMultipleTables(tables, {
        spreadsheetTitle: spreadsheetTitle,
        includeHeaders: options.includeHeaders || true
      })

      if (result.success) {
        console.log(`✅ ExportService: Combined Google Sheets export completed with analytics`)
        return {
          success: true,
          filename: spreadsheetTitle,
          downloadUrl: result.spreadsheetUrl || "",
          googleSheetsId: result.spreadsheetId,
          googleSheetsUrl: result.spreadsheetUrl,
          analyticsApplied: tables.some(t => t.analytics?.summaryRows)
        }
      } else {
        return {
          success: false,
          error: result.error || "Failed to export to Google Sheets"
        }
      }
    } catch (error) {
      console.error("Error in combined Google Sheets export:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }
    }
  }
}

