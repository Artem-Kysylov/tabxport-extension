import React from 'react';

interface HeaderProps {
  isSupported: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isSupported }) => {
  return (
    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-4">
      {/* Logo и название */}
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
          <span className="text-lg">📊</span>
        </div>
        <div>
          <h1 className="font-bold text-lg">TabXport</h1>
          <p className="text-xs text-emerald-100">AI Table Exporter</p>
        </div>
      </div>
      
      {/* Статус поддержки сайта */}
      <div className="mt-3 flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isSupported ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
        <span className="text-xs text-emerald-100">
          {isSupported ? 'Supported site detected' : 'Navigate to ChatGPT, Claude, or Gemini'}
        </span>
      </div>
    </div>
  );
}; 