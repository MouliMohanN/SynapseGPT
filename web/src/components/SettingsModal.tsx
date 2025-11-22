"use client";

import React from "react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    aiModel: string;
    defaultLeftWidth: number;
    defaultRightWidth: number;
    allowOutsideDocumentAnswers: boolean;
    chatBehavioralSettings: {
      detailLevel: "overview" | "detailed" | "comprehensive";
      tone: "professional" | "casual" | "tutorial";
      generateQuestions: number;
    };
    summaryBehavioralSettings: {
      detailLevel: "overview" | "detailed" | "comprehensive";
      tone: "professional" | "casual" | "tutorial";
      generateQuestions: number;
    };
    autocompleteSettings: {
      enabled: boolean;
      debounceDelay: number;
      maxContextLines: number;
      model: string;
      temperature: number;
      topP: number;
      maxTokens: number;
      repeatPenalty: number;
    };
  };
  onSave: (settings: SettingsModalProps["settings"]) => void;
}

type SettingsTab = "chat" | "summary" | "editor";

type BehavioralSettingsType = {
  detailLevel: "overview" | "detailed" | "comprehensive";
  tone: "professional" | "casual" | "tutorial";
  generateQuestions: number;
};

export function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = React.useState(settings);
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("chat");

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const updateBehavioralSetting = (
    tab: SettingsTab,
    key: keyof BehavioralSettingsType,
    value: any
  ) => {
    const settingsKey = `${tab}BehavioralSettings` as keyof SettingsModalProps["settings"];
    const currentSettings = localSettings[settingsKey] as BehavioralSettingsType;
    setLocalSettings({
      ...localSettings,
      [settingsKey]: {
        ...currentSettings,
        [key]: value,
      },
    });
  };

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white border border-slate-200 rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto"
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

        <div className="flex items-center justify-between mb-4 p-3 border border-slate-200 rounded-lg bg-slate-50">
          <div>
            <p className="text-sm font-medium text-slate-900">Allow answers outside documents</p>
            <p className="text-xs text-slate-600 mt-0.5">When enabled, SynapseGPT can answer even if the context isn’t in the loaded docs.</p>
          </div>
          <button
            onClick={() =>
              setLocalSettings((prev) => ({
                ...prev,
                allowOutsideDocumentAnswers: !prev.allowOutsideDocumentAnswers,
              }))
            }
            className={`relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
              localSettings.allowOutsideDocumentAnswers ? "bg-purple-600" : "bg-slate-300"
            }`}
            type="button"
            aria-pressed={localSettings.allowOutsideDocumentAnswers}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                localSettings.allowOutsideDocumentAnswers ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-xs text-purple-900 leading-relaxed">
            💬 <span className="font-semibold">AI Configuration</span>
          </p>
          <p className="text-[10px] text-purple-700 mt-1">
            Configure separate behavioral settings for Chat, AI Summary, and Editor Autocomplete features.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex mb-4 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "chat"
                ? "text-purple-600 border-purple-600"
                : "text-slate-600 border-transparent hover:text-slate-900"
            }`}
          >
            Chat Settings
          </button>
          <button
            onClick={() => setActiveTab("summary")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "summary"
                ? "text-purple-600 border-purple-600"
                : "text-slate-600 border-transparent hover:text-slate-900"
            }`}
          >
            AI Summary Settings
          </button>
          <button
            onClick={() => setActiveTab("editor")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "editor"
                ? "text-purple-600 border-purple-600"
                : "text-slate-600 border-transparent hover:text-slate-900"
            }`}
          >
            Editor Settings
          </button>
        </div>

        <div className="space-y-4">
          {/* AI Model - shared */}
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

          {/* Tab-specific settings */}
          {activeTab === "chat" && (
            <>
              <div className="text-sm font-medium text-slate-900 mb-3">Chat Behavior</div>
              {/* Detail Level */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Detail Level</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateBehavioralSetting("chat", "detailLevel", "overview")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      localSettings.chatBehavioralSettings.detailLevel === "overview"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-amber-50 border border-slate-300"
                    }`}
                  >
                    Overview
                    <div className="text-[9px] opacity-75 mt-0.5">High-level</div>
                  </button>
                  <button
                    onClick={() => updateBehavioralSetting("chat", "detailLevel", "detailed")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      localSettings.chatBehavioralSettings.detailLevel === "detailed"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-amber-50 border border-slate-300"
                    }`}
                  >
                    Detailed
                    <div className="text-[9px] opacity-75 mt-0.5">With examples</div>
                  </button>
                  <button
                    onClick={() => updateBehavioralSetting("chat", "detailLevel", "comprehensive")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      localSettings.chatBehavioralSettings.detailLevel === "comprehensive"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-amber-50 border border-slate-300"
                    }`}
                  >
                    Comprehensive
                    <div className="text-[9px] opacity-75 mt-0.5">Exhaustive</div>
                  </button>
                </div>
              </div>

              {/* Tone */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Tone</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateBehavioralSetting("chat", "tone", "professional")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      localSettings.chatBehavioralSettings.tone === "professional"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-blue-50 border border-slate-300"
                    }`}
                  >
                    Professional
                    <div className="text-[9px] opacity-75 mt-0.5">Formal</div>
                  </button>
                  <button
                    onClick={() => updateBehavioralSetting("chat", "tone", "casual")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      localSettings.chatBehavioralSettings.tone === "casual"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-blue-50 border border-slate-300"
                    }`}
                  >
                    Casual
                    <div className="text-[9px] opacity-75 mt-0.5">Conversational</div>
                  </button>
                  <button
                    onClick={() => updateBehavioralSetting("chat", "tone", "tutorial")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      localSettings.chatBehavioralSettings.tone === "tutorial"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-blue-50 border border-slate-300"
                    }`}
                  >
                    Tutorial
                    <div className="text-[9px] opacity-75 mt-0.5">Educational</div>
                  </button>
                </div>
              </div>

              {/* Question Generation */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Question Generation</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateBehavioralSetting("chat", "generateQuestions", 0)}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      localSettings.chatBehavioralSettings.generateQuestions === 0
                        ? "bg-green-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-green-50 border border-slate-300"
                    }`}
                  >
                    None
                    <div className="text-[9px] opacity-75 mt-0.5">No questions</div>
                  </button>
                  <button
                    onClick={() => updateBehavioralSetting("chat", "generateQuestions", -1)}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      localSettings.chatBehavioralSettings.generateQuestions === -1
                        ? "bg-green-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-green-50 border border-slate-300"
                    }`}
                  >
                    Auto
                    <div className="text-[9px] opacity-75 mt-0.5">AI decides</div>
                  </button>
                  <button
                    onClick={() => updateBehavioralSetting("chat", "generateQuestions", 5)}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      localSettings.chatBehavioralSettings.generateQuestions === 5
                        ? "bg-green-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-green-50 border border-slate-300"
                    }`}
                  >
                    5 Questions
                    <div className="text-[9px] opacity-75 mt-0.5">Fixed count</div>
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === "summary" && (
            <>
              <div className="text-sm font-medium text-slate-900 mb-3">AI Summary Behavior</div>
              {/* Detail Level */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Detail Level</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateBehavioralSetting("summary", "detailLevel", "overview")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      localSettings.summaryBehavioralSettings.detailLevel === "overview"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-amber-50 border border-slate-300"
                    }`}
                  >
                    Overview
                    <div className="text-[9px] opacity-75 mt-0.5">High-level</div>
                  </button>
                  <button
                    onClick={() => updateBehavioralSetting("summary", "detailLevel", "detailed")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      localSettings.summaryBehavioralSettings.detailLevel === "detailed"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-amber-50 border border-slate-300"
                    }`}
                  >
                    Detailed
                    <div className="text-[9px] opacity-75 mt-0.5">With examples</div>
                  </button>
                  <button
                    onClick={() => updateBehavioralSetting("summary", "detailLevel", "comprehensive")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      localSettings.summaryBehavioralSettings.detailLevel === "comprehensive"
                        ? "bg-amber-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-amber-50 border border-slate-300"
                    }`}
                  >
                    Comprehensive
                    <div className="text-[9px] opacity-75 mt-0.5">Exhaustive</div>
                  </button>
                </div>
              </div>

              {/* Tone */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Tone</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateBehavioralSetting("summary", "tone", "professional")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      localSettings.summaryBehavioralSettings.tone === "professional"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-blue-50 border border-slate-300"
                    }`}
                  >
                    Professional
                    <div className="text-[9px] opacity-75 mt-0.5">Formal</div>
                  </button>
                  <button
                    onClick={() => updateBehavioralSetting("summary", "tone", "casual")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      localSettings.summaryBehavioralSettings.tone === "casual"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-blue-50 border border-slate-300"
                    }`}
                  >
                    Casual
                    <div className="text-[9px] opacity-75 mt-0.5">Conversational</div>
                  </button>
                  <button
                    onClick={() => updateBehavioralSetting("summary", "tone", "tutorial")}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      localSettings.summaryBehavioralSettings.tone === "tutorial"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-blue-50 border border-slate-300"
                    }`}
                  >
                    Tutorial
                    <div className="text-[9px] opacity-75 mt-0.5">Educational</div>
                  </button>
                </div>
              </div>

              {/* Question Generation */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Question Generation</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateBehavioralSetting("summary", "generateQuestions", 0)}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      localSettings.summaryBehavioralSettings.generateQuestions === 0
                        ? "bg-green-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-green-50 border border-slate-300"
                    }`}
                  >
                    None
                    <div className="text-[9px] opacity-75 mt-0.5">No questions</div>
                  </button>
                  <button
                    onClick={() => updateBehavioralSetting("summary", "generateQuestions", -1)}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      localSettings.summaryBehavioralSettings.generateQuestions === -1
                        ? "bg-green-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-green-50 border border-slate-300"
                    }`}
                  >
                    Auto
                    <div className="text-[9px] opacity-75 mt-0.5">AI decides</div>
                  </button>
                  <button
                    onClick={() => updateBehavioralSetting("summary", "generateQuestions", 5)}
                    className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                      localSettings.summaryBehavioralSettings.generateQuestions === 5
                        ? "bg-green-500 text-white shadow-sm"
                        : "bg-white text-slate-700 hover:bg-green-50 border border-slate-300"
                    }`}
                  >
                    5 Questions
                    <div className="text-[9px] opacity-75 mt-0.5">Fixed count</div>
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === "editor" && (
            <div className="space-y-4">
              <div className="text-sm font-medium text-slate-900 mb-3">Autocomplete (Ghost Text)</div>
              
              {/* Enable Autocomplete */}
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-900">Enable Autocomplete</p>
                  <p className="text-xs text-slate-600 mt-0.5">Show AI suggestions as you type.</p>
                </div>
                <button
                  onClick={() =>
                    setLocalSettings((prev) => ({
                      ...prev,
                      autocompleteSettings: {
                        ...prev.autocompleteSettings,
                        enabled: !prev.autocompleteSettings.enabled,
                      },
                    }))
                  }
                  className={`relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    localSettings.autocompleteSettings.enabled ? "bg-purple-600" : "bg-slate-300"
                  }`}
                  type="button"
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      localSettings.autocompleteSettings.enabled ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {localSettings.autocompleteSettings.enabled && (
                <>
                  {/* Autocomplete Model */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Autocomplete Model
                    </label>
                    <input
                      type="text"
                      value={localSettings.autocompleteSettings.model}
                      onChange={(e) =>
                        setLocalSettings((prev) => ({
                          ...prev,
                          autocompleteSettings: {
                            ...prev.autocompleteSettings,
                            model: e.target.value,
                          },
                        }))
                      }
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    <p className="text-[10px] text-slate-600 mt-1">Recommended: qwen2.5-coder:1.5b</p>
                  </div>

                  {/* Debounce Delay */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-medium text-slate-700">Debounce Delay</label>
                      <span className="text-xs text-slate-500">{localSettings.autocompleteSettings.debounceDelay}ms</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="2000"
                      step="100"
                      value={localSettings.autocompleteSettings.debounceDelay}
                      onChange={(e) =>
                        setLocalSettings((prev) => ({
                          ...prev,
                          autocompleteSettings: {
                            ...prev.autocompleteSettings,
                            debounceDelay: parseInt(e.target.value),
                          },
                        }))
                      }
                      className="w-full accent-purple-600"
                    />
                    <p className="text-[10px] text-slate-600 mt-1">Wait time after typing before fetching suggestions.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Temperature */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700">Temperature</label>
                        <span className="text-xs text-slate-500">{localSettings.autocompleteSettings.temperature}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={localSettings.autocompleteSettings.temperature}
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            autocompleteSettings: {
                              ...prev.autocompleteSettings,
                              temperature: parseFloat(e.target.value),
                            },
                          }))
                        }
                        className="w-full accent-purple-600"
                      />
                      <p className="text-[10px] text-slate-600 mt-1">Lower = more focused, Higher = more creative</p>
                    </div>

                    {/* Top P */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-medium text-slate-700">Top P</label>
                        <span className="text-xs text-slate-500">{localSettings.autocompleteSettings.topP}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={localSettings.autocompleteSettings.topP}
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            autocompleteSettings: {
                              ...prev.autocompleteSettings,
                              topP: parseFloat(e.target.value),
                            },
                          }))
                        }
                        className="w-full accent-purple-600"
                      />
                      <p className="text-[10px] text-slate-600 mt-1">Controls diversity of word choices</p>
                    </div>

                    {/* Max Tokens */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Max Tokens</label>
                      <input
                        type="number"
                        min="10"
                        max="500"
                        value={localSettings.autocompleteSettings.maxTokens}
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            autocompleteSettings: {
                              ...prev.autocompleteSettings,
                              maxTokens: parseInt(e.target.value),
                            },
                          }))
                        }
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-[10px] text-slate-600 mt-1">Maximum length of suggestions</p>
                    </div>

                    {/* Repeat Penalty */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Repeat Penalty</label>
                      <input
                        type="number"
                        min="1.0"
                        max="2.0"
                        step="0.1"
                        value={localSettings.autocompleteSettings.repeatPenalty}
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            autocompleteSettings: {
                              ...prev.autocompleteSettings,
                              repeatPenalty: parseFloat(e.target.value),
                            },
                          }))
                        }
                        className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-[10px] text-slate-600 mt-1">Prevents repetitive text (1.0 = off)</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
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

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded shadow-sm transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
