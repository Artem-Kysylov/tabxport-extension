import React from 'react';

export const QuickActions: React.FC = () => {
  const handleRefreshTables = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'REFRESH_TABLES' });
      // Показываем уведомление об успехе
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon-48.png',
        title: 'TabXport',
        message: 'Tables refreshed successfully',
      });
    } catch (error) {
      console.error('Failed to refresh tables:', error);
    }
  };

  const handleOpenDocs = () => {
    chrome.tabs.create({ url: 'https://tabxport.com/docs' });
  };

  const handleReportIssue = () => {
    chrome.tabs.create({ url: 'https://tabxport.com/support' });
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleRefreshTables}
        className="w-full flex items-center justify-between px-4 py-2 bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 transition-colors"
      >
        <span className="flex items-center">
          <span className="mr-2">🔄</span>
          Refresh Tables
        </span>
        <span className="text-xs text-emerald-600">Ctrl+Shift+R</span>
      </button>

      <button
        onClick={handleOpenDocs}
        className="w-full flex items-center px-4 py-2 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
      >
        <span className="mr-2">📚</span>
        Documentation
      </button>

      <button
        onClick={handleReportIssue}
        className="w-full flex items-center px-4 py-2 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
      >
        <span className="mr-2">🐛</span>
        Report an Issue
      </button>

      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Pro Tip</h3>
        <p className="text-xs text-blue-600">
          Use the keyboard shortcut Ctrl+Shift+E (Cmd+Shift+E on Mac) to quickly export the last detected table.
        </p>
      </div>
    </div>
  );
}; 