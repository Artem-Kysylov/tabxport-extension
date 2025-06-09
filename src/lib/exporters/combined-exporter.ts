import * as XLSX from 'xlsx';
import type { TableData, ExportOptions, ExportResult } from '../../types';
import { generateFilename } from '../export';

/**
 * Combined export options interface
 */
interface CombinedExportOptions extends ExportOptions {
  combinedFileName?: string;
  maxTables?: number;
}

/**
 * Constants for combined exports
 */
const COMBINED_LIMITS = {
  MAX_TABLES: 10,
  MAX_SHEET_NAME_LENGTH: 25,
  FALLBACK_SHEET_PREFIX: 'Table'
} as const;

/**
 * Generates a unique sheet name for XLSX
 */
const generateSheetName = (tableData: TableData, index: number, existingNames: Set<string>): string => {
  let baseName = '';
  
  // Try to use chat title or source as base name
  if (tableData.chatTitle && tableData.chatTitle !== `${tableData.source}_Chat`) {
    baseName = tableData.chatTitle
      .replace(/[<>:"/\\|?*\[\]]/g, '') // Remove invalid characters for sheet names
      .replace(/\s+/g, '_')
      .substring(0, COMBINED_LIMITS.MAX_SHEET_NAME_LENGTH);
  } else {
    baseName = `${tableData.source}_Data`
      .replace(/[<>:"/\\|?*\[\]]/g, '')
      .substring(0, COMBINED_LIMITS.MAX_SHEET_NAME_LENGTH);
  }
  
  // If base name is empty or too short, use fallback
  if (baseName.length < 3) {
    baseName = `${COMBINED_LIMITS.FALLBACK_SHEET_PREFIX}_${index + 1}`;
  }
  
  // Ensure uniqueness
  let finalName = baseName;
  let counter = 1;
  
  while (existingNames.has(finalName)) {
    const suffix = `_${counter}`;
    const maxBaseLength = COMBINED_LIMITS.MAX_SHEET_NAME_LENGTH - suffix.length;
    finalName = baseName.substring(0, maxBaseLength) + suffix;
    counter++;
  }
  
  existingNames.add(finalName);
  return finalName;
};

/**
 * Converts TableData to XLSX worksheet
 */
const tableDataToWorksheet = (tableData: TableData, includeHeaders: boolean = true): XLSX.WorkSheet => {
  const data: string[][] = [];
  
  if (includeHeaders && tableData.headers.length > 0) {
    data.push(tableData.headers);
  }
  
  data.push(...tableData.rows);
  
  return XLSX.utils.aoa_to_sheet(data);
};

/**
 * Converts ArrayBuffer to base64
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/**
 * Exports multiple tables into a single XLSX file with multiple sheets
 */
export const exportCombinedXLSX = async (
  tables: TableData[],
  options: CombinedExportOptions
): Promise<ExportResult> => {
  try {
    console.log(`🔄 Starting combined XLSX export for ${tables.length} tables`);
    
    // Validate table count
    if (tables.length === 0) {
      return {
        success: false,
        error: 'No tables to export',
      };
    }
    
    if (tables.length > COMBINED_LIMITS.MAX_TABLES) {
      return {
        success: false,
        error: `Too many tables. Maximum ${COMBINED_LIMITS.MAX_TABLES} tables allowed, got ${tables.length}`,
      };
    }
    
    // Create new workbook
    const workbook = XLSX.utils.book_new();
    const existingSheetNames = new Set<string>();
    
    console.log(`📊 Creating workbook with ${tables.length} sheets...`);
    
    // Process each table
    tables.forEach((table, index) => {
      console.log(`📋 Processing table ${index + 1}/${tables.length}`);
      
      // Generate unique sheet name
      const sheetName = generateSheetName(table, index, existingSheetNames);
      console.log(`📝 Sheet name: "${sheetName}"`);
      
      // Create worksheet
      const worksheet = tableDataToWorksheet(table, options.includeHeaders);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
    
    // Generate filename
    const baseFilename = options.combinedFileName || 'Combined_Tables';
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `${baseFilename}_${timestamp}.xlsx`;
    
    console.log(`💾 Generated filename: ${filename}`);
    
    // Generate file buffer
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    
    // Convert to data URL
    const base64 = arrayBufferToBase64(buffer);
    const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
    
    console.log(`✅ Combined XLSX export completed successfully`);
    console.log(`📊 File size: ${buffer.byteLength} bytes`);
    console.log(`📋 Sheets created: ${workbook.SheetNames.join(', ')}`);
    
    return {
      success: true,
      filename,
      downloadUrl: dataUrl,
    };
  } catch (error) {
    console.error('💥 Error in combined XLSX export:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during combined XLSX export',
    };
  }
};

/**
 * Main combined export function (currently supports XLSX only)
 */
export const exportCombinedTables = async (
  tables: TableData[],
  options: CombinedExportOptions
): Promise<ExportResult> => {
  switch (options.format) {
    case 'xlsx':
      return exportCombinedXLSX(tables, options);
    case 'csv':
      // TODO: Implement combined CSV export
      return {
        success: false,
        error: 'Combined CSV export not implemented yet',
      };
    case 'docx':
      // TODO: Implement combined DOCX export
      return {
        success: false,
        error: 'Combined DOCX export not implemented yet',
      };
    case 'pdf':
      // TODO: Implement combined PDF export
      return {
        success: false,
        error: 'Combined PDF export not implemented yet',
      };
    default:
      return {
        success: false,
        error: `Unsupported format for combined export: ${options.format}`,
      };
  }
}; 