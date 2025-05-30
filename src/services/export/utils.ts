import type { TableData } from '../../types';

// Генерация имени файла
export function generateFilename(
  tableData: TableData,
  format: 'xlsx' | 'csv',
  customName?: string
): string {
  if (customName) {
    return `${customName}.${format}`;
  }

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const source = tableData.source.charAt(0).toUpperCase() + tableData.source.slice(1);
  
  if (tableData.chatTitle && tableData.chatTitle !== `${source}_Chat`) {
    const cleanChatTitle = tableData.chatTitle
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 40);
    
    return `${cleanChatTitle}_Table_${timestamp}.${format}`;
  }
  
  return `${source}_Table_${timestamp}.${format}`;
} 