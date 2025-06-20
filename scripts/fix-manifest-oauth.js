#!/usr/bin/env node

/**
 * Скрипт для удаления oauth2 секции из собранного manifest.json
 * Для Chrome Extension MV3 с chrome.identity.launchWebAuthFlow oauth2 секция не нужна
 */

const fs = require('fs')
const path = require('path')

const MANIFEST_PATH = path.join(__dirname, '../build/chrome-mv3-dev/manifest.json')

function fixManifest() {
  try {
    // Проверяем, существует ли файл манифеста
    if (!fs.existsSync(MANIFEST_PATH)) {
      console.error('❌ Manifest file not found:', MANIFEST_PATH)
      console.log('💡 Make sure to run "npm run dev" first')
      process.exit(1)
    }

    // Читаем текущий манифест
    const manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf8')
    const manifest = JSON.parse(manifestContent)

    // Проверяем, есть ли oauth2 секция
    if (manifest.oauth2) {
      console.log('🗑️  Removing oauth2 section from manifest...')
      console.log('💡 oauth2 section is not needed for chrome.identity.launchWebAuthFlow')
      
      // Удаляем oauth2 секцию
      delete manifest.oauth2
      
      // Форматируем JSON с отступами для читаемости
      const updatedContent = JSON.stringify(manifest, null, 2)

      // Записываем обновленный манифест
      fs.writeFileSync(MANIFEST_PATH, updatedContent, 'utf8')

      console.log('✅ Manifest updated successfully!')
      console.log('📍 Location:', MANIFEST_PATH)
      console.log('🚫 OAuth2 section removed')
      console.log('')
      console.log('💡 Now reload the extension in Chrome (chrome://extensions/)')
    } else {
      console.log('✅ Manifest is already correct - no oauth2 section found')
      console.log('🔍 Chrome Extension MV3 uses chrome.identity.launchWebAuthFlow')
    }

  } catch (error) {
    console.error('❌ Error fixing manifest:', error.message)
    process.exit(1)
  }
}

// Запускаем скрипт
if (require.main === module) {
  fixManifest()
}

module.exports = { fixManifest } 