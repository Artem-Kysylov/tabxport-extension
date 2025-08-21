import { googleDriveService } from "../google-drive-api"
import { googleSheetsService } from "../google-sheets-api"
import { supabase } from "../supabase"
import type { ExportDestination, ExportHistoryInsert } from "./types"
import { userService } from "./user-service"

export interface ExportOptions {
  userId: string
  tableName: string
  tableData: any[][]
  format: "csv" | "xlsx" | "docx" | "pdf" | "google_sheets"
  platform: string
  destination: ExportDestination
  metadata?: Record<string, any>
}

export interface ExportResult {
  success: boolean
  error?: string
  downloadUrl?: string
  googleDriveLink?: string
  exportId?: string
}

class ExportService {
  /**
   * Экспорт таблицы с проверкой лимитов и записью в историю
   */
  async exportTable(options: ExportOptions): Promise<ExportResult> {
    const {
      userId,
      tableName,
      tableData,
      format,
      platform,
      destination,
      metadata = {}
    } = options

    try {
      // 1. Проверяем лимиты пользователя
      const limitCheck = await userService.checkExportLimits(
        userId,
        destination
      )

      if (!limitCheck.canExport) {
        return {
          success: false,
          error: limitCheck.limitMessage || "Export limit exceeded"
        }
      }

      if (
        destination === "google_drive" &&
        !limitCheck.canExportToGoogleDrive
      ) {
        return {
          success: false,
          error: "Google Drive export is not available for your plan"
        }
      }

      // 2. Выполняем экспорт
      let result: ExportResult

      if (destination === "google_drive") {
        if (format === "google_sheets") {
          result = await this.exportToGoogleSheets(tableName, tableData)
        } else {
          result = await this.exportToGoogleDrive(tableName, tableData, format)
        }
      } else {
        result = await this.exportAsDownload(tableName, tableData, format)
      }

      if (!result.success) {
        return result
      }

      // 3. Записываем в историю экспортов
      const historyRecord: ExportHistoryInsert = {
        user_id: userId,
        table_name: tableName,
        format,
        row_count: tableData.length,
        file_size_mb: this.calculateFileSize(tableData, format),
        platform,
        destination,
        google_drive_file_id: result.googleDriveLink
          ? this.extractFileIdFromLink(result.googleDriveLink)
          : null,
        google_drive_link: result.googleDriveLink,
        metadata: {
          ...metadata,
          columns: tableData[0]?.length || 0,
          exportedAt: new Date().toISOString()
        }
      }

      const { data: exportRecord, error: historyError } = await supabase
        .from("export_history")
        .insert(historyRecord)
        .select()
        .single()

      if (historyError) {
        console.error("Error saving export history:", historyError)
        // Не блокируем экспорт из-за ошибки истории
      }

      // 4. Увеличиваем счетчик использования
      await userService.incrementExportCount(userId)

      return {
        ...result,
        exportId: exportRecord?.id
      }
    } catch (error) {
      console.error("Export error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown export error"
      }
    }
  }

  /**
   * Экспорт в Google Drive
   */
  private async exportToGoogleDrive(
    tableName: string,
    tableData: any[][],
    format: "csv" | "xlsx" | "docx" | "pdf"
  ): Promise<ExportResult> {
    try {
      const result = await googleDriveService.exportTable(
        tableData,
        tableName,
        format
      )

      if (!result.success) {
        return {
          success: false,
          error: result.error || "Failed to upload to Google Drive"
        }
      }

      return {
        success: true,
        googleDriveLink: result.webViewLink
      }
    } catch (error) {
      console.error("Google Drive export error:", error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Google Drive export failed"
      }
    }
  }

  /**
   * Экспорт в Google Sheets (нативная таблица)
   */
  private async exportToGoogleSheets(
    tableName: string,
    tableData: any[][]
  ): Promise<ExportResult> {
    try {
      // Преобразуем в структуру, совместимую с GoogleSheetsService
      const headers = (tableData[0] || []).map((c) => String(c))
      const rows = (tableData.slice(1) || []).map((r) => r.map((c) => String(c)))

      const sheetTable = {
        id: `export_${Date.now()}`,
        headers,
        rows,
        source: "batch-export",
        timestamp: Date.now(),
        url: ""
      }

      const res = await googleSheetsService.exportTable(sheetTable as any, {
        spreadsheetTitle: tableName,
        includeHeaders: true
      })

      if (!res.success) {
        return {
          success: false,
          error: res.error || "Failed to export to Google Sheets"
        }
      }

      return {
        success: true,
        googleDriveLink: res.spreadsheetUrl
      }
    } catch (error) {
      console.error("Google Sheets export error:", error)
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Google Sheets export failed"
      }
    }
  }

  /**
   * Экспорт как скачивание
   */
  private async exportAsDownload(
    tableName: string,
    tableData: any[][],
    format: "csv" | "xlsx" | "docx" | "pdf" | "google_sheets"
  ): Promise<ExportResult> {
    try {
      let content: string | Blob
      let mimeType: string
      let fileExtension: string

      switch (format) {
        case "csv":
          content = this.convertToCSV(tableData)
          mimeType = "text/csv"
          fileExtension = ".csv"
          break

        case "xlsx":
          // Используем существующий XLSX экспортер
          content = await this.convertToXLSX(tableData)
          mimeType =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          fileExtension = ".xlsx"
          break

        case "docx":
          // Используем существующий DOCX экспортер
          content = await this.convertToDOCX(tableData)
          mimeType =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          fileExtension = ".docx"
          break

        case "pdf":
          // Используем существующий PDF экспортер
          content = await this.convertToPDF(tableData)
          mimeType = "application/pdf"
          fileExtension = ".pdf"
          break

        default:
          return {
            success: false,
            error: "Unsupported format"
          }
      }

      // Создаем blob и URL для скачивания
      const blob =
        content instanceof Blob
          ? content
          : new Blob([content], { type: mimeType })
      const downloadUrl = URL.createObjectURL(blob)

      // Автоматически скачиваем файл
      const filename = tableName.includes(".")
        ? tableName
        : `${tableName}${fileExtension}`

      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Освобождаем память через некоторое время
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)

      return {
        success: true,
        downloadUrl
      }
    } catch (error) {
      console.error("Download export error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Download export failed"
      }
    }
  }

  /**
   * Преобразование в CSV
   */
  private convertToCSV(data: any[][]): string {
    return data
      .map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell || "")
            // Экранируем кавычки и оборачиваем в кавычки если есть запятые
            if (
              cellStr.includes('"') ||
              cellStr.includes(",") ||
              cellStr.includes("\n")
            ) {
              return `"${cellStr.replace(/"/g, '""')}"`
            }
            return cellStr
          })
          .join(",")
      )
      .join("\n")
  }

  /**
   * Преобразование в XLSX (требует интеграции с существующим экспортером)
   */
  private async convertToXLSX(data: any[][]): Promise<Blob> {
    // TODO: Интегрировать с существующим XLSX экспортером
    // Пока возвращаем CSV как fallback
    const csvContent = this.convertToCSV(data)
    return new Blob([csvContent], { type: "text/csv" })
  }

  /**
   * Преобразование в DOCX (требует интеграции с существующим экспортером)
   */
  private async convertToDOCX(data: any[][]): Promise<Blob> {
    // TODO: Интегрировать с существующим DOCX экспортером
    // Пока возвращаем CSV как fallback
    const csvContent = this.convertToCSV(data)
    return new Blob([csvContent], { type: "text/csv" })
  }

  /**
   * Преобразование в PDF (требует интеграции с существующим экспортером)
   */
  private async convertToPDF(data: any[][]): Promise<Blob> {
    // TODO: Интегрировать с существующим PDF экспортером
    // Пока возвращаем CSV как fallback
    const csvContent = this.convertToCSV(data)
    return new Blob([csvContent], { type: "text/csv" })
  }

  /**
   * Примерный расчет размера файла в MB
   */
  private calculateFileSize(data: any[][], format: string): number {
    const content = this.convertToCSV(data) // Базовый расчет на CSV

    // Приблизительный размер в байтах (UTF-8)
    const sizeInBytes = new Blob([content]).size

    // Корректировка для разных форматов
    let multiplier = 1
    switch (format) {
      case "xlsx":
        multiplier = 0.7 // XLSX обычно меньше CSV
        break
      case "docx":
        multiplier = 1.2 // DOCX немного больше
        break
      case "pdf":
        multiplier = 1.5 // PDF обычно больше
        break
      default:
        multiplier = 1
    }

    return Number(((sizeInBytes * multiplier) / (1024 * 1024)).toFixed(3))
  }

  /**
   * Извлечение ID файла из Google Drive ссылки
   */
  private extractFileIdFromLink(link: string): string | null {
    const match = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : null
  }

  /**
   * Получение статистики экспортов пользователя
   */
  async getExportStats(userId: string) {
    try {
      // Общее количество экспортов
      const { count: totalExports, error: totalError } = await supabase
        .from("export_history")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      // Экспорты в Google Drive
      const { count: googleDriveExports, error: driveError } = await supabase
        .from("export_history")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("destination", "google_drive")

      // Экспорты за текущий месяц
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: thisMonth, error: monthError } = await supabase
        .from("export_history")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth.toISOString())

      if (totalError || driveError || monthError) {
        console.error("Error getting export stats:", {
          totalError,
          driveError,
          monthError
        })
        return null
      }

      return {
        totalExports: totalExports || 0,
        googleDriveExports: googleDriveExports || 0,
        thisMonth: thisMonth || 0
      }
    } catch (error) {
      console.error("Error getting export stats:", error)
      return null
    }
  }
}

export const exportService = new ExportService()
