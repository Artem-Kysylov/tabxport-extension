import { authService } from "./supabase/auth-service"

export interface DriveUploadOptions {
  filename: string
  content: string | Blob
  mimeType: string
  folderId?: string
}

export interface DriveUploadResult {
  success: boolean
  fileId?: string
  webViewLink?: string
  error?: string
}

class GoogleDriveService {
  private baseUrl = "https://www.googleapis.com/drive/v3"
  private uploadUrl = "https://www.googleapis.com/upload/drive/v3/files"

  /**
   * Проверка и получение действующего Google токена
   */
  private async getValidToken(): Promise<string | null> {
    let token = authService.getGoogleToken()

    if (!token) {
      // Попытка обновить токен
      token = await authService.refreshGoogleToken()
    }

    return token
  }

  /**
   * Создание папки TableXport в Google Drive (если не существует)
   */
  async createTableXportFolder(): Promise<string | null> {
    const token = await this.getValidToken()
    if (!token) return null

    try {
      // Сначала проверим, есть ли уже папка TableXport
      const searchResponse = await fetch(
        `${this.baseUrl}/files?q=name='TableXport' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      const searchData = await searchResponse.json()

      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id // Папка уже существует
      }

      // Создаем новую папку
      const createResponse = await fetch(`${this.baseUrl}/files`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "TableXport",
          mimeType: "application/vnd.google-apps.folder"
        })
      })

      const createData = await createResponse.json()
      return createData.id
    } catch (error) {
      console.error("Error creating TableXport folder:", error)
      return null
    }
  }

  /**
   * Загрузка файла в Google Drive
   */
  async uploadFile(options: DriveUploadOptions): Promise<DriveUploadResult> {
    const token = await this.getValidToken()

    if (!token) {
      return {
        success: false,
        error: "Google authentication required"
      }
    }

    try {
      // Получаем ID папки TableXport
      const folderId = options.folderId || (await this.createTableXportFolder())

      const metadata = {
        name: options.filename,
        parents: folderId ? [folderId] : undefined
      }

      // Подготавливаем multipart upload
      const delimiter = "-------314159265358979323846"
      const delimiter_line = `\r\n--${delimiter}\r\n`
      const close_delim = `\r\n--${delimiter}--`

      const contentType = options.mimeType
      const content =
        typeof options.content === "string"
          ? options.content
          : await (options.content as Blob).text()

      const multipartRequestBody =
        delimiter_line +
        "Content-Type: application/json\r\n\r\n" +
        JSON.stringify(metadata) +
        delimiter_line +
        `Content-Type: ${contentType}\r\n\r\n` +
        content +
        close_delim

      const response = await fetch(`${this.uploadUrl}?uploadType=multipart`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary="${delimiter}"`
        },
        body: multipartRequestBody
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()

      return {
        success: true,
        fileId: result.id,
        webViewLink: result.webViewLink
      }
    } catch (error) {
      console.error("Error uploading to Google Drive:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed"
      }
    }
  }

  /**
   * Экспорт таблицы в различных форматах
   */
  async exportTable(
    tableData: any[][],
    filename: string,
    format: "csv" | "xlsx" | "docx" | "pdf"
  ): Promise<DriveUploadResult> {
    let content: string
    let mimeType: string
    let fileExtension: string

    switch (format) {
      case "csv":
        content = this.convertToCSV(tableData)
        mimeType = "text/csv"
        fileExtension = ".csv"
        break

      case "xlsx":
        // TODO: Интегрировать с существующим XLSX экспортером
        content = this.convertToCSV(tableData) // Временно используем CSV
        mimeType =
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        fileExtension = ".xlsx"
        break

      case "docx":
        // TODO: Интегрировать с существующим DOCX экспортером
        content = this.convertToCSV(tableData) // Временно используем CSV
        mimeType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        fileExtension = ".docx"
        break

      case "pdf":
        // TODO: Интегрировать с существующим PDF экспортером
        content = this.convertToCSV(tableData) // Временно используем CSV
        mimeType = "application/pdf"
        fileExtension = ".pdf"
        break

      default:
        return {
          success: false,
          error: "Unsupported format"
        }
    }

    const finalFilename = filename.includes(".")
      ? filename
      : `${filename}${fileExtension}`

    return this.uploadFile({
      filename: finalFilename,
      content: content,
      mimeType
    })
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
}

export const googleDriveService = new GoogleDriveService()
