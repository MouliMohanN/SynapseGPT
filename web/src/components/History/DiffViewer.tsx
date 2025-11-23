import React, { useMemo } from 'react';
import { diffLines, Change } from 'diff';

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ oldContent, newContent }) => {
  const diff = useMemo(() => {
    return diffLines(oldContent, newContent);
  }, [oldContent, newContent]);

  return (
    <div className="flex-1 overflow-auto bg-white p-4 font-mono text-sm">
      {diff.map((part, index) => {
        const color = part.added ? 'bg-green-100 text-green-800' : part.removed ? 'bg-red-100 text-red-800' : 'text-slate-600';
        const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
        
        return (
          <div key={index} className={`${color} whitespace-pre-wrap`}>
            {part.value.split('\n').map((line, i) => {
               // Don't render the last empty line if it's just a split artifact
               if (i === part.value.split('\n').length - 1 && line === '') return null;
               return <div key={i} className="px-2">{prefix}{line}</div>;
            })}
          </div>
        );
      })}
    </div>
  );
};
