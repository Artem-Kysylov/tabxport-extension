/**
 * Roboto font with Cyrillic support for jsPDF
 * You MUST replace RobotoCyrillicBase64 with a real base64 TTF data.
 */

// Упрощенная версия для тестирования
// В реальном проекте нужно использовать полный TTF шрифт, конвертированный в base64
export const RobotoCyrillicBase64 = `data:font/truetype;charset=utf-8;base64,AAEAAAALAIAAAwAwT1MvMmCGXSMAAAC8AAAAYGNtYXAAnwF8AAABHAAAAFR...`

// Временная заглушка - будет заменена на реальный шрифт
export const ROBOTO_FONT_NAME = "Roboto"

export const addRobotoCyrillicToJsPDF = (doc: any): void => {
  try {
    // The same TTF can be used for normal/bold; jsPDF will emulate bold if needed.
    const fontFileName = "Roboto.ttf"
    const base64 = RobotoCyrillicBase64.replace(/^data:font\/truetype;charset=utf-8;base64,/, "")
    doc.addFileToVFS(fontFileName, base64)
    doc.addFont(fontFileName, ROBOTO_FONT_NAME, "normal")
    doc.addFont(fontFileName, ROBOTO_FONT_NAME, "bold")
  } catch (error) {
    console.error("TabXport: Failed to register Roboto Cyrillic font:", error)
  }
}

export const registerRobotoCyrillicOrFallback = (doc: any): string => {
  try {
    const fontFileName = "Roboto.ttf"
    const base64 = RobotoCyrillicBase64.replace(/^data:font\/truetype;charset=utf-8;base64,/, "")
    // Простая проверка, чтобы отсеять явные заглушки/битые строки
    if (!base64 || /[^A-Za-z0-9+/=]/.test(base64) || base64.includes("...")) {
      console.warn("TabXport: Roboto base64 is invalid or placeholder, using Helvetica fallback")
      return "helvetica"
    }
    doc.addFileToVFS(fontFileName, base64)
    doc.addFont(fontFileName, ROBOTO_FONT_NAME, "normal")
    doc.addFont(fontFileName, ROBOTO_FONT_NAME, "bold")
    const list = typeof doc.getFontList === "function" ? doc.getFontList() : {}
    const ok = !!list && Object.prototype.hasOwnProperty.call(list, ROBOTO_FONT_NAME)
    return ok ? ROBOTO_FONT_NAME : "helvetica"
  } catch (error) {
    console.error("TabXport: Failed to register Roboto Cyrillic font:", error)
    return "helvetica"
  }
}
