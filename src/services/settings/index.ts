import type { UserSettings } from "../../types"

const DEFAULT_SETTINGS: UserSettings = {
  defaultFormat: "xlsx",
  defaultDestination: "download",
  autoExport: false,
  theme: "light"
}

export class SettingsService {
  private readonly SETTINGS_KEY = "user_settings"

  public async getSettings(): Promise<UserSettings> {
    try {
      const result = await chrome.storage.sync.get(this.SETTINGS_KEY)
      return result[this.SETTINGS_KEY] || DEFAULT_SETTINGS
    } catch (error) {
      console.error("Error getting settings:", error)
      return DEFAULT_SETTINGS
    }
  }

  public async updateSettings(settings: UserSettings): Promise<void> {
    try {
      await chrome.storage.sync.set({
        [this.SETTINGS_KEY]: settings
      })
    } catch (error) {
      console.error("Error updating settings:", error)
      throw error
    }
  }

  public async clearSettings(): Promise<void> {
    try {
      await chrome.storage.sync.remove(this.SETTINGS_KEY)
    } catch (error) {
      console.error("Error clearing settings:", error)
      throw error
    }
  }
}

export default SettingsService
