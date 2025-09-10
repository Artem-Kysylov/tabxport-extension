const GOOGLE_API_ORIGINS = ["https://www.googleapis.com/*", "https://sheets.googleapis.com/*"]

export async function hasGoogleApisHostPermissions(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!chrome?.permissions) return resolve(false)
    chrome.permissions.contains({ origins: GOOGLE_API_ORIGINS }, (granted) => resolve(Boolean(granted)))
  })
}

export async function requestGoogleApisHostPermissions(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!chrome?.permissions) return resolve(false)
    chrome.permissions.request({ origins: GOOGLE_API_ORIGINS }, (granted) => resolve(Boolean(granted)))
  })
}

/**
 * Проверяет и, если нужно, запрашивает права.
 * Возвращает true — если права уже были или были выданы пользователем.
 */
export async function ensureGoogleApisHostPermissions(): Promise<boolean> {
  const has = await hasGoogleApisHostPermissions()
  if (has) return true
  return await requestGoogleApisHostPermissions()
}