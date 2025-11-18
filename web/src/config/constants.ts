export const DEFAULT_CONVERSATION_ID = "demo-conversation";
export const CHAT_STORAGE_KEY = "synapsegpt-chat-history";
export const SETTINGS_STORAGE_KEY = "synapsegpt-settings";

export const DEFAULT_SETTINGS = {
  aiModel: "gpt-oss:20b",
  temperature: 0.7,
  maxTokens: -1,
  topP: 0.9,
  defaultLeftWidth: 20,
  defaultRightWidth: 25,
};

export const PANEL_WIDTH_CONSTRAINTS = {
  left: { min: 10, max: 40 },
  right: { min: 15, max: 50 },
};

export const AUTO_SCROLL_THRESHOLD = 100;
