import type { ColumnDataType, SummaryRow, AnalyticsSettings } from "../../types"

/**
 * Utility functions for AnalyticsService
 */

/**
 * Formats numeric values for display in summary rows
 */
export const formatNumericValue = (value: number, type: 'sum' | 'average' | 'count'): string => {
  switch (type) {
    case 'sum':
      return value.toLocaleString() // Add commas for large numbers
    case 'average':
      return value.toFixed(2) // 2 decimal places for averages
    case 'count':
      return value.toString() // Simple count
    default:
      return value.toString()
  }
}

/**
 * Determines if a column type supports numerical calculations
 */
export const isNumericType = (dataType: ColumnDataType): boolean => {
  return ['number', 'currency', 'percentage'].includes(dataType)
}

/**
 * Determines if a column type supports text-based calculations
 */
export const isTextType = (dataType: ColumnDataType): boolean => {
  return ['text', 'mixed'].includes(dataType)
}

/**
 * Generates a human-readable label for summary rows
 */
export const generateSummaryLabel = (type: SummaryRow['type']): string => {
  const labels: Record<SummaryRow['type'], string> = {
    sum: 'SUM',
    average: 'AVERAGE', 
    count: 'COUNT',
    unique: 'UNIQUE',
    min: 'MIN',
    max: 'MAX'
  }
  
  return labels[type] || type.toUpperCase()
}

/**
 * Validates analytics settings and returns any warnings
 */
export const validateAnalyticsSettings = (settings: AnalyticsSettings): string[] => {
  const warnings: string[] = []
  
  if (!settings.enabled) {
    warnings.push('Analytics is disabled')
    return warnings
  }
  
  if (!settings.calculateSums && !settings.calculateAverages && !settings.countUnique) {
    warnings.push('No calculation types are enabled')
  }
  
  return warnings
}

/**
 * Checks if a table has any numeric data for calculations
 */
export const hasNumericData = (columnTypes: Record<string, ColumnDataType>): boolean => {
  return Object.values(columnTypes).some(type => isNumericType(type))
}

/**
 * Checks if a table has any text data for counting
 */
export const hasTextData = (columnTypes: Record<string, ColumnDataType>): boolean => {
  return Object.values(columnTypes).some(type => isTextType(type))
}

/**
 * Creates a safe column name for analytics operations
 */
export const sanitizeColumnName = (name: string): string => {
  return name.trim().replace(/[^a-zA-Z0-9_]/g, '_')
}

/**
 * Detects currency patterns in string values
 */
export const detectCurrencyPattern = (values: string[]): boolean => {
  const currencyPatterns = [
    /^\$[\d,]+\.?\d*$/, // $1,234.56
    /^[\d,]+\.?\d*\s*USD$/, // 1234.56 USD
    /^[\d,]+\.?\d*\s*EUR$/, // 1234.56 EUR
    /^€[\d,]+\.?\d*$/ // €1,234.56
  ]
  
  const nonEmptyValues = values.filter(v => v.trim() !== '')
  if (nonEmptyValues.length === 0) return false
  
  let currencyCount = 0
  for (const value of nonEmptyValues) {
    if (currencyPatterns.some(pattern => pattern.test(value.trim()))) {
      currencyCount++
    }
  }
  
  return currencyCount / nonEmptyValues.length >= 0.7 // 70% threshold
}

/**
 * Detects percentage patterns in string values
 */
export const detectPercentagePattern = (values: string[]): boolean => {
  const percentagePattern = /^[\d,]+\.?\d*\s*%$/
  
  const nonEmptyValues = values.filter(v => v.trim() !== '')
  if (nonEmptyValues.length === 0) return false
  
  let percentageCount = 0
  for (const value of nonEmptyValues) {
    if (percentagePattern.test(value.trim())) {
      percentageCount++
    }
  }
  
  return percentageCount / nonEmptyValues.length >= 0.7 // 70% threshold
}

/**
 * Extracts numeric value from currency or percentage strings
 */
export const extractNumericValue = (value: string): number | null => {
  // Remove currency symbols, commas, spaces, and percentage signs
  const cleaned = value.trim()
    .replace(/[$€£¥]/g, '') // Currency symbols
    .replace(/[,%]/g, '') // Commas and percentage
    .replace(/\s+(USD|EUR|GBP|JPY)$/i, '') // Currency codes
    .trim()
  
  if (cleaned === '' || cleaned === '-' || cleaned === 'N/A') {
    return null
  }
  
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/**
 * Generates analytics summary for debugging/logging
 */
export const generateAnalyticsSummary = (
  columnTypes: Record<string, ColumnDataType>,
  summaryRows: string[][],
  settings: AnalyticsSettings
): string => {
  const numericColumns = Object.entries(columnTypes)
    .filter(([_, type]) => isNumericType(type))
    .map(([name, _]) => name)
  
  const textColumns = Object.entries(columnTypes)
    .filter(([_, type]) => isTextType(type))
    .map(([name, _]) => name)
  
  return `
📊 Analytics Summary:
- Settings: ${JSON.stringify(settings)}
- Numeric columns (${numericColumns.length}): ${numericColumns.join(', ')}
- Text columns (${textColumns.length}): ${textColumns.join(', ')}
- Summary rows generated: ${summaryRows.length}
- Calculations applied: ${summaryRows.map(row => row[0]).join(', ')}
  `.trim()
} 