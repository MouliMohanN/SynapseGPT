# Quick Start Guide - Refactored Architecture

## New File Structure

```
web/src/
├── config/
│   ├── constants.ts          ← App constants & defaults
│   └── modelConfig.ts         ← AI model configurations
├── services/
│   ├── chatService.ts         ← Chat/streaming API
│   └── documentService.ts     ← Document API
├── hooks/
│   ├── useSummary.ts          ← Summary generation logic
│   └── usePanelResize.ts      ← Panel resize logic
├── utils/
│   ├── documentUtils.ts       ← Document filtering/sorting
│   └── storage.ts             ← localStorage wrapper
└── components/
    └── SummarySettingsModal.tsx  ← Summary config UI
```

## Common Tasks

### 1. Add a New Model Preset

**File**: `web/src/config/modelConfig.ts`

```typescript
export const SPEED_PRESETS: Record<SpeedPreset, ModelConfig> = {
  quick: { temperature: 0.3, maxTokens: 512, topP: 0.85 },
  balanced: { temperature: 0.5, maxTokens: 1536, topP: 0.9 },
  deep: { temperature: 0.7, maxTokens: 3072, topP: 0.95 },
  // Add new preset:
  ultra: { temperature: 0.8, maxTokens: 4096, topP: 1.0 },
};
```

### 2. Use Summary Generation in a Component

```typescript
import { useSummary } from "@/hooks/useSummary";

function MyComponent() {
  const summary = useSummary({
    onComplete: (content) => console.log("Done!"),
  });

  return (
    <button onClick={() => summary.generateSummary(docId)}>
      {summary.isLoading ? "Generating..." : "Generate Summary"}
    </button>
  );
}
```

### 3. Fetch Documents

```typescript
import { fetchDocuments, fetchDocumentById } from "@/services/documentService";

// Get all documents
const docs = await fetchDocuments();

// Get specific document
const doc = await fetchDocumentById("my-doc-id");
```

### 4. Filter and Sort Documents

```typescript
import { sortDocs, filterDocs } from "@/utils/documentUtils";

const sorted = sortDocs(docs);
const filtered = filterDocs(docs, "search query");
```

### 5. Use Type-Safe Storage

```typescript
import { storage } from "@/utils/storage";
import { CHAT_STORAGE_KEY } from "@/config/constants";

// Save
storage.set(CHAT_STORAGE_KEY, messages);

// Load with default
const messages = storage.get<ChatMessage[]>(CHAT_STORAGE_KEY, []);

// Remove
storage.remove(CHAT_STORAGE_KEY);
```

### 6. Add Resizable Panels

```typescript
import { usePanelResize } from "@/hooks/usePanelResize";

function Layout() {
  const panels = usePanelResize(20, 25); // initial widths

  return (
    <>
      <div style={{ width: `${panels.leftWidth}%` }}>Left</div>
      <div onMouseDown={panels.startDraggingLeft}>Resize</div>
      <div>Center</div>
      <div onMouseDown={panels.startDraggingRight}>Resize</div>
      <div style={{ width: `${panels.rightWidth}%` }}>Right</div>
    </>
  );
}
```

### 7. Stream Chat Messages

```typescript
import { streamChat, readStreamChunks } from "@/services/chatService";

const { reader, decoder } = await streamChat({
  conversationId: "conv-1",
  docId: "doc-1",
  mode: "question",
  message: "What is React?",
  modelConfig: { temperature: 0.7 },
});

await readStreamChunks(reader, decoder, (chunk) => {
  console.log("Received:", chunk);
});
```

## Import Paths

All imports use the `@/` alias:

```typescript
import { SPEED_PRESETS } from "@/config/modelConfig";
import { fetchDocuments } from "@/services/documentService";
import { useSummary } from "@/hooks/useSummary";
import { storage } from "@/utils/storage";
import { SummarySettingsModal } from "@/components/SummarySettingsModal";
```

## Type Imports

Use type-only imports for types:

```typescript
import type { SpeedPreset, DetailLevel, Tone } from "@/config/modelConfig";
import type { DocNode, DocumentContent } from "@/lib/types";
```

## Key Benefits at a Glance

| Aspect | Before | After |
|--------|--------|-------|
| **Add preset** | Edit multiple places | One config entry |
| **Reuse logic** | Copy/paste code | Import hook |
| **Test API** | Test whole component | Test service alone |
| **Find bug** | Search 1400 lines | Check specific module |
| **Add feature** | Risk breaking things | Extend isolated module |

## Architecture Diagram

```
Component
   ↓
 Hook (business logic)
   ↓
Service (API calls) → Config (constants)
   ↓
  API
```

## Files You Created

✅ `web/src/config/constants.ts`
✅ `web/src/config/modelConfig.ts`
✅ `web/src/services/chatService.ts`
✅ `web/src/services/documentService.ts`
✅ `web/src/hooks/useSummary.ts`
✅ `web/src/hooks/usePanelResize.ts`
✅ `web/src/utils/documentUtils.ts`
✅ `web/src/utils/storage.ts`
✅ `web/src/components/SummarySettingsModal.tsx`

## Next Steps

1. **Read** `REFACTORING_GUIDE.md` for detailed examples
2. **Review** `REFACTORING_SUMMARY.md` for architecture overview
3. **Start using** the new modules in your components
4. **Gradually migrate** existing code to use new structure

## Getting Help

- Check `REFACTORING_GUIDE.md` for detailed usage examples
- Look at existing hooks/services for patterns
- All modules are well-typed - use TypeScript autocomplete
- Each file is small and focused - easy to understand

## Best Practices

✅ **DO**: Import from new modules instead of inline logic
✅ **DO**: Use constants instead of magic strings/numbers
✅ **DO**: Use hooks for stateful logic
✅ **DO**: Use services for API calls
✅ **DO**: Keep components focused on UI

❌ **DON'T**: Hardcode configuration values
❌ **DON'T**: Mix API logic with components
❌ **DON'T**: Copy/paste code - create reusable modules
❌ **DON'T**: Create large monolithic files
