import React, { useState } from 'react';

interface QuickActionsProps {
  onOpenTestPage?: () => void;
  onOpenOptions?: () => void;
  onRefreshTables?: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ 
  onOpenTestPage, 
  onOpenOptions, 
  onRefreshTables 
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshTables = async () => {
    setIsRefreshing(true);
    try {
      // Отправляем сообщение всем активным табам для обновления
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'REFRESH_TABLES' });
        }
      }
      onRefreshTables?.();
    } catch (error) {
      console.error('Failed to refresh tables:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const handleOpenTestPage = () => {
    chrome.tabs.create({ 
      url: chrome.runtime.getURL('test-page.html') 
    });
    onOpenTestPage?.();
  };

  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage();
    onOpenOptions?.();
  };

  const actions = [
    {
      id: 'refresh',
      label: 'Refresh Tables',
      icon: '🔄',
      description: 'Scan current page for tables',
      onClick: handleRefreshTables,
      loading: isRefreshing,
    },
    {
      id: 'test',
      label: 'Test Page',
      icon: '🧪',
      description: 'Open test page with sample tables',
      onClick: handleOpenTestPage,
    },
    {
      id: 'options',
      label: 'Advanced Settings',
      icon: '⚙️',
      description: 'Open full options page',
      onClick: handleOpenOptions,
    },
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h3>
      
      <div className="grid grid-cols-1 gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={action.loading}
            className="flex items-center p-3 text-left bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex-shrink-0 mr-3">
              {action.loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500"></div>
              ) : (
                <span className="text-lg">{action.icon}</span>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {action.label}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {action.description}
              </p>
            </div>
            
            <div className="flex-shrink-0 ml-2">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions; 