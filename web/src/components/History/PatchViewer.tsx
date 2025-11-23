import React, { useMemo } from 'react';

interface PatchViewerProps {
  patch: string;
}

export const PatchViewer: React.FC<PatchViewerProps> = ({ patch }) => {
  const lines = useMemo(() => patch.split('\n'), [patch]);

  return (
    <div className="flex-1 overflow-auto bg-white p-4 font-mono text-sm">
      {lines.map((line, index) => {
        if (index === lines.length - 1 && line === '') {
          return null;
        }

        let color = 'text-slate-600';

        if (line.startsWith('@@')) {
          color = 'bg-slate-100 text-slate-700';
        } else if (line.startsWith('+') && !line.startsWith('+++')) {
          // In our history patches, '+' lines represent content that existed
          // in the older version but not in the current one (reverse patch),
          // so we style them as removals (red).
          color = 'bg-red-100 text-red-800';
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          // '-' lines represent content that exists only in the newer version
          // relative to this patch, so we style them as additions (green).
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
          <div key={index} className={`${color} whitespace-pre-wrap`}>
            <div className="px-2">{line}</div>
          </div>
        );
      })}
    </div>
  );
};
