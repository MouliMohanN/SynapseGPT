import React, { useMemo } from 'react';
import { diffLines } from 'diff';
import type { HistoryPatchMetadata } from '@/lib/history';
import { PriorityFilter, buildLinePrioritySets } from './priorityUtils';

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  patch?: string;
  metadata?: HistoryPatchMetadata | null;
  filter?: PriorityFilter;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  oldContent,
  newContent,
  patch,
  metadata,
  filter = 'all',
}) => {
  const diff = useMemo(() => {
    return diffLines(oldContent, newContent);
  }, [oldContent, newContent]);

  const prioritySets = useMemo(() => {
    return buildLinePrioritySets(patch, metadata);
  }, [patch, metadata]);

  const normalizeLine = (line: string) => line;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white p-4 font-mono text-sm">
      {diff.map((part, index) => {
        const baseColor = part.added
          ? 'bg-green-100 text-green-800'
          : part.removed
          ? 'bg-red-100 text-red-800'
          : 'text-slate-600';
        const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';

        return (
          <div key={index} className={`whitespace-pre-wrap break-words ${baseColor}`}>
            {part.value.split('\n').map((line, i) => {
              if (i === part.value.split('\n').length - 1 && line === '') return null;

              const normalized = normalizeLine(line);
              let linePriority: 'none' | 'high' | 'low' = 'none';
              if (prioritySets.high.has(normalized)) {
                linePriority = 'high';
              } else if (prioritySets.low.has(normalized)) {
                linePriority = 'low';
              }

              let emphasisClass = '';
              if (filter === 'high') {
                emphasisClass = linePriority === 'high' ? '' : ' opacity-50';
              } else if (filter === 'low') {
                emphasisClass = linePriority === 'low' ? '' : ' opacity-50';
              }

              let tag: React.ReactNode = null;
              if (linePriority === 'high') {
                tag = (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                    High
                  </span>
                );
              } else if (linePriority === 'low') {
                tag = (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200">
                    Low
                  </span>
                );
              }

              return (
                <div
                  key={i}
                  className={`px-2 flex items-baseline justify-between gap-2${emphasisClass}`}
                >
                  <span className="whitespace-pre-wrap break-words">{prefix}{line}</span>
                  {tag}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
