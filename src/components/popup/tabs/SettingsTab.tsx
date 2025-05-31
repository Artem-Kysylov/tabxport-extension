import React from 'react';
import SettingsForm from '../../SettingsForm';
import type { UserSettings } from '../../../types';

interface SettingsTabProps {
  onSettingsChange: (settings: UserSettings) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ onSettingsChange }) => {
  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Settings</h2>
      <SettingsForm onSettingsChange={onSettingsChange} />
    </div>
  );
}; 