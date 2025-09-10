import { authService } from "./supabase/auth-service"
import { logExtensionError, safeStorageOperation, createErrorNotification } from "./error-handlers"

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
   * Проверка и получение действующего Google токена через authService
   */
  private async getValidToken(): Promise<string | null> {
    // удалены отладочные console.log
    try {
      let token = authService.getGoogleToken()

      if (!token) {
        // Попытка обновить токен
        try {
          token = await authService.refreshGoogleToken()
        } catch (error) {
          const categorizedError = logExtensionError(
            error as Error,
            "Google token refresh via authService"
          )
          
          if (categorizedError.type === 'AUTH_ERROR') {
            // пользователь должен переавторизоваться — подавляем лишний лог
          }
          
          return null
        }
      }

      return token
    } catch (error) {
      const categorizedError = logExtensionError(
        error as Error,
        "Google Drive token retrieval via authService",
        { operation: "getValidToken" }
      )
      
      return null
    }
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

      if (!searchResponse.ok) {
        throw new Error(`Search failed: ${searchResponse.status} ${searchResponse.statusText}`)
      }

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

      if (!createResponse.ok) {
        throw new Error(`Folder creation failed: ${createResponse.status} ${createResponse.statusText}`)
      }

      const createData = await createResponse.json()
      return createData.id
    } catch (error) {
      logExtensionError(
        error as Error,
        "Google Drive folder creation"
      )
      return null
    }
  }

  /**
   * Загрузка файла в Google Drive с улучшенной обработкой ошибок
   */
  async uploadFile(options: DriveUploadOptions): Promise<DriveUploadResult> {
    const token = await this.getValidToken()

    if (!token) {
      return {
        success: false,
        error: "Google authentication required. Please reconnect your Google Drive account."
      }
    }

    let originalSize = 0

    try {
      const folderId = options.folderId || (await this.createTableXportFolder())

      const metadata = {
        name: options.filename,
        parents: folderId ? [folderId] : undefined
      }

      const delimiter = "-------314159265358979323846"
      const delimiter_line = `\r\n--${delimiter}\r\n`
      const close_delim = `\r\n--${delimiter}--`

      const contentType = options.mimeType
      
      let content: string | ArrayBuffer
      
      if (typeof options.content === "string") {
        content = options.content
        originalSize = content.length
        // удален console.log размера строкового контента
      } else {
        const blob = options.content as Blob
        originalSize = blob.size
        content = await blob.arrayBuffer()
        // удален console.log размеров Blob/ArrayBuffer
      }

      let multipartRequestBody: string | Uint8Array

      if (typeof content === "string") {
        multipartRequestBody =
          delimiter_line +
          "Content-Type: application/json\r\n\r\n" +
          JSON.stringify(metadata) +
          delimiter_line +
          `Content-Type: ${contentType}\r\n\r\n` +
          content +
          close_delim
      } else {
        const encoder = new TextEncoder()
        
        const headerPart = 
          delimiter_line +
          "Content-Type: application/json\r\n\r\n" +
          JSON.stringify(metadata) +
          delimiter_line +
          `Content-Type: ${contentType}\r\n\r\n`
        
        const footerPart = close_delim
        
        const headerBytes = encoder.encode(headerPart)
        const footerBytes = encoder.encode(footerPart)
        const contentBytes = new Uint8Array(content)
        
        const totalLength = headerBytes.length + contentBytes.length + footerBytes.length
        multipartRequestBody = new Uint8Array(totalLength)
        
        let offset = 0
        multipartRequestBody.set(headerBytes, offset)
        offset += headerBytes.length
        multipartRequestBody.set(contentBytes, offset)
        offset += contentBytes.length
        multipartRequestBody.set(footerBytes, offset)
        
        // удален console.log "Binary upload: ..."
      }

      const response = await fetch(`${this.uploadUrl}?uploadType=multipart`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary="${delimiter}"`
        },
        body: multipartRequestBody
      })

      if (!response.ok) {
        const errorText = await response.text()
        const error = new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`)
        
        logExtensionError(
          error,
          "Google Drive file upload",
          {
            filename: options.filename,
            responseStatus: response.status,
            responseStatusText: response.statusText,
            errorText,
            originalSize,
            uploadSize: typeof multipartRequestBody === 'string' ? multipartRequestBody.length : multipartRequestBody.byteLength
          }
        )
        
        throw error
      }

      const result = await response.json()

      const webViewLink = result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`

      // удален подробный console.log об успешной загрузке
      
      return {
        success: true,
        fileId: result.id,
        webViewLink: webViewLink
      }
    } catch (error) {
      const categorizedError = logExtensionError(
        error as Error,
        "Google Drive file upload",
        {
          filename: options.filename,
          mimeType: options.mimeType,
          originalSize
        }
      )
      
      return {
        success: false,
        error: categorizedError.userAction || categorizedError.message
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
        content = "\uFEFF" + this.convertToCSV(tableData)
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
          error: `Unsupported format: ${format}`
        }
    }

    // Добавляем расширение к имени файла, если его нет
    const finalFilename = filename.endsWith(fileExtension)
      ? filename
      : `${filename}${fileExtension}`

    return this.uploadFile({
      filename: finalFilename,
      content,
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
