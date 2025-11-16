export type DocNodeType = "file" | "folder";

export interface DocNode {
  id: string;
  name: string;
  path: string;
  type: DocNodeType;
  children?: DocNode[];
  size?: number;
  lastModified?: string;
}

export interface DocumentSection {
  id: string;
  title: string;
  startOffset: number;
  endOffset: number;
  level: number;
}

export interface DocumentContent {
  id: string;
  name: string;
  path: string;
  rawText: string;
  sections: DocumentSection[];
  meta: {
    size?: number;
    lastModified?: string;
    fileType?: string;
  };
}

export type ChatMode = "question" | "summary" | "key_points" | "faqs";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  mode?: ChatMode;
  createdAt: string;
}

export interface ChatRequestBody {
  conversationId: string;
  docId: string;
  sectionId?: string | null;
  mode: ChatMode;
  message: string;
}
