import { STORAGE_KEY_PREFERRED_FORMAT } from "./constants"
import type { ExportFormat } from "./types"
import { EXPORT_FORMATS } from "./types"

/**
 * Format preference utilities
 */
export const FormatPreferences = {
  save: (format: ExportFormat): void => {
    try {
      localStorage.setItem(STORAGE_KEY_PREFERRED_FORMAT, format)
    } catch (error) {
      console.warn("Failed to save format preference:", error)
    }
  },

  load: (): ExportFormat | null => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFERRED_FORMAT)
      if (saved && Object.keys(EXPORT_FORMATS).includes(saved)) {
        return saved as ExportFormat
      }
    } catch (error) {
      console.warn("Failed to load format preference:", error)
    }
    return null
  },

  clear: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY_PREFERRED_FORMAT)
    } catch (error) {
      console.warn("Failed to clear format preference:", error)
    }
  },

  exists: (): boolean => {
    return FormatPreferences.load() !== null
  }
}
