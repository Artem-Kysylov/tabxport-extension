// Централизованные фичефлаги первого релиза
export const GOOGLE_DRIVE_ENABLED = false
export const GOOGLE_SHEETS_ENABLED = false

export type FeatureName = "google_drive" | "google_sheets"

export const isFeatureEnabled = (name: FeatureName): boolean => {
  if (name === "google_drive") return GOOGLE_DRIVE_ENABLED
  if (name === "google_sheets") return GOOGLE_SHEETS_ENABLED
  return false
}