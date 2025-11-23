import React, { useMemo } from 'react';
import { parsePatch } from 'diff';
import type { HistoryPatchMetadata, HistoryPriority } from '@/lib/history';
import { PriorityFilter, buildHunkPriorityMap, getEffectiveHunkPriority } from './priorityUtils';

interface PatchViewerProps {
  patch: string;
  metadata?: HistoryPatchMetadata | null;
  filter?: PriorityFilter;
  interactive?: boolean;
  onChangeMetadata?: (next: HistoryPatchMetadata) => void;
}

export const PatchViewer: React.FC<PatchViewerProps> = ({
  patch,
  metadata,
  filter = 'all',
  interactive = false,
  onChangeMetadata,
}) => {
  const parsed = useMemo(() => {
    try {
      return parsePatch(patch || '') as any[];
    } catch {
      return [] as any[];
    }
  }, [patch]);

  const priorityMap = useMemo(() => {
    return buildHunkPriorityMap(metadata);
  }, [metadata]);

  const indicesToRender = useMemo(() => {
    const filePatch = parsed[0];
    const hunks = (filePatch?.hunks ?? []) as any[];
    const all = hunks.map((_: any, idx: number) => idx);
    if (!filePatch) return [] as number[];

    if (filter === 'all') return all;
    if (filter === 'high') {
      return all.filter((idx: number) => getEffectiveHunkPriority(idx, priorityMap) === 'high');
    }
    if (filter === 'low') {
      return all.filter((idx: number) => getEffectiveHunkPriority(idx, priorityMap) === 'low');
    }
    return all;
  }, [parsed, filter, priorityMap]);

  const filePatch = parsed[0];

  if (!filePatch || !filePatch.hunks || filePatch.hunks.length === 0) {
    return (
      <div className="flex-1 overflow-auto bg-white p-4 font-mono text-sm text-slate-500">
        No diff available for this version.
      </div>
    );
  }

  if (indicesToRender.length === 0) {
    const message =
      filter === 'high'
        ? 'No high-priority changes for this version.'
        : filter === 'low'
        ? 'No low-priority changes for this version.'
        : 'No changes for this version.';

    return (
      <div className="flex-1 overflow-auto bg-white p-4 font-mono text-sm text-slate-500">
        {message}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white p-4 font-mono text-sm space-y-4">
      {indicesToRender.map((hunkIndex: number) => {
        const hunk = filePatch.hunks[hunkIndex];
        const priority: HistoryPriority = getEffectiveHunkPriority(hunkIndex, priorityMap);

        return (
          <div key={hunkIndex} className="border border-slate-200 rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-2 py-1 bg-slate-50 border-b border-slate-200 text-[11px]">
              <div className="font-mono text-slate-700">
                {`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`}
              </div>
              {metadata && (
                interactive && onChangeMetadata ? (
                  <button
                    type="button"
                    onClick={() => {
                      const current: HistoryPatchMetadata = metadata ?? { hunks: [] };
                      const existingIndex = current.hunks.findIndex((h) => h.index === hunkIndex);
                      const next: HistoryPatchMetadata = { hunks: [...current.hunks] };

                      if (priority === 'low') {
                        // Currently low -> toggle back to default high by removing explicit entry
                        if (existingIndex >= 0) {
                          next.hunks.splice(existingIndex, 1);
                        }
                      } else {
                        // Currently high -> make this hunk explicitly low
                        if (existingIndex >= 0) {
                          next.hunks[existingIndex] = { index: hunkIndex, priority: 'low' };
                        } else {
                          next.hunks.push({ index: hunkIndex, priority: 'low' });
                        }
                      }

                      onChangeMetadata(next);
                    }}
                    className={`px-2 py-0.5 rounded-full uppercase tracking-wide text-[10px] border ${
                      priority === 'high'
                        ? 'bg-green-100 text-green-800 border-green-200'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {priority === 'high' ? 'High' : 'Low'}
                  </button>
                ) : (
                  <span
                    className={`px-2 py-0.5 rounded-full uppercase tracking-wide ${
                      priority === 'high'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {priority === 'high' ? 'High' : 'Low'}
                  </span>
                )
              )}
            </div>
            <div>
              {hunk.lines.map((line: string, index: number) => {
                let color = 'text-slate-600';

                if (line.startsWith('@@')) {
                  color = 'bg-slate-100 text-slate-700';
                } else if (line.startsWith('+') && !line.startsWith('+++')) {
                  color = 'bg-red-100 text-red-800';
                } else if (line.startsWith('-') && !line.startsWith('---')) {
                  color = 'bg-green-100 text-green-800';
                } else if (
                  line.startsWith('Index:') ||
                  line.startsWith('diff ') ||
                  line.startsWith('--- ') ||
                  line.startsWith('+++ ')
                ) {
                  color = 'text-slate-500';
                }

                return (
                  <div key={index} className={`${color} whitespace-pre-wrap break-words`}>
                    <div className="px-2">{line}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
