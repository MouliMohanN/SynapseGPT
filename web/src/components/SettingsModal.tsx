"use client";

import React from "react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    aiModel: string;
    temperature: number;
    maxTokens: number;
    topP: number;
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
        className="bg-white border border-slate-200 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-slate-900">Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-xs text-purple-900 leading-relaxed">
            💬 <span className="font-semibold">Chat Configuration</span>
          </p>
          <p className="text-[10px] text-purple-700 mt-1">
            These settings apply only to chat messages. AI Summary uses preset modes (Quick/Balanced/Deep).
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              AI Model
            </label>
            <input
              type="text"
              value={localSettings.aiModel}
              onChange={(e) => setLocalSettings({ ...localSettings, aiModel: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <p className="text-[10px] text-slate-600 mt-1">Ollama model name (e.g., gpt-oss:20b)</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Temperature: {localSettings.temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={localSettings.temperature}
              onChange={(e) => setLocalSettings({ ...localSettings, temperature: parseFloat(e.target.value) })}
              className="w-full accent-purple-600"
            />
            <div className="flex justify-between text-[10px] text-slate-600 mt-1">
              <span>Precise (0.0)</span>
              <span>Balanced (1.0)</span>
              <span>Creative (2.0)</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">💡 Lower = more focused/factual, Higher = more creative</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Max Response Length: {localSettings.maxTokens === -1 ? "Unlimited" : localSettings.maxTokens}
            </label>
            <input
              type="range"
              min="-1"
              max="4096"
              step="256"
              value={localSettings.maxTokens}
              onChange={(e) => setLocalSettings({ ...localSettings, maxTokens: parseInt(e.target.value) })}
              className="w-full accent-purple-600"
            />
            <div className="flex justify-between text-[10px] text-slate-600 mt-1">
              <span>Unlimited</span>
              <span>Short</span>
              <span>Medium</span>
              <span>Long</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">💡 Controls maximum length of AI responses</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Focus (Top P): {localSettings.topP.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={localSettings.topP}
              onChange={(e) => setLocalSettings({ ...localSettings, topP: parseFloat(e.target.value) })}
              className="w-full accent-purple-600"
            />
            <div className="flex justify-between text-[10px] text-slate-600 mt-1">
              <span>Narrow (0.5)</span>
              <span>Recommended (0.9)</span>
              <span>Wide (1.0)</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">💡 Lower = more focused, Higher = more diverse vocabulary</p>
          </div>

          <div className="border-t border-slate-200 pt-4 mt-4">
            <p className="text-xs font-medium text-slate-700 mb-3">Panel Layout</p>
            
            <div className="mb-3">
              <label className="block text-xs text-slate-600 mb-1">
                Left Panel Width: {localSettings.defaultLeftWidth}%
              </label>
              <input
                type="range"
                min="10"
                max="40"
                step="1"
                value={localSettings.defaultLeftWidth}
                onChange={(e) => setLocalSettings({ ...localSettings, defaultLeftWidth: parseInt(e.target.value) })}
                className="w-full accent-purple-600"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-600 mb-1">
                Right Panel Width: {localSettings.defaultRightWidth}%
              </label>
              <input
                type="range"
                min="15"
                max="50"
                step="1"
                value={localSettings.defaultRightWidth}
                onChange={(e) => setLocalSettings({ ...localSettings, defaultRightWidth: parseInt(e.target.value) })}
                className="w-full accent-purple-600"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors font-medium shadow-sm"
          >
            Save Settings
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
