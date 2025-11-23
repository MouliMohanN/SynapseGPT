import React from 'react';

interface HistoryVersion {
  timestamp: string;
  size: number;
}

interface HistorySidebarProps {
  versions: HistoryVersion[];
  selectedVersion: string | null;
  onSelectVersion: (timestamp: string) => void;
  onClose: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  versions,
  selectedVersion,
  onSelectVersion,
  onClose,
}) => {
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString();
  };

  return (
    <div className="w-64 border-l border-slate-200 bg-slate-50 flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
        <h3 className="font-semibold text-slate-700">History</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        {versions.length === 0 ? (
          <div className="text-center text-slate-500 py-8 text-sm">
            No history available
          </div>
        ) : (
          <div className="space-y-2">
            {/* Current Version Entry (Implicit) - Optional, but good for UX */}
            <button
              onClick={() => onSelectVersion('current')}
              className={`w-full text-left p-3 rounded-lg text-sm transition-colors border ${
                selectedVersion === 'current' || selectedVersion === null
                  ? 'bg-purple-50 border-purple-200 text-purple-700'
                  : 'bg-white border-slate-200 hover:border-purple-200 hover:shadow-sm'
              }`}
            >
              <div className="font-medium">Current Version</div>
              <div className="text-xs opacity-70 mt-1">Now</div>
            </button>

            {versions.map((version) => (
              <button
                key={version.timestamp}
                onClick={() => onSelectVersion(version.timestamp)}
                className={`w-full text-left p-3 rounded-lg text-sm transition-colors border ${
                  selectedVersion === version.timestamp
                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                    : 'bg-white border-slate-200 hover:border-purple-200 hover:shadow-sm'
                }`}
              >
                <div className="font-medium">{formatDate(version.timestamp)}</div>
                <div className="text-xs opacity-70 mt-1">
                  {version.size < 1024 
                    ? `${version.size} B` 
                    : `${(version.size / 1024).toFixed(1)} KB`} patch
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
