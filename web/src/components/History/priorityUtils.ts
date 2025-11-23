import { parsePatch } from 'diff';
import type { HistoryPatchMetadata, HistoryPriority } from '@/lib/history';

export type PriorityFilter = 'all' | 'high' | 'low';

export function buildHunkPriorityMap(
  metadata?: HistoryPatchMetadata | null,
): Map<number, HistoryPriority> {
  const map = new Map<number, HistoryPriority>();
  if (!metadata || !Array.isArray(metadata.hunks)) return map;
  for (const h of metadata.hunks) {
    if (!h) continue;
    if (h.priority === 'low' || h.priority === 'high') {
      map.set(h.index, h.priority);
    }
  }
  return map;
}

export function getEffectiveHunkPriority(
  index: number,
  map: Map<number, HistoryPriority>,
): HistoryPriority {
  const stored = map.get(index);
  // Default is High unless explicitly marked low
  return stored === 'low' ? 'low' : 'high';
}

export function buildLinePrioritySets(
  patch: string | null | undefined,
  metadata?: HistoryPatchMetadata | null,
): { high: Set<string>; low: Set<string> } {
  const high = new Set<string>();
  const low = new Set<string>();

  if (!patch) return { high, low };

  try {
    const parsed = parsePatch(patch || '');
    const filePatch = parsed[0];
    if (!filePatch || !filePatch.hunks) return { high, low };

    const metaByIndex = new Map<number, HistoryPriority>();
    if (metadata && Array.isArray(metadata.hunks)) {
      for (const h of metadata.hunks) {
        if (!h) continue;
        if (h.priority === 'low' || h.priority === 'high') {
          metaByIndex.set(h.index, h.priority);
        }
      }
    }

    filePatch.hunks.forEach((hunk, idx) => {
      const stored = metaByIndex.get(idx);
      const effective: HistoryPriority = stored === 'low' ? 'low' : 'high';
      const target = effective === 'low' ? low : high;

      hunk.lines.forEach((line) => {
        if (!line || line.startsWith('@@')) return;
        const content = line.slice(1); // drop +/-/space
        if (!content.trim()) return;
        target.add(content);
      });
    });
  } catch {
    // fall back to empty sets
  }

  return { high, low };
}
