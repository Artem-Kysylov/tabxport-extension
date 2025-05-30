import * as XLSX from 'xlsx';
import type { TableData, ExportOptions, ExportResult } from '../../types';
import { generateFilename } from './utils';

export class ExportService {
  private tableDataToWorksheet(tableData: TableData, includeHeaders: boolean = true): XLSX.WorkSheet {
    const data: string[][] = [];
    
    if (includeHeaders && tableData.headers.length > 0) {
      data.push(tableData.headers);
    }
    
    data.push(...tableData.rows);
    
    return XLSX.utils.aoa_to_sheet(data);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private async exportToXLSX(tableData: TableData, options: ExportOptions): Promise<ExportResult> {
    try {
      const worksheet = this.tableDataToWorksheet(tableData, options.includeHeaders);
      const workbook = XLSX.utils.book_new();
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Table');
      
      const filename = generateFilename(tableData, 'xlsx', options.filename);
      const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      
      // Создаем data URL для скачивания
      const base64 = this.arrayBufferToBase64(buffer);
      const dataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
      
      return {
        success: true,
        filename,
        downloadUrl: dataUrl,
      };
    } catch (error) {
      console.error('Error exporting to XLSX:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private async exportToCSV(tableData: TableData, options: ExportOptions): Promise<ExportResult> {
    try {
      const worksheet = this.tableDataToWorksheet(tableData, options.includeHeaders);
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      
      const filename = generateFilename(tableData, 'csv', options.filename);
      
      // Создаем data URL для CSV
      const base64 = btoa(unescape(encodeURIComponent(csv)));
      const dataUrl = `data:text/csv;charset=utf-8;base64,${base64}`;
      
      return {
        success: true,
        filename,
        downloadUrl: dataUrl,
      };
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  public async exportTable(tableData: TableData, options: ExportOptions): Promise<ExportResult> {
    console.log('ExportService: Starting export with options:', options);
    console.log('ExportService: Table data:', tableData);

    try {
      switch (options.format) {
        case 'xlsx':
          return await this.exportToXLSX(tableData, options);
        case 'csv':
          return await this.exportToCSV(tableData, options);
        default:
          return {
            success: false,
            error: `Unsupported format: ${options.format}`,
          };
      }
    } catch (error) {
      console.error('ExportService: Export error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
} 