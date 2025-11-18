# Ollama gpt-oss:20b Configuration Guide

## Overview
This document outlines all available configuration parameters for the Ollama `gpt-oss:20b` model used in SynapseGPT.

## Current Implementation

### Basic Configuration
```typescript
const ollamaBody = {
  model: "gpt-oss:20b",
  stream: true,
  messages: [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: message }
  ]
}
```

**Location:** `web/src/app/api/chat/stream/route.ts`

**Environment Variables:**
- `OLLAMA_URL`: Default `http://localhost:11434`
- `OLLAMA_MODEL`: Default `gpt-oss:20b`

## All Available Parameters

### Core Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `model` | string | Model identifier | `"gpt-oss:20b"` |
| `messages` | array | Conversation messages | Required |
| `stream` | boolean | Enable streaming responses | `false` |
| `format` | string | Force output format (e.g., "json") | - |
| `raw` | boolean | Bypass prompt template | `false` |
| `keep_alive` | string | Duration to keep model loaded | `"5m"` |

### Options Object

The `options` object allows fine-tuning of model behavior:

#### Sampling Parameters

| Parameter | Type | Range | Description | Default |
|-----------|------|-------|-------------|---------|
| `temperature` | number | 0.0 - 2.0 | Controls randomness. Higher = more creative | 0.8 |
| `top_k` | number | 1+ | Limits vocabulary to top K tokens | 40 |
| `top_p` | number | 0.0 - 1.0 | Nucleus sampling threshold | 0.9 |
| `seed` | number | any | Random seed for reproducibility | - |
| `typical_p` | number | 0.0 - 1.0 | Typical probability sampling | 1.0 |
| `tfs_z` | number | 0.0 - 1.0 | Tail free sampling | 1.0 |

#### Repetition Control

| Parameter | Type | Range | Description | Default |
|-----------|------|-------|-------------|---------|
| `repeat_penalty` | number | 0.0+ | Penalty for repeating tokens | 1.1 |
| `repeat_last_n` | number | 0+ | Window size for repetition check | 64 |
| `presence_penalty` | number | -2.0 - 2.0 | Penalty for token presence | 0.0 |
| `frequency_penalty` | number | -2.0 - 2.0 | Penalty based on token frequency | 0.0 |
| `penalize_newline` | boolean | - | Penalize newline characters | true |

#### Context & Generation

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `num_ctx` | number | Context window size (tokens) | 2048 |
| `num_predict` | number | Max tokens to generate (-1 = unlimited) | -1 |
| `num_keep` | number | Tokens to keep from context | 0 |
| `stop` | string[] | Stop sequences to end generation | - |

#### Mirostat Sampling

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `mirostat` | number | 0=disabled, 1 or 2 for mirostat algorithm | 0 |
| `mirostat_tau` | number | Target entropy for mirostat | 5.0 |
| `mirostat_eta` | number | Learning rate for mirostat | 0.1 |

#### Performance & Hardware

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `num_thread` | number | Number of CPU threads | - |
| `num_gpu` | number | Number of GPUs to use | - |
| `main_gpu` | number | Main GPU index | 0 |
| `num_batch` | number | Batch size for prompt processing | 512 |
| `low_vram` | boolean | Reduce VRAM usage | false |
| `f16_kv` | boolean | Use fp16 for key/value cache | true |
| `use_mmap` | boolean | Use memory mapping | true |
| `use_mlock` | boolean | Lock model in RAM | false |
| `vocab_only` | boolean | Only load vocabulary | false |

## Preset Configurations

### Creative Writing
Best for stories, articles, and creative content.

```typescript
options: {
  temperature: 1.2,
  top_p: 0.95,
  repeat_penalty: 1.2,
  num_ctx: 4096
}
```

### Precise/Technical
Ideal for documentation, summaries, and factual content.

```typescript
options: {
  temperature: 0.3,
  top_p: 0.9,
  repeat_penalty: 1.1,
  num_ctx: 2048
}
```

### Code Generation
Optimized for generating code snippets and technical solutions.

```typescript
options: {
  temperature: 0.2,
  top_k: 20,
  top_p: 0.85,
  repeat_penalty: 1.15,
  num_ctx: 4096,
  stop: ["```\n\n", "User:", "Human:"]
}
```

### Balanced (Current Default)
General-purpose configuration for mixed content.

```typescript
options: {
  temperature: 0.8,
  top_p: 0.9,
  repeat_penalty: 1.1,
  num_ctx: 2048
}
```

### Chat/Conversational
Natural dialogue with good context retention.

```typescript
options: {
  temperature: 0.7,
  top_p: 0.92,
  repeat_penalty: 1.18,
  repeat_last_n: 128,
  num_ctx: 4096
}
```

## Implementation Example

### Adding Options to Stream Route

```typescript
const ollamaBody = {
  model: OLLAMA_MODEL,
  stream: true,
  messages: [...],
  options: {
    temperature: mode === "chat" ? 0.7 : 0.3,
    top_p: 0.9,
    repeat_penalty: 1.1,
    num_ctx: 4096,
    num_predict: mode === "summary" ? 1024 : -1,
  },
  keep_alive: "10m",
};
```

### Mode-Specific Configuration

```typescript
function getModelOptions(mode: string) {
  switch (mode) {
    case "summary":
      return {
        temperature: 0.3,
        top_p: 0.9,
        num_ctx: 4096,
        num_predict: 1024,
      };
    case "chat":
      return {
        temperature: 0.7,
        top_p: 0.92,
        repeat_penalty: 1.18,
        num_ctx: 4096,
      };
    case "explain":
      return {
        temperature: 0.5,
        top_p: 0.9,
        num_ctx: 2048,
      };
    default:
      return {
        temperature: 0.8,
        top_p: 0.9,
        repeat_penalty: 1.1,
      };
  }
}
```

## Performance Considerations

### Memory Usage
- **num_ctx**: Larger context = more memory. Default 2048 is balanced.
- **num_batch**: Higher = faster but more VRAM. Default 512 works well.
- **low_vram**: Enable if running on systems with limited GPU memory.

### Speed Optimization
- **num_thread**: Set to CPU core count for optimal speed.
- **num_gpu**: Use all available GPUs for faster inference.
- **use_mmap**: Keep enabled for better memory management.

### Quality vs Speed
- Lower `temperature` (0.2-0.5): Faster, more deterministic
- Higher `temperature` (0.8-1.5): Slower, more creative
- Lower `num_ctx`: Faster but less context awareness
- Higher `num_predict`: Longer generations but slower response

## Testing Configurations

### Curl Example
```bash
curl http://localhost:11434/api/chat -d '{
  "model": "gpt-oss:20b",
  "stream": true,
  "messages": [
    {
      "role": "user",
      "content": "Explain quantum computing"
    }
  ],
  "options": {
    "temperature": 0.3,
    "num_ctx": 2048
  }
}'
```

### Environment Variable Override
```bash
# .env.local
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gpt-oss:20b
```

## References

- [Ollama API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Model Parameters Guide](https://github.com/ollama/ollama/blob/main/docs/modelfile.md#parameter)
- SynapseGPT Implementation: `web/src/app/api/chat/stream/route.ts`

## Changelog

### 2025-11-17
- Initial documentation created
- Current implementation uses basic streaming configuration
- Presets defined for future enhancement
