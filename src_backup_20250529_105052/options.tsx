import React, { useState, useEffect } from 'react';
import SettingsForm from './components/SettingsForm';
import SubscriptionStatus from './components/SubscriptionStatus';
import type { UserSettings } from './types';

const Options: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const handleSettingsChange = (newSettings: UserSettings) => {
    setSettings(newSettings);
  };

  const handleUpgradeClick = () => {
    chrome.tabs.create({ 
      url: 'https://tabxport.com/pricing' 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-xl text-white">📊</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">TabXport Settings</h1>
              <p className="text-sm text-gray-500">Configure your AI table export preferences</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Settings Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Export Settings</h2>
              <SettingsForm onSettingsChange={handleSettingsChange} />
            </div>

            {/* Advanced Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Advanced Settings</h2>
              
              <div className="space-y-6">
                {/* File Naming */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    File Naming Pattern
                  </label>
                  <input
                    type="text"
                    placeholder="{source}_Table_{timestamp}"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available variables: {'{source}'}, {'{timestamp}'}, {'{date}'}, {'{time}'}
                  </p>
                </div>

                {/* Export Quality */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export Quality
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                    <option value="standard">Standard</option>
                    <option value="high">High Quality (larger files)</option>
                    <option value="compressed">Compressed (smaller files)</option>
                  </select>
                </div>

                {/* Data Processing */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Data Processing
                  </label>
                  
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" defaultChecked />
                      <span className="ml-2 text-sm text-gray-600">Remove empty rows</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" defaultChecked />
                      <span className="ml-2 text-sm text-gray-600">Trim whitespace</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                      <span className="ml-2 text-sm text-gray-600">Convert numbers to numeric format</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                      <span className="ml-2 text-sm text-gray-600">Auto-detect data types</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Keyboard Shortcuts</h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Quick export</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                    Ctrl + Shift + E
                  </kbd>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Refresh tables</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                    Ctrl + Shift + R
                  </kbd>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Open settings</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                    Ctrl + Shift + S
                  </kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Subscription Status */}
            <SubscriptionStatus onUpgradeClick={handleUpgradeClick} />

            {/* Statistics */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Statistics</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tables exported</span>
                  <span className="text-sm font-medium text-gray-900">0</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Files created</span>
                  <span className="text-sm font-medium text-gray-900">0</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Data exported</span>
                  <span className="text-sm font-medium text-gray-900">0 MB</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Extension installed</span>
                  <span className="text-sm font-medium text-gray-900">Today</span>
                </div>
              </div>
            </div>

            {/* Support */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Support</h3>
              
              <div className="space-y-3">
                <button 
                  onClick={() => chrome.tabs.create({ url: 'https://tabxport.com/docs' })}
                  className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                >
                  📚 Documentation
                </button>
                
                <button 
                  onClick={() => chrome.tabs.create({ url: 'https://tabxport.com/support' })}
                  className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                >
                  💬 Contact Support
                </button>
                
                <button 
                  onClick={() => chrome.tabs.create({ url: 'https://github.com/tabxport/extension/issues' })}
                  className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                >
                  🐛 Report Bug
                </button>
                
                <button 
                  onClick={() => chrome.tabs.create({ url: 'https://github.com/tabxport/extension' })}
                  className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                >
                  ⭐ Star on GitHub
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>TabXport v0.1.0</span>
            <div className="flex space-x-4">
              <button 
                onClick={() => chrome.tabs.create({ url: 'https://tabxport.com/privacy' })}
                className="hover:text-gray-700 transition-colors"
              >
                Privacy Policy
              </button>
              <button 
                onClick={() => chrome.tabs.create({ url: 'https://tabxport.com/terms' })}
                className="hover:text-gray-700 transition-colors"
              >
                Terms of Service
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Options;
