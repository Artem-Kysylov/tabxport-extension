import React from 'react';
import SettingsForm from '../../SettingsForm';

export const SettingsTab: React.FC = () => {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Settings</h2>
      <SettingsForm />
    </div>
  );
}; 