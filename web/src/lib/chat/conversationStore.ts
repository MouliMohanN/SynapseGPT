import type { ChatMessage } from "@/lib/types";

// Simple in-memory conversation store for this server process.
// This is non-persistent and per-process only, which is fine for
// local/offline usage and development.
const conversations = new Map<string, ChatMessage[]>();

export function getConversationHistory(conversationId: string): ChatMessage[] {
  return conversations.get(conversationId) ?? [];
}

export function updateConversationHistory(
  conversationId: string,
  userMessage: string,
  assistantMessage: string,
): void {
  const history = getConversationHistory(conversationId);
  const now = new Date().toISOString();
  
  const updatedHistory: ChatMessage[] = [
    ...history,
    {
      role: "user",
      content: userMessage,
      createdAt: now,
    },
    {
      role: "assistant",
      content: assistantMessage,
      createdAt: now,
    },
  ];
  
  conversations.set(conversationId, updatedHistory);
}

export function hasConversation(conversationId: string): boolean {
  return conversations.has(conversationId);
}
