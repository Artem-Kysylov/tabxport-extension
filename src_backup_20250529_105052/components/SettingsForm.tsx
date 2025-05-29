import React, { useState, useEffect } from 'react';
import type { UserSettings } from '../types';
import { getUserSettings, saveUserSettings } from '../lib/storage';

interface SettingsFormProps {
  onSettingsChange?: (settings: UserSettings) => void;
}

const SettingsForm: React.FC<SettingsFormProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<UserSettings>({
    defaultFormat: 'xlsx',
    defaultDestination: 'download',
    autoExport: false,
    theme: 'auto',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Загрузка настроек при монтировании компонента
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const userSettings = await getUserSettings();
        setSettings(userSettings);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Обработка изменения настроек
  const handleSettingChange = async (key: keyof UserSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    setIsSaving(true);
    try {
      await saveUserSettings({ [key]: value });
      onSettingsChange?.(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Default Format */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Default Export Format
        </label>
        <div className="flex space-x-2">
          <button
            onClick={() => handleSettingChange('defaultFormat', 'xlsx')}
            className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
              settings.defaultFormat === 'xlsx'
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            disabled={isSaving}
          >
            📊 Excel (.xlsx)
          </button>
          <button
            onClick={() => handleSettingChange('defaultFormat', 'csv')}
            className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
              settings.defaultFormat === 'csv'
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            disabled={isSaving}
          >
            📄 CSV
          </button>
        </div>
      </div>

      {/* Default Destination */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Default Destination
        </label>
        <div className="flex space-x-2">
          <button
            onClick={() => handleSettingChange('defaultDestination', 'download')}
            className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
              settings.defaultDestination === 'download'
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            disabled={isSaving}
          >
            💾 Download
          </button>
          <button
            onClick={() => handleSettingChange('defaultDestination', 'google-drive')}
            className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors ${
              settings.defaultDestination === 'google-drive'
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
            disabled={isSaving}
          >
            ☁️ Google Drive
          </button>
        </div>
        {settings.defaultDestination === 'google-drive' && (
          <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
            ⚡ Pro feature - Google Drive integration
          </p>
        )}
      </div>

      {/* Auto Export */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Auto Export
          </label>
          <p className="text-xs text-gray-500">
            Automatically export when table is detected
          </p>
        </div>
        <button
          onClick={() => handleSettingChange('autoExport', !settings.autoExport)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            settings.autoExport ? 'bg-emerald-500' : 'bg-gray-200'
          }`}
          disabled={isSaving}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              settings.autoExport ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Theme */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Theme
        </label>
        <select
          value={settings.theme}
          onChange={(e) => handleSettingChange('theme', e.target.value as 'light' | 'dark' | 'auto')}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          disabled={isSaving}
        >
          <option value="auto">🔄 Auto</option>
          <option value="light">☀️ Light</option>
          <option value="dark">🌙 Dark</option>
        </select>
      </div>

      {/* Save Indicator */}
      {isSaving && (
        <div className="flex items-center justify-center text-xs text-emerald-600">
          <div className="animate-spin rounded-full h-3 w-3 border-b border-emerald-500 mr-2"></div>
          Saving...
        </div>
      )}
    </div>
  );
};

export default SettingsForm; 