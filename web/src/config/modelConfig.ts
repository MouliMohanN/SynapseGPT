export type SpeedPreset = "quick" | "balanced" | "deep";
export type DetailLevel = "overview" | "detailed" | "comprehensive";
export type Tone = "professional" | "casual" | "tutorial";

export interface ModelConfig {
  temperature: number;
  maxTokens: number;
  topP: number;
}

export const SPEED_PRESETS: Record<SpeedPreset, ModelConfig> = {
  quick: {
    temperature: 0.3,
    maxTokens: 512,
    topP: 0.85,
  },
  balanced: {
    temperature: 0.5,
    maxTokens: 1536,
    topP: 0.9,
  },
  deep: {
    temperature: 0.7,
    maxTokens: 3072,
    topP: 0.95,
  },
};

export const DETAIL_INSTRUCTIONS: Record<DetailLevel, string> = {
  overview: "Provide a high-level overview focusing on main concepts only.",
  detailed: "Provide a detailed summary with explanations and examples.",
  comprehensive: "Provide an exhaustive analysis covering all aspects, edge cases, and nuances.",
};

export const TONE_INSTRUCTIONS: Record<Tone, string> = {
  professional: "Use formal, technical language appropriate for professional documentation.",
  casual: "Use conversational, easy-to-understand language as if explaining to a colleague.",
  tutorial: "Use step-by-step teaching style with clear examples and beginner-friendly explanations.",
};

export const buildQuestionInstruction = (questionCount: number): string => {
  if (questionCount === -1) {
    return "Generate all relevant and important questions with detailed answers.";
  }
  if (questionCount > 0) {
    return `Generate exactly ${questionCount} relevant questions with detailed answers.`;
  }
  return "Do not include questions and answers section.";
};

export const DEFAULT_CHAT_CONFIG: ModelConfig = {
  temperature: 0.7,
  maxTokens: -1,
  topP: 0.9,
};
