import type { 
  TableData, 
  AnalyticsSettings, 
  ColumnMetadata, 
  SummaryRow, 
  AnalysisError,
  ColumnDataType,
  SummaryType 
} from "../../types"
import { 
  formatNumericValue,
  isNumericType,
  isTextType,
  generateSummaryLabel,
  validateAnalyticsSettings,
  hasNumericData,
  hasTextData,
  detectCurrencyPattern,
  detectPercentagePattern,
  extractNumericValue,
  generateAnalyticsSummary
} from "./utils"

/**
 * AnalyticsService - Core service for table data analysis and summarization
 * 
 * Features:
 * - Automatic column data type detection
 * - Statistical calculations (SUM, AVERAGE, COUNT)
 * - Summary row generation 
 * - Error handling for malformed data
 */
export class AnalyticsService {
  
  /**
   * Analyzes table data and applies analytics based on settings
   */
  public async analyzeTable(
    tableData: TableData,
    settings: AnalyticsSettings
  ): Promise<{ success: boolean; data?: TableData; error?: AnalysisError }> {
    try {
      if (!settings.enabled) {
        console.log("📊 AnalyticsService: Analytics disabled, returning original data")
        return { success: true, data: tableData }
      }

      console.log("📊 AnalyticsService: Starting table analysis...")
      console.log("📊 Table headers:", tableData.headers)
      console.log("📊 Table rows count:", tableData.rows.length)
      console.log("📊 Analytics settings:", settings)

      // Validate settings first
      const warnings = validateAnalyticsSettings(settings)
      if (warnings.length > 0) {
        console.warn("⚠️ Analytics warnings:", warnings)
      }

      // Step 1: Detect column data types
      const columnMetadata = this.detectColumnTypes(tableData)
      console.log("📊 Column metadata:", columnMetadata)

      // Step 2: Calculate summaries based on settings
      const summaryRows = this.calculateSummaries(tableData, columnMetadata, settings)
      console.log("📊 Generated summary rows:", summaryRows)

             // Step 3: Create enhanced table data with analytics
       const columnTypes: Record<string, ColumnDataType> = {}
       columnMetadata.forEach(meta => {
         columnTypes[meta.name] = meta.dataType
       })

       // Convert SummaryRow[] to string[][] for TableData.analytics
       const summaryRowData: string[][] = summaryRows.map(row => row.values)

       const enhancedTableData: TableData = {
         ...tableData,
         analytics: {
           columnTypes,
           summaryRows: summaryRowData,
           errors: [] // Will be populated if validation errors occur
         }
       }

             // Generate analytics summary for logging
       const summary = generateAnalyticsSummary(columnTypes, summaryRowData, settings)
       console.log(summary)

       console.log("✅ AnalyticsService: Analysis completed successfully")
       return { success: true, data: enhancedTableData }

    } catch (error) {
      console.error("❌ AnalyticsService: Analysis failed:", error)
      
             const analysisError: AnalysisError = {
         type: "calculation_error",
         columnName: "general",
         message: error instanceof Error ? error.message : "Unknown analysis error",
         severity: "high"
       }

      return { success: false, error: analysisError }
    }
  }

  /**
   * Detects the data type of each column based on its values
   */
  private detectColumnTypes(tableData: TableData): ColumnMetadata[] {
    console.log("🔍 AnalyticsService: Detecting column types...")
    
    const metadata: ColumnMetadata[] = tableData.headers.map((header, columnIndex) => {
      const columnValues = tableData.rows.map(row => row[columnIndex] || "")
      const dataType = this.inferColumnDataType(columnValues)
      
      console.log(`🔍 Column "${header}" (index ${columnIndex}): ${dataType}`)
      
             return {
         name: header,
         dataType,
         hasErrors: false, // Will be updated if errors are detected
         sampleValues: columnValues.slice(0, 3) // First 3 values for reference
       }
    })

    return metadata
  }

  /**
   * Infers the data type of a column based on its values
   */
     private inferColumnDataType(values: string[]): ColumnDataType {
     const nonEmptyValues = values.filter(v => v.trim() !== "")
     
     if (nonEmptyValues.length === 0) {
       return "text"
     }

     // Check for specific patterns first
     if (detectCurrencyPattern(nonEmptyValues)) {
       return "currency"
     }

     if (detectPercentagePattern(nonEmptyValues)) {
       return "percentage"
     }

     let numericCount = 0
     let dateCount = 0
     let booleanCount = 0

     for (const value of nonEmptyValues) {
       const trimmedValue = value.trim().toLowerCase()
       
       // Check if it's a boolean
       if (trimmedValue === 'true' || trimmedValue === 'false' || 
           trimmedValue === 'yes' || trimmedValue === 'no') {
         booleanCount++
         continue
       }

       // Check if it's a number
       const numericValue = extractNumericValue(value)
       if (numericValue !== null) {
         numericCount++
         continue
       }

       // Check if it's a date
       if (this.isDateValue(value)) {
         dateCount++
         continue
       }
     }

     const total = nonEmptyValues.length
     
     // If 80%+ are boolean, consider it boolean
     if (booleanCount / total >= 0.8) {
       return "boolean"
     }
     
     // If 80%+ are numeric, consider it number
     if (numericCount / total >= 0.8) {
       return "number"
     }
     
     // If 80%+ are dates, consider it date
     if (dateCount / total >= 0.8) {
       return "date"
     }

     // If mixed types, consider it mixed
     if ((numericCount + dateCount + booleanCount) / total >= 0.5) {
       return "mixed"
     }

     // Default to text
     return "text"
   }

  /**
   * Parses a string value as a number, returning null if not numeric
   */
     private parseNumericValue(value: string): number | null {
     return extractNumericValue(value)
   }

  /**
   * Checks if a string value represents a date
   */
  private isDateValue(value: string): boolean {
    const trimmed = value.trim()
    
    if (trimmed === "" || trimmed.length < 4) {
      return false
    }

    const date = new Date(trimmed)
    return !isNaN(date.getTime()) && date.getFullYear() > 1900
  }

  /**
   * Calculates summary rows based on column metadata and settings
   */
  private calculateSummaries(
    tableData: TableData,
    columnMetadata: ColumnMetadata[],
    settings: AnalyticsSettings
  ): SummaryRow[] {
    console.log("🧮 AnalyticsService: Calculating summaries...")
    
    const summaryRows: SummaryRow[] = []

    // Calculate sums for numeric columns
    if (settings.calculateSums) {
      const sumRow = this.calculateSumRow(tableData, columnMetadata)
      if (sumRow) {
        summaryRows.push(sumRow)
      }
    }

    // Calculate averages for numeric columns
    if (settings.calculateAverages) {
      const avgRow = this.calculateAverageRow(tableData, columnMetadata)
      if (avgRow) {
        summaryRows.push(avgRow)
      }
    }

    // Count unique values for text columns
    if (settings.countUnique) {
      const countRow = this.calculateUniqueCountRow(tableData, columnMetadata)
      if (countRow) {
        summaryRows.push(countRow)
      }
    }

    console.log(`🧮 Generated ${summaryRows.length} summary rows`)
    return summaryRows
  }

  /**
   * Calculates sum row for numeric columns
   */
     private calculateSumRow(tableData: TableData, columnMetadata: ColumnMetadata[]): SummaryRow | null {
     const values: string[] = new Array(tableData.headers.length).fill("")
     let hasNumericData = false

          columnMetadata.forEach((meta, index) => {
       if (isNumericType(meta.dataType)) {
         const columnValues = tableData.rows.map(row => row[index] || "")
         const numericValues = columnValues
           .map(v => this.parseNumericValue(v))
           .filter(v => v !== null) as number[]

         if (numericValues.length > 0) {
           const sum = numericValues.reduce((acc, val) => acc + val, 0)
           values[index] = formatNumericValue(sum, 'sum')
           hasNumericData = true
         }
       } else if (index === 0) {
         values[index] = generateSummaryLabel('sum')
       }
     })

         return hasNumericData ? {
       type: "sum",
       label: "SUM",
       values
     } : null
  }

  /**
   * Calculates average row for numeric columns
   */
     private calculateAverageRow(tableData: TableData, columnMetadata: ColumnMetadata[]): SummaryRow | null {
     const values: string[] = new Array(tableData.headers.length).fill("")
     let hasNumericData = false

          columnMetadata.forEach((meta, index) => {
       if (isNumericType(meta.dataType)) {
         const columnValues = tableData.rows.map(row => row[index] || "")
         const numericValues = columnValues
           .map(v => this.parseNumericValue(v))
           .filter(v => v !== null) as number[]

         if (numericValues.length > 0) {
           const avg = numericValues.reduce((acc, val) => acc + val, 0) / numericValues.length
           values[index] = formatNumericValue(avg, 'average')
           hasNumericData = true
         }
       } else if (index === 0) {
         values[index] = generateSummaryLabel('average')
       }
     })

         return hasNumericData ? {
       type: "average",
       label: "AVERAGE",
       values
     } : null
  }

  /**
   * Calculates unique count row for text columns
   */
  private calculateUniqueCountRow(tableData: TableData, columnMetadata: ColumnMetadata[]): SummaryRow | null {
    const values: string[] = new Array(tableData.headers.length).fill("")
    let hasTextData = false

         columnMetadata.forEach((meta, index) => {
       if (isTextType(meta.dataType)) {
         const columnValues = tableData.rows.map(row => row[index] || "")
         const nonEmptyValues = columnValues.filter(v => v.trim() !== "")
         const uniqueValues = new Set(nonEmptyValues)
         
         if (uniqueValues.size > 0) {
           values[index] = `${uniqueValues.size} unique`
           hasTextData = true
         }
       } else if (isNumericType(meta.dataType) || meta.dataType === "date") {
         const columnValues = tableData.rows.map(row => row[index] || "")
         const nonEmptyValues = columnValues.filter(v => v.trim() !== "")
         values[index] = `${nonEmptyValues.length} values`
       } else if (index === 0) {
         values[index] = generateSummaryLabel('count')
       }
     })

         return hasTextData ? {
       type: "count",
       label: "COUNT", 
       values
     } : null
  }

  /**
   * Validates table data before analysis
   */
  private validateTableData(tableData: TableData): AnalysisError | null {
         if (!tableData.headers || tableData.headers.length === 0) {
       return {
         type: "empty_column",
         columnName: "headers",
         message: "Table has no headers",
         severity: "high"
       }
     }

     if (!tableData.rows || tableData.rows.length === 0) {
       return {
         type: "empty_column",
         columnName: "data",
         message: "Table has no data rows",
         severity: "high"
       }
     }

    return null
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService() 