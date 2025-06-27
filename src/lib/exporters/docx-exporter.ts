import {
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} from "docx"

import type { ExportOptions, ExportResult, TableData } from "../../types"
import { generateFilename } from "../export"
import { googleDriveService } from "../google-drive-api"

/**
 * Конвертация ArrayBuffer в base64
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Converts data URL to blob for Google Drive upload
 */
const dataUrlToBlob = (dataUrl: string): Blob => {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

/**
 * Uploads DOCX file to Google Drive
 */
const uploadToGoogleDrive = async (
  filename: string,
  dataUrl: string
): Promise<{ success: boolean; error?: string; webViewLink?: string }> => {
  try {
    const blob = dataUrlToBlob(dataUrl)
    const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    
    console.log(`☁️ Uploading DOCX to Google Drive: ${filename} (${blob.size} bytes)`)
    
    const result = await googleDriveService.uploadFile({
      filename,
      content: blob,
      mimeType
    })
    
    if (result.success) {
      console.log(`✅ Successfully uploaded DOCX to Google Drive: ${filename}`)
      return { success: true, webViewLink: result.webViewLink }
    } else {
      console.error(`❌ Failed to upload DOCX to Google Drive: ${result.error}`)
      return { success: false, error: result.error }
    }
  } catch (error) {
    console.error('💥 Error uploading DOCX to Google Drive:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    }
  }
}

/**
 * Создание заголовка документа
 */
const createDocumentHeader = (tableData: TableData): Paragraph => {
  const title =
    tableData.chatTitle &&
    tableData.chatTitle !==
      `${tableData.source.charAt(0).toUpperCase() + tableData.source.slice(1)}_Chat`
      ? `Table from ${tableData.chatTitle}`
      : `Table from ${tableData.source.charAt(0).toUpperCase() + tableData.source.slice(1)}`

  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 28, // 14pt font
        font: "Calibri"
      })
    ],
    spacing: {
      after: 200 // Space after paragraph
    }
  })
}

/**
 * Создание таблицы в DOCX формате
 */
const createDocxTable = (
  tableData: TableData,
  includeHeaders: boolean
): Table => {
  const rows: TableRow[] = []

  // Добавляем заголовки если включены
  if (includeHeaders && tableData.headers.length > 0) {
    const headerRow = new TableRow({
      children: tableData.headers.map(
        (header) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: header,
                    bold: true,
                    font: "Calibri",
                    size: 22 // 11pt
                  })
                ]
              })
            ],
            width: {
              size: 100 / tableData.headers.length,
              type: WidthType.PERCENTAGE
            }
          })
      )
    })
    rows.push(headerRow)
  }

  // Добавляем строки данных
  tableData.rows.forEach((row) => {
    const tableRow = new TableRow({
      children: row.map(
        (cell) =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cell || "", // Обрабатываем пустые ячейки
                    font: "Calibri",
                    size: 22 // 11pt
                  })
                ]
              })
            ],
            width: {
              size: 100 / row.length,
              type: WidthType.PERCENTAGE
            }
          })
      )
    })
    rows.push(tableRow)
  })

  return new Table({
    rows,
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
}

/**
 * Основная функция экспорта в DOCX
 */
export const exportToDOCX = async (
  tableData: TableData,
  options: ExportOptions & { tableIndex?: number }
): Promise<ExportResult> => {
  try {
    console.log("Starting DOCX export for:", tableData.source)

    // Создаем элементы документа
    const documentElements = [
      createDocumentHeader(tableData),
      createDocxTable(tableData, options.includeHeaders)
    ]

    // Добавляем информацию об источнике
    documentElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `\nExported from ${tableData.source} at ${new Date().toLocaleString()}`,
            italics: true,
            size: 18, // 9pt font
            color: "666666",
            font: "Calibri"
          })
        ],
        spacing: {
          before: 200
        }
      })
    )

    // Создаем документ
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Calibri",
              size: 22 // 11pt
            }
          }
        }
      },
      sections: [
        {
          properties: {},
          children: documentElements
        }
      ]
    })

    // Генерируем файл
    const buffer = await Packer.toBuffer(doc)

    // Создаем filename
    const filename = generateFilename(
      tableData,
      "docx" as any,
      options.filename,
      options.tableIndex
    )

    // Конвертируем в data URL
    const base64 = arrayBufferToBase64(buffer)
    const dataUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`

    // Handle Google Drive upload if needed
    if (options.destination === 'google_drive') {
      const uploadResult = await uploadToGoogleDrive(filename, dataUrl)
      
      if (uploadResult.success) {
        console.log("DOCX export and upload to Google Drive completed successfully")
        return {
          success: true,
          filename,
          downloadUrl: uploadResult.webViewLink || dataUrl  // Use webViewLink or fallback to dataUrl
        }
      } else {
        return {
          success: false,
          error: `Google Drive upload failed: ${uploadResult.error}`
        }
      }
    }

    console.log("DOCX export completed successfully")

    return {
      success: true,
      filename,
      downloadUrl: dataUrl
    }
  } catch (error) {
    console.error("Error exporting to DOCX:", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error occurred during DOCX export"
    }
  }
}
