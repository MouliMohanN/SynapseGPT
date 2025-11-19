export interface BehavioralSettings {
  detailLevel: "overview" | "detailed" | "comprehensive";
  tone: "professional" | "casual" | "tutorial";
  generateQuestions: number; // -1 for auto, 0-10 for specific count
}

export type ChatBehavioralSettings = BehavioralSettings;
export type SummaryBehavioralSettings = BehavioralSettings;

export interface ModelConfig {
  temperature: number;
  maxTokens: number;
  topP: number;
}

export function behavioralToModelConfig(behavioral: BehavioralSettings): ModelConfig {
  // Map detail level to temperature and tokens
  const detailConfig = {
    overview: { temperature: 0.3, maxTokens: 512 },
    detailed: { temperature: 0.5, maxTokens: 1536 },
    comprehensive: { temperature: 0.7, maxTokens: 3072 },
  };

  const detail = detailConfig[behavioral.detailLevel];
  
  // Map tone to top_p (focus vs diversity)
  const toneConfig = {
    professional: 0.85, // more focused
    casual: 0.9,        // balanced
    tutorial: 0.95,     // more diverse for examples
  };

  return {
    temperature: detail.temperature,
    maxTokens: detail.maxTokens,
    topP: toneConfig[behavioral.tone],
  };
}

export function buildBehavioralPrompt(behavioral: BehavioralSettings): string {
  const parts: string[] = [];

  // Add detail level instruction
  const detailInstructions = {
    overview: "Provide a high-level overview focusing on main concepts only.",
    detailed: "Provide detailed explanations with examples and context.",
    comprehensive: "Provide an exhaustive analysis covering all aspects, edge cases, and nuances.",
  };
  parts.push(detailInstructions[behavioral.detailLevel]);

  // Add tone instruction
  const toneInstructions = {
    professional: "Use formal, technical language appropriate for professional documentation.",
    casual: "Use conversational language that's easy to understand.",
    tutorial: "Use educational language with clear explanations and step-by-step guidance.",
  };
  parts.push(toneInstructions[behavioral.tone]);

  // Add question generation instruction if applicable
  if (behavioral.generateQuestions !== 0) {
    if (behavioral.generateQuestions === -1) {
      parts.push("Include relevant questions that readers might have about this content.");
    } else {
      parts.push(`Include exactly ${behavioral.generateQuestions} relevant questions that readers might have about this content.`);
    }
  }

  return parts.join(" ");
}
