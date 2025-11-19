"use client";

import { Logo } from "@/components/Logo";

interface AppHeaderProps {
  onShowAbout: () => void;
}

export const AppHeader = ({ onShowAbout }: AppHeaderProps) => {
  return (
    <header className="bg-white border-b border-slate-300 px-6 py-3 flex items-center justify-between shadow-sm">
      <Logo size="md" showText={true} onClick={onShowAbout} />
      <div className="flex items-center gap-3">
        <div className="text-xs text-slate-600">
          <span className="font-medium text-slate-900">AI-Powered</span> Documentation Assistant
        </div>
        <div className="h-4 w-px bg-slate-300" />
        <a
          href="https://www.synapsewave.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-purple-600 hover:text-purple-700 font-medium transition-colors"
        >
          Powered by SynapseWave
        </a>
      </div>
    </header>
  );
};
