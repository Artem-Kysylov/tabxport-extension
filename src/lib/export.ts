import * as XLSX from 'xlsx';
import type { TableData, ExportOptions, ExportResult } from '../types';

// Генерация имени файла
export const generateFilename = (
  tableData: TableData,
  format: 'xlsx' | 'csv',
  customName?: string
): string => {
  if (customName) {
    return `${customName}.${format}`;
  }

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const source = tableData.source.charAt(0).toUpperCase() + tableData.source.slice(1);
  
  return `${source}_Table_${timestamp}.${format}`;
};

// Конвертация TableData в worksheet
export const tableDataToWorksheet = (tableData: TableData, includeHeaders: boolean = true): XLSX.WorkSheet => {
  const data: string[][] = [];
  
  if (includeHeaders && tableData.headers.length > 0) {
    data.push(tableData.headers);
  }
  
  data.push(...tableData.rows);
  
  return XLSX.utils.aoa_to_sheet(data);
};

// Экспорт в XLSX формат
export const exportToXLSX = async (
  tableData: TableData,
  options: ExportOptions
): Promise<ExportResult> => {
  try {
    const worksheet = tableDataToWorksheet(tableData, options.includeHeaders);
    const workbook = XLSX.utils.book_new();
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Table');
    
    const filename = generateFilename(tableData, 'xlsx', options.filename);
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    
    // Создаем Blob для скачивания
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    return {
      success: true,
      filename,
      downloadUrl: URL.createObjectURL(blob),
    };
  } catch (error) {
    console.error('Error exporting to XLSX:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

// Экспорт в CSV формат
export const exportToCSV = async (
  tableData: TableData,
  options: ExportOptions
): Promise<ExportResult> => {
  try {
    const worksheet = tableDataToWorksheet(tableData, options.includeHeaders);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    
    const filename = generateFilename(tableData, 'csv', options.filename);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    
    return {
      success: true,
      filename,
      downloadUrl: URL.createObjectURL(blob),
    };
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

// Основная функция экспорта
export const exportTable = async (
  tableData: TableData,
  options: ExportOptions
): Promise<ExportResult> => {
  switch (options.format) {
    case 'xlsx':
      return exportToXLSX(tableData, options);
    case 'csv':
      return exportToCSV(tableData, options);
    default:
      return {
        success: false,
        error: `Unsupported format: ${options.format}`,
      };
  }
};

// Валидация данных таблицы
export const validateTableData = (tableData: TableData): boolean => {
  if (!tableData.headers && !tableData.rows.length) {
    return false;
  }
  
  if (tableData.headers.length === 0 && tableData.rows.length === 0) {
    return false;
  }
  
  // Проверяем, что все строки имеют одинаковое количество колонок
  const expectedColumns = tableData.headers.length || tableData.rows[0]?.length || 0;
  
  return tableData.rows.every(row => row.length === expectedColumns);
};

// Очистка данных таблицы от лишних пробелов и символов
export const cleanTableData = (tableData: TableData): TableData => {
  const cleanHeaders = tableData.headers.map(header => header.trim());
  const cleanRows = tableData.rows.map(row => 
    row.map(cell => cell.trim())
  );
  
  return {
    ...tableData,
    headers: cleanHeaders,
    rows: cleanRows,
  };
}; 