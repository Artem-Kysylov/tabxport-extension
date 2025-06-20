#!/usr/bin/env node

/**
 * Скрипт для получения Extension ID и генерации правильных URL для OAuth
 * Запуск: node scripts/get-extension-id.js
 */

const fs = require('fs');
const path = require('path');

function generateExtensionId() {
  // Читаем manifest.json для получения имени расширения
  const manifestPath = path.join(__dirname, '../src/manifest.json');
  const buildPath = path.join(__dirname, '../build/prod');
  
  console.log('🔍 Проверка Extension ID...\n');
  
  if (fs.existsSync(buildPath)) {
    console.log('✅ Build найден в:', buildPath);
    console.log('\n📋 Инструкции:');
    console.log('1. Откройте chrome://extensions/');
    console.log('2. Включите "Developer mode" (если не включен)');
    console.log('3. Нажмите "Load unpacked" и выберите папку:', buildPath);
    console.log('4. Скопируйте Extension ID из Chrome');
    console.log('\n🔧 После получения Extension ID:');
  } else {
    console.log('❌ Build не найден. Сначала соберите расширение:');
    console.log('   npm run build');
    console.log('\n📋 После сборки:');
    console.log('1. Откройте chrome://extensions/');
    console.log('2. Включите "Developer mode"');
    console.log('3. Нажмите "Load unpacked" и выберите build/prod');
    console.log('4. Скопируйте Extension ID');
    console.log('\n🔧 После получения Extension ID:');
  }
  
  console.log('\n📝 Обновите Google Cloud Console:');
  console.log('   https://console.cloud.google.com/');
  console.log('   → APIs & Services → Credentials');
  console.log('   → Ваш OAuth 2.0 Client ID');
  console.log('\n   Authorized JavaScript origins:');
  console.log('   https://[ВАШ_EXTENSION_ID].chromiumapp.org');
  console.log('\n   Authorized redirect URIs:');
  console.log('   https://[ВАШ_EXTENSION_ID].chromiumapp.org/');
  console.log('   https://yuvilstnuaetzmszveqw.supabase.co/auth/v1/callback');
  
  console.log('\n📝 Обновите Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/yuvilstnuaetzmszveqw');
  console.log('   → Authentication → URL Configuration');
  console.log('\n   Site URL:');
  console.log('   https://[ВАШ_EXTENSION_ID].chromiumapp.org');
  console.log('\n   Redirect URLs:');
  console.log('   https://[ВАШ_EXTENSION_ID].chromiumapp.org/');
  
  console.log('\n⚠️  ВАЖНО: Замените [ВАШ_EXTENSION_ID] на реальный ID!');
  console.log('\n🚀 После обновления настроек протестируйте авторизацию через Google.');
}

function generateConfigWithId(extensionId) {
  if (!extensionId) {
    console.log('❌ Extension ID не предоставлен');
    return;
  }
  
  console.log(`\n🔧 Конфигурация для Extension ID: ${extensionId}`);
  console.log('\n📝 Google Cloud Console URLs:');
  console.log(`   JavaScript origins: https://${extensionId}.chromiumapp.org`);
  console.log(`   Redirect URIs: https://${extensionId}.chromiumapp.org/`);
  console.log('                  https://yuvilstnuaetzmszveqw.supabase.co/auth/v1/callback');
  
  console.log('\n📝 Supabase URLs:');
  console.log(`   Site URL: https://${extensionId}.chromiumapp.org`);
  console.log(`   Redirect URLs: https://${extensionId}.chromiumapp.org/`);
}

// Проверяем аргументы командной строки
const args = process.argv.slice(2);
if (args.length > 0) {
  const extensionId = args[0];
  generateConfigWithId(extensionId);
} else {
  generateExtensionId();
}

console.log('\n💡 Подсказка: Если у вас есть Extension ID, запустите:');
console.log('   node scripts/get-extension-id.js [ВАШ_EXTENSION_ID]');
console.log('   Пример: node scripts/get-extension-id.js mfbfgancmjidlnpeimnbjdkokjblhpdp'); 