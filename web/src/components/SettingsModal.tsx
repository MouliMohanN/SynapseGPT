"use client";

import React from "react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    aiModel: string;
    temperature: number;
    defaultLeftWidth: number;
    defaultRightWidth: number;
  };
  onSave: (settings: SettingsModalProps["settings"]) => void;
}

export function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = React.useState(settings);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              AI Model
            </label>
            <input
              type="text"
              value={localSettings.aiModel}
              onChange={(e) => setLocalSettings({ ...localSettings, aiModel: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">Ollama model name (e.g., gpt-oss:20b)</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Temperature: {localSettings.temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={localSettings.temperature}
              onChange={(e) => setLocalSettings({ ...localSettings, temperature: parseFloat(e.target.value) })}
              className="w-full"
            />
            <p className="text-[10px] text-slate-500 mt-1">Controls randomness (0 = focused, 1 = creative)</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Default Left Panel Width: {localSettings.defaultLeftWidth}%
            </label>
            <input
              type="range"
              min="10"
              max="40"
              step="1"
              value={localSettings.defaultLeftWidth}
              onChange={(e) => setLocalSettings({ ...localSettings, defaultLeftWidth: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Default Right Panel Width: {localSettings.defaultRightWidth}%
            </label>
            <input
              type="range"
              min="15"
              max="50"
              step="1"
              value={localSettings.defaultRightWidth}
              onChange={(e) => setLocalSettings({ ...localSettings, defaultRightWidth: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 text-sm bg-sky-600 hover:bg-sky-700 rounded transition-colors"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
