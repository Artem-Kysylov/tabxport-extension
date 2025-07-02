/**
 * Analytics Module - Main export file
 * 
 * This module provides comprehensive table data analysis and summarization
 * capabilities for the TableXport extension.
 */

// Main service export
export { AnalyticsService, analyticsService } from './index'

// Utility functions export  
export {
  formatNumericValue,
  isNumericType,
  isTextType,
  generateSummaryLabel,
  validateAnalyticsSettings,
  hasNumericData,
  hasTextData,
  sanitizeColumnName,
  detectCurrencyPattern,
  detectPercentagePattern,
  extractNumericValue,
  generateAnalyticsSummary
} from './utils'

// Re-export types for convenience
export type {
  AnalyticsSettings,
  ColumnMetadata,
  SummaryRow,
  AnalysisError,
  ColumnDataType,
  SummaryType
} from '../../types'

/**
 * Analytics Module Information
 */
export const ANALYTICS_MODULE_INFO = {
  name: 'TableXport Analytics',
  version: '1.0.0',
  description: 'Advanced table data analysis and summarization service',
  features: [
    'Automatic column type detection',
    'Statistical calculations (SUM, AVERAGE, COUNT)',
    'Currency and percentage detection',
    'Summary row generation',
    'Error handling and validation'
  ],
  supportedDataTypes: [
    'number',
    'currency', 
    'percentage',
    'date',
    'datetime',
    'text',
    'boolean',
    'mixed'
  ] as const
} as const 