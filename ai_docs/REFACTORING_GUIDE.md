# SynapseGPT Refactoring Guide

## Overview

The codebase has been refactored to follow best practices for maintainability, reusability, and scalability. This guide explains the new architecture and how to use it.

## New Architecture

### Directory Structure

```
web/src/
├── config/              # Configuration constants
│   ├── constants.ts     # App-wide constants
│   └── modelConfig.ts   # AI model configurations
├── services/            # API service layer
│   ├── chatService.ts   # Chat/streaming operations
│   └── documentService.ts # Document operations
├── hooks/               # Custom React hooks
│   ├── useSummary.ts    # Summary generation logic
│   └── usePanelResize.ts # Panel resizing logic
├── utils/               # Utility functions
│   ├── documentUtils.ts # Document filtering/sorting
│   └── storage.ts       # localStorage wrapper
└── components/          # Reusable UI components
    └── SummarySettingsModal.tsx
```

## Key Principles

### 1. Separation of Concerns

Each module has a single, well-defined responsibility:
- **Config**: Constants and configuration values
- **Services**: API communication
- **Hooks**: Stateful business logic
- **Utils**: Pure functions without side effects
- **Components**: UI presentation

### 2. Reusability

All utilities, hooks, and components are designed to be reused across the application:

```typescript
// Before: Hardcoded in component
const presetConfigs = {
  quick: { temperature: 0.3, maxTokens: 512, topP: 0.85 },
  // ...
};

// After: Reusable config
import { SPEED_PRESETS } from "@/config/modelConfig";
const config = SPEED_PRESETS[preset];
```

### 3. Type Safety

All modules export proper TypeScript types:

```typescript
import type { SpeedPreset, DetailLevel, Tone } from "@/config/modelConfig";
import type { ModelConfig } from "@/config/modelConfig";
```

## Usage Examples

### Using the Summary Hook

```typescript
import { useSummary } from "@/hooks/useSummary";

function MyComponent() {
  const summary = useSummary({
    onComplete: (content) => console.log("Done!", content),
    onError: (error) => console.error("Error:", error),
  });

  return (
    <div>
      <button onClick={() => summary.generateSummary(docId)}>
        Generate
      </button>
      
      {summary.isLoading && <Spinner />}
      {summary.error && <Error message={summary.error} />}
      
      <div>{summary.content}</div>
    </div>
  );
}
```

### Using Document Services

```typescript
import { fetchDocuments, searchDocuments } from "@/services/documentService";

// Fetch all documents
const docs = await fetchDocuments();

// Search across documents
const results = await searchDocuments(docs, "react");
```

### Using Storage Utilities

```typescript
import { storage } from "@/utils/storage";
import { CHAT_STORAGE_KEY } from "@/config/constants";

// Type-safe storage
const messages = storage.get<ChatMessage[]>(CHAT_STORAGE_KEY, []);
storage.set(CHAT_STORAGE_KEY, updatedMessages);
```

### Using Panel Resize Hook

```typescript
import { usePanelResize } from "@/hooks/usePanelResize";

function Layout() {
  const panels = usePanelResize(20, 25);

  return (
    <div>
      <div style={{ width: `${panels.leftWidth}%` }}>Left Panel</div>
      <div onMouseDown={panels.startDraggingLeft}>Resize Handle</div>
      <div>Main Content</div>
    </div>
  );
}
```

## Refactored Page.tsx Example

Here's how the main page component should be refactored:

```typescript
"use client";

import React, { useEffect, useState } from "react";
import { useSummary } from "@/hooks/useSummary";
import { usePanelResize } from "@/hooks/usePanelResize";
import { SummarySettingsModal } from "@/components/SummarySettingsModal";
import { fetchDocuments, fetchDocumentById } from "@/services/documentService";
import { sortDocs, filterDocs, findFirstFile } from "@/utils/documentUtils";
import { storage } from "@/utils/storage";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from "@/config/constants";

export default function HomePage() {
  // Document state
  const [docs, setDocs] = useState<DocNode[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<DocumentContent | null>(null);
  
  // Settings
  const [settings, setSettings] = useState(
    storage.get(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS)
  );
  
  // Panel management
  const panels = usePanelResize(
    settings.defaultLeftWidth,
    settings.defaultRightWidth
  );
  
  // Summary management
  const summary = useSummary();
  const [showSummarySettings, setShowSummarySettings] = useState(false);

  // Load documents on mount
  useEffect(() => {
    const loadDocs = async () => {
      try {
        const data = await fetchDocuments();
        setDocs(data);
        
        const firstFile = findFirstFile(data);
        if (firstFile) {
          setSelectedDocId(firstFile.id);
        }
      } catch (err) {
        console.error("Failed to load docs:", err);
      }
    };

    loadDocs();
  }, []);

  // Load document content when selection changes
  useEffect(() => {
    if (!selectedDocId) return;

    const loadDoc = async () => {
      try {
        const data = await fetchDocumentById(selectedDocId);
        setDocContent(data);
        summary.generateSummary(selectedDocId);
      } catch (err) {
        console.error("Failed to load document:", err);
      }
    };

    loadDoc();
  }, [selectedDocId]);

  // Save settings
  const handleSaveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    panels.setLeftWidth(newSettings.defaultLeftWidth);
    panels.setRightWidth(newSettings.defaultRightWidth);
    storage.set(SETTINGS_STORAGE_KEY, newSettings);
  };

  const visibleDocs = sortDocs(filterDocs(docs, docFilter));

  return (
    <div className="flex h-screen">
      {/* Left Panel */}
      <div style={{ width: `${panels.leftWidth}%` }}>
        {/* Document tree */}
      </div>

      {/* Resize Handle */}
      <div onMouseDown={panels.startDraggingLeft} />

      {/* Main Content */}
      <div>
        {/* Document viewer */}
      </div>

      {/* Right Panel */}
      <div style={{ width: `${panels.rightWidth}%` }}>
        <div className="flex items-center justify-between">
          <h2>AI Summary</h2>
          <div className="flex gap-2">
            <button onClick={() => setShowSummarySettings(true)}>
              Settings
            </button>
            <button onClick={() => summary.generateSummary(selectedDocId!)}>
              Regenerate
            </button>
          </div>
        </div>
        
        {summary.isLoading && <div>Loading...</div>}
        {summary.error && <div>Error: {summary.error}</div>}
        <div>{summary.content}</div>
      </div>

      {/* Summary Settings Modal */}
      <SummarySettingsModal
        isOpen={showSummarySettings}
        onClose={() => setShowSummarySettings(false)}
        preset={summary.preset}
        detailLevel={summary.detailLevel}
        tone={summary.tone}
        questionCount={summary.questionCount}
        onPresetChange={summary.setPreset}
        onDetailLevelChange={summary.setDetailLevel}
        onToneChange={summary.setTone}
        onQuestionCountChange={summary.setQuestionCount}
        onApply={() => summary.generateSummary(selectedDocId!)}
      />
    </div>
  );
}
```

## Benefits of This Architecture

### 1. **Maintainability**
- Each file has a single responsibility
- Easy to locate and fix bugs
- Changes are isolated to specific modules

### 2. **Reusability**
- Hooks can be used in multiple components
- Services can be called from anywhere
- Utils are pure functions that work everywhere

### 3. **Testability**
- Pure functions are easy to unit test
- Hooks can be tested with React Testing Library
- Services can be mocked easily

### 4. **Scalability**
- Easy to add new presets, configurations
- New hooks can be added without touching existing code
- Services can be extended with new endpoints

### 5. **Type Safety**
- All modules export proper types
- Reduced runtime errors
- Better IDE autocomplete

## Migration Strategy

To migrate existing code:

1. **Identify concerns** in large components
2. **Extract configuration** to config files
3. **Create services** for API calls
4. **Build hooks** for stateful logic
5. **Extract utilities** for pure functions
6. **Create components** for reusable UI
7. **Refactor main component** to use new modules

## Best Practices

### DO:
✅ Keep functions small and focused
✅ Use TypeScript types everywhere
✅ Write reusable, pure functions
✅ Extract magic numbers to constants
✅ Use custom hooks for complex state logic
✅ Keep components focused on rendering

### DON'T:
❌ Mix API logic with UI components
❌ Duplicate configuration values
❌ Create large monolithic components
❌ Use inline magic numbers
❌ Put business logic in components
❌ Mix concerns in a single file

## Next Steps

1. Refactor remaining sections of `page.tsx`
2. Extract chat logic into `useChat` hook
3. Create document management hook `useDocuments`
4. Add unit tests for utilities and hooks
5. Add integration tests for services
