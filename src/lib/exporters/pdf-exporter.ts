import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

import type { ExportOptions, ExportResult, TableData } from "../../types"
import { generateFilename } from "../export"
import { googleDriveService } from "../google-drive-api"
import { addRobotoCyrillicToJsPDF, ROBOTO_FONT_NAME } from "../../assets/fonts/roboto-cyrillic"

/**
 * PDF экспортер для TabXport с поддержкой кириллицы
 * Конфигурация: A4, Landscape, с borders и UTF-8 поддержкой
 */

/**
 * Карта транслитерации кириллицы в латиницу
 */
const CYRILLIC_TO_LATIN_MAP: Record<string, string> = {
  // Русские буквы
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",

  // Заглавные
  А: "A",
  Б: "B",
  В: "V",
  Г: "G",
  Д: "D",
  Е: "E",
  Ё: "Yo",
  Ж: "Zh",
  З: "Z",
  И: "I",
  Й: "Y",
  К: "K",
  Л: "L",
  М: "M",
  Н: "N",
  О: "O",
  П: "P",
  Р: "R",
  С: "S",
  Т: "T",
  У: "U",
  Ф: "F",
  Х: "H",
  Ц: "Ts",
  Ч: "Ch",
  Ш: "Sh",
  Щ: "Sch",
  Ъ: "",
  Ы: "Y",
  Ь: "",
  Э: "E",
  Ю: "Yu",
  Я: "Ya",

  // Украинские буквы
  є: "ye",
  і: "i",
  ї: "yi",
  ґ: "g",
  Є: "Ye",
  І: "I",
  Ї: "Yi",
  Ґ: "G",

  // Белорусские буквы
  ў: "u",
  Ў: "U"
}

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
 * Uploads PDF file to Google Drive
 */
// функция uploadToGoogleDrive
const uploadToGoogleDrive = async (
  filename: string,
  dataUrl: string
): Promise<{ success: boolean; error?: string; webViewLink?: string }> => {
  try {
    const blob = dataUrlToBlob(dataUrl)
    const mimeType = 'application/pdf'
    
    // удален лишний console.log о начале загрузки в Google Drive
    
    const result = await googleDriveService.uploadFile({
      filename,
      content: blob,
      mimeType
    })
    
    if (result.success) {
      // удалён лишний console.log
      return { success: true, webViewLink: result.webViewLink }
    } else {
      console.error(`❌ Failed to upload PDF to Google Drive: ${result.error}`)
      return { success: false, error: result.error }
    }
  } catch (error) {
    console.error('💥 Error uploading PDF to Google Drive:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    }
  }
}

/**
 * Транслитерация кириллицы в латиницу для PDF
 */
const transliterateCyrillic = (text: string): string => {
  if (!text) return ""

  return text.replace(/[\u0400-\u04FF]/g, (char) => {
    return CYRILLIC_TO_LATIN_MAP[char] || char
  })
}

/**
 * Безопасное кодирование текста для PDF
 */
const encodeTextForPDF = (text: string): string => {
  if (!text) return ""
  // Только чистим текст, НИКАКОЙ транслитерации
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // удаляем невидимые символы
    .replace(/\u00A0/g, " ")               // неразрывные пробелы -> обычные
    .normalize("NFKC")
    .trim()
}

/**
 * Создание заголовка PDF документа
 */
const addPDFHeader = (doc: jsPDF, tableData: TableData): number => {
  doc.setFont(ROBOTO_FONT_NAME, "bold")
  doc.setFontSize(16)
  doc.setTextColor(40, 40, 40)

  // Формируем заголовок с правильным кодированием
  const sourceTitle =
    tableData.source.charAt(0).toUpperCase() + tableData.source.slice(1)
  let title = `Table from ${sourceTitle}`

  if (tableData.chatTitle && tableData.chatTitle !== `${sourceTitle}_Chat`) {
    const cleanChatTitle = encodeTextForPDF(tableData.chatTitle)
    if (cleanChatTitle.length > 0) {
      title = `Table from ${cleanChatTitle}`
    }
  }

  // Кодируем заголовок для PDF
  const encodedTitle = encodeTextForPDF(title)

  // Размещаем заголовок в центре (с учетом landscape)
  const pageWidth = doc.internal.pageSize.getWidth()
  const textWidth = doc.getTextWidth(encodedTitle)
  const xPosition = (pageWidth - textWidth) / 2

  doc.text(encodedTitle, xPosition, 20)

  // Возвращаем Y позицию для следующего элемента
  return 35
}

/**
 * Добавление подписи в футер
 */
const addPDFFooter = (doc: jsPDF, tableData: TableData): void => {
  const pageHeight = doc.internal.pageSize.getHeight()
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFont(ROBOTO_FONT_NAME, "normal")
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)

  const sourceTitle =
    tableData.source.charAt(0).toUpperCase() + tableData.source.slice(1)
  const footerText = `Exported from ${sourceTitle} at ${new Date().toLocaleString()} • Generated by TableXport`
  const encodedFooterText = encodeTextForPDF(footerText)

  const textWidth = doc.getTextWidth(encodedFooterText)
  const xPosition = (pageWidth - textWidth) / 2

  doc.text(encodedFooterText, xPosition, pageHeight - 10)
}

/**
 * Основная функция экспорта в PDF
 */
export const exportToPDF = async (
  tableData: TableData,
  options: ExportOptions & { tableIndex?: number }
): Promise<ExportResult> => {
  try {
    // удалены лишние console.log
    // Создаем PDF документ в альбомной ориентации A4
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true
    })

    // Подключаем шрифт с кириллицей и делаем его шрифтом по умолчанию
    addRobotoCyrillicToJsPDF(doc)
    doc.setFont(ROBOTO_FONT_NAME, "normal")

    // Добавляем заголовок
    const startY = addPDFHeader(doc, tableData)

    // Подготавливаем данные для таблицы с правильным кодированием
    const tableHeaders = options.includeHeaders
      ? tableData.headers.map((header) => encodeTextForPDF(header))
      : []

    const tableRows = tableData.rows.map((row) =>
      row.map((cell) => encodeTextForPDF(cell))
    )
    // удалён лишний console.log
    // Настройки стилей таблицы
    const tableConfig = {
      startY: startY,
      head: options.includeHeaders ? [tableHeaders] : undefined,
      body: tableRows,
      theme: "grid" as const,
      headStyles: {
        fillColor: [27, 147, 88] as [number, number, number],
        textColor: [255, 255, 255] as [number, number, number],
        fontStyle: "bold" as "bold",
        fontSize: 10,
        font: ROBOTO_FONT_NAME
      },
      bodyStyles: {
        fontSize: 9,
        font: ROBOTO_FONT_NAME,
        textColor: [40, 40, 40] as [number, number, number]
      },
      styles: {
        lineWidth: 0.1,
        lineColor: [128, 128, 128] as [number, number, number],
        cellPadding: 3,
        fontSize: 9,
        font: ROBOTO_FONT_NAME
      },
      columnStyles: {},
      margin: {
        top: startY,
        left: 14,
        right: 14,
        bottom: 25
      },
      didDrawPage: (data: any) => {
        addPDFFooter(doc, tableData)
      }
    }

    // Генерируем таблицу
    autoTable(doc, tableConfig)

    // Получаем PDF как ArrayBuffer
    const pdfArrayBuffer = doc.output("arraybuffer")

    // Создаем filename
    const filename = generateFilename(
      tableData,
      "pdf",
      options.filename,
      options.tableIndex
    )

    // Конвертируем в data URL
    const base64 = arrayBufferToBase64(pdfArrayBuffer)
    const dataUrl = `data:application/pdf;base64,${base64}`

    // Handle Google Drive upload if needed
    if (options.destination === 'google_drive') {
      const uploadResult = await uploadToGoogleDrive(filename, dataUrl)
      if (uploadResult.success) {
        // удалён лишний console.log
        return {
          success: true,
          filename,
          downloadUrl: uploadResult.webViewLink || dataUrl
        }
      } else {
        return {
          success: false,
          error: `Google Drive upload failed: ${uploadResult.error}`
        }
      }
    }
    // удалён лишний console.log
    return {
      success: true,
      filename,
      downloadUrl: dataUrl
    }
  } catch (error) {
    console.error("Error exporting to PDF:", error)
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error occurred during PDF export"
    }
  }
}
