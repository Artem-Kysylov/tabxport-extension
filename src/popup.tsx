import React, { useState, useEffect } from 'react';
import type { UserSettings } from './types';
import { Header } from './components/popup/common/Header';
import { Footer } from './components/popup/common/Footer';
import { TabNavigation, TabId } from './components/popup/common/TabNavigation';
import { SettingsTab } from './components/popup/tabs/SettingsTab';
import { SubscriptionTab } from './components/popup/tabs/SubscriptionTab';
import { ActionsTab } from './components/popup/tabs/ActionsTab';

const Popup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('settings');
  const [isSupported, setIsSupported] = useState<boolean>(false);

  useEffect(() => {
    const getCurrentTab = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.url) {
          const supportedSites = [
            'chat.openai.com',
            'claude.ai',
            'gemini.google.com',
            'chat.deepseek.com',
            'deepseek.com'
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

  const handleSettingsChange = (settings: UserSettings) => {
    console.log('Settings updated:', settings);
    // TODO: Implement settings update through messaging service
  };

  const handleUpgradeClick = () => {
    chrome.tabs.create({ 
      url: 'https://tabxport.com/pricing'
    });
  };

  return (
    <div className="w-80 bg-white">
      <Header isSupported={isSupported} />
      
      <TabNavigation 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === 'settings' && (
        <SettingsTab onSettingsChange={handleSettingsChange} />
      )}

      {activeTab === 'subscription' && (
        <SubscriptionTab onUpgradeClick={handleUpgradeClick} />
      )}

      {activeTab === 'actions' && (
        <ActionsTab />
      )}

      <Footer />
    </div>
  );
};

export default Popup;
