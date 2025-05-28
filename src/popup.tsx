import React, { useState, useEffect } from 'react';
import SettingsForm from './components/SettingsForm';
import SubscriptionStatus from './components/SubscriptionStatus';
import QuickActions from './components/QuickActions';
import type { UserSettings } from './types';

const Popup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'subscription' | 'actions'>('settings');
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [isSupported, setIsSupported] = useState<boolean>(false);

  useEffect(() => {
    // Получаем информацию о текущей вкладке
    const getCurrentTab = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.url) {
          setCurrentUrl(tab.url);
          
          // Проверяем, поддерживается ли текущий сайт
          const supportedSites = [
            'chat.openai.com',
            'claude.ai',
            'gemini.google.com'
          ];
          
          const isSupported = supportedSites.some(site => tab.url!.includes(site));
          setIsSupported(isSupported);
        }
      } catch (error) {
        console.error('Failed to get current tab:', error);
      }
    };

    getCurrentTab();
  }, []);

  const handleUpgradeClick = () => {
    // Открываем страницу с планами подписки
    chrome.tabs.create({ 
      url: 'https://tabxport.com/pricing' // TODO: Replace with actual pricing page
    });
  };

  const handleSettingsChange = (settings: UserSettings) => {
    console.log('Settings updated:', settings);
  };

  const tabs = [
    { id: 'settings' as const, label: 'Settings', icon: '⚙️' },
    { id: 'subscription' as const, label: 'Plan', icon: '👑' },
    { id: 'actions' as const, label: 'Actions', icon: '🚀' },
  ];

  return (
    <div className="w-80 bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
            <span className="text-lg">📊</span>
          </div>
          <div>
            <h1 className="font-bold text-lg">TabXport</h1>
            <p className="text-xs text-emerald-100">AI Table Exporter</p>
          </div>
        </div>
        
        {/* Current Site Status */}
        <div className="mt-3 flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isSupported ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
          <span className="text-xs text-emerald-100">
            {isSupported ? 'Supported site detected' : 'Navigate to ChatGPT, Claude, or Gemini'}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'settings' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Settings</h2>
            <SettingsForm onSettingsChange={handleSettingsChange} />
          </div>
        )}

        {activeTab === 'subscription' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h2>
            <SubscriptionStatus onUpgradeClick={handleUpgradeClick} />
          </div>
        )}

        {activeTab === 'actions' && (
          <div>
            <QuickActions />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>v0.1.0</span>
          <div className="flex space-x-3">
            <button 
              onClick={() => chrome.tabs.create({ url: 'https://github.com/tabxport/extension' })}
              className="hover:text-gray-700 transition-colors"
            >
              GitHub
            </button>
            <button 
              onClick={() => chrome.tabs.create({ url: 'https://tabxport.com/support' })}
              className="hover:text-gray-700 transition-colors"
            >
              Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Popup;
