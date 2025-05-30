import React from 'react';

export type TabId = 'settings' | 'subscription' | 'actions';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}

const tabs: Tab[] = [
  { id: 'settings', label: 'Settings', icon: '⚙️' },
  { id: 'subscription', label: 'Plan', icon: '👑' },
  { id: 'actions', label: 'Actions', icon: '🚀' },
];

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
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
  );
}; 