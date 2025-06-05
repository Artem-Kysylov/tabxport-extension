import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, BorderStyle } from 'docx';
import type { TableData, ExportOptions, ExportResult } from '../../types';
import { generateFilename } from '../export';

/**
 * Конвертация ArrayBuffer в base64
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
 * Создание заголовка документа
 */
const createDocumentHeader = (tableData: TableData): Paragraph => {
  const title = tableData.chatTitle && tableData.chatTitle !== `${tableData.source.charAt(0).toUpperCase() + tableData.source.slice(1)}_Chat`
    ? `Table from ${tableData.chatTitle}`
    : `Table from ${tableData.source.charAt(0).toUpperCase() + tableData.source.slice(1)}`;

  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 28, // 14pt font
        font: 'Calibri',
      }),
    ],
    spacing: {
      after: 200, // Space after paragraph
    },
  });
};

/**
 * Создание таблицы в DOCX формате
 */
const createDocxTable = (tableData: TableData, includeHeaders: boolean): Table => {
  const rows: TableRow[] = [];

  // Добавляем заголовки если включены
  if (includeHeaders && tableData.headers.length > 0) {
    const headerRow = new TableRow({
      children: tableData.headers.map(header => 
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: header,
                  bold: true,
                  font: 'Calibri',
                  size: 22, // 11pt
                }),
              ],
            }),
          ],
          width: {
            size: 100 / tableData.headers.length,
            type: WidthType.PERCENTAGE,
          },
        })
      ),
    });
    rows.push(headerRow);
  }

  // Добавляем строки данных
  tableData.rows.forEach(row => {
    const tableRow = new TableRow({
      children: row.map(cell => 
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: cell || '', // Обрабатываем пустые ячейки
                  font: 'Calibri',
                  size: 22, // 11pt
                }),
              ],
            }),
          ],
          width: {
            size: 100 / row.length,
            type: WidthType.PERCENTAGE,
          },
        })
      ),
    });
    rows.push(tableRow);
  });

  return new Table({
    rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
      insideVertical: { style: BorderStyle.SINGLE, size: 1 },
    },
  });
};

/**
 * Основная функция экспорта в DOCX
 */
export const exportToDOCX = async (
  tableData: TableData,
  options: ExportOptions
): Promise<ExportResult> => {
  try {
    console.log('Starting DOCX export for:', tableData.source);

    // Создаем элементы документа
    const documentElements = [
      createDocumentHeader(tableData),
      createDocxTable(tableData, options.includeHeaders),
    ];

    // Добавляем информацию об источнике
    documentElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `\nExported from ${tableData.source} at ${new Date().toLocaleString()}`,
            italics: true,
            size: 18, // 9pt font
            color: '666666',
            font: 'Calibri',
          }),
        ],
        spacing: {
          before: 200,
        },
      })
    );

    // Создаем документ
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: 'Calibri',
              size: 22, // 11pt
            },
          },
        },
      },
      sections: [
        {
          properties: {},
          children: documentElements,
        },
      ],
    });

    // Генерируем файл
    const buffer = await Packer.toBuffer(doc);
    
    // Создаем filename
    const filename = generateFilename(tableData, 'docx' as any, options.filename);
    
    // Конвертируем в data URL
    const base64 = arrayBufferToBase64(buffer);
    const dataUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;

    console.log('DOCX export completed successfully');

    return {
      success: true,
      filename,
      downloadUrl: dataUrl,
    };
  } catch (error) {
    console.error('Error exporting to DOCX:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during DOCX export',
    };
  }
}; 