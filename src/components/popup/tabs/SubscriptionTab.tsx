import React from 'react';
import SubscriptionStatus from '../../SubscriptionStatus';

export const SubscriptionTab: React.FC = () => {
  const handleUpgradeClick = () => {
    // Открываем страницу подписки
    chrome.tabs.create({ url: 'https://tabxport.com/pricing' });
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h2>
      <SubscriptionStatus onUpgradeClick={handleUpgradeClick} />
    </div>
  );
}; 