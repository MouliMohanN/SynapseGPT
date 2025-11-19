import { useState, useEffect } from 'react';

const defaultSettings = {
  aiModel: "gpt-oss:20b",
  defaultLeftWidth: 20,
  defaultRightWidth: 25,
  allowOutsideDocumentAnswers: false,
  chatBehavioralSettings: {
    detailLevel: "overview" as "overview" | "detailed" | "comprehensive",
    tone: "tutorial" as "professional" | "casual" | "tutorial",
    generateQuestions: 0,
  },
  summaryBehavioralSettings: {
    detailLevel: "detailed" as "overview" | "detailed" | "comprehensive",
    tone: "professional" as "professional" | "casual" | "tutorial",
    generateQuestions: -1,
  },
};

export const useSettings = () => {
  const [settings, setSettings] = useState(() => {
    // Check if we're on the client side before accessing localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('synapsegpt-settings');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return {
            ...defaultSettings,
            ...parsed,
            chatBehavioralSettings: {
              ...defaultSettings.chatBehavioralSettings,
              ...(parsed.chatBehavioralSettings ?? {}),
            },
            summaryBehavioralSettings: {
              ...defaultSettings.summaryBehavioralSettings,
              ...(parsed.summaryBehavioralSettings ?? {}),
            },
          };
        } catch {
          // Ignore parse errors, use default
        }
      }
    }
    
    // Default settings
    return defaultSettings;
  });

  const handleSaveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    if (typeof window !== 'undefined') {
      localStorage.setItem('synapsegpt-settings', JSON.stringify(newSettings));
    }
  };

  return {
    settings,
    handleSaveSettings,
  };
};
