const cachedFlags = {
  retrievalContext:
    typeof process !== "undefined" && process.env.ENABLE_RETRIEVAL_CONTEXT !== "false",
} as const;

export function isRetrievalContextEnabled(): boolean {
  return cachedFlags.retrievalContext;
}
