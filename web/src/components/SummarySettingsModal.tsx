import React from "react";
import type { SpeedPreset, DetailLevel, Tone } from "@/config/modelConfig";

interface SummarySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preset: SpeedPreset;
  detailLevel: DetailLevel;
  tone: Tone;
  questionCount: number;
  onPresetChange: (preset: SpeedPreset) => void;
  onDetailLevelChange: (level: DetailLevel) => void;
  onToneChange: (tone: Tone) => void;
  onQuestionCountChange: (count: number) => void;
  onApply: () => void;
}

export const SummarySettingsModal: React.FC<SummarySettingsModalProps> = ({
  isOpen,
  onClose,
  preset,
  detailLevel,
  tone,
  questionCount,
  onPresetChange,
  onDetailLevelChange,
  onToneChange,
  onQuestionCountChange,
  onApply,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white border border-slate-200 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">AI Summary Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Speed Preset */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">Speed Preset</label>
            <div className="flex gap-2">
              {(["quick", "balanced", "deep"] as SpeedPreset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => onPresetChange(p)}
                  className={`flex-1 px-3 py-2 text-xs rounded transition-all ${
                    preset === p
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-purple-50 border border-slate-300"
                  }`}
                >
                  {p === "quick" && "⚡ Quick"}
                  {p === "balanced" && "⚖️ Balanced"}
                  {p === "deep" && "🔬 Deep"}
                  <div className="text-[9px] opacity-75 mt-0.5">
                    {p === "quick" && "512 tokens"}
                    {p === "balanced" && "1536 tokens"}
                    {p === "deep" && "3072 tokens"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detail Level */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">Detail Level</label>
            <div className="flex gap-2">
              {(["overview", "detailed", "comprehensive"] as DetailLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => onDetailLevelChange(level)}
                  className={`flex-1 px-3 py-2 text-xs rounded transition-all capitalize ${
                    detailLevel === level
                      ? "bg-amber-500 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-amber-50 border border-slate-300"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">Writing Tone</label>
            <div className="flex gap-2">
              {(["professional", "casual", "tutorial"] as Tone[]).map((t) => (
                <button
                  key={t}
                  onClick={() => onToneChange(t)}
                  className={`flex-1 px-3 py-2 text-xs rounded transition-all capitalize ${
                    tone === t
                      ? "bg-blue-500 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-blue-50 border border-slate-300"
                  }`}
                >
                  {t === "professional" && "📊"} {t === "casual" && "💬"} {t === "tutorial" && "📚"} {t}
                </button>
              ))}
            </div>
          </div>

          {/* Questions */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              Questions: {questionCount === -1 ? "All (LLM decides)" : questionCount === 0 ? "None" : questionCount}
            </label>
            <div className="flex gap-2 mb-2">
              {[
                { value: 0, label: "None" },
                { value: 5, label: "Few (5)" },
                { value: 10, label: "Many (10)" },
                { value: -1, label: "All" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => onQuestionCountChange(option.value)}
                  className={`px-3 py-1.5 text-xs rounded transition-all ${
                    questionCount === option.value
                      ? "bg-green-600 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-green-50 border border-slate-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {questionCount > 0 && questionCount !== -1 && (
              <input
                type="range"
                min="1"
                max="20"
                step="1"
                value={questionCount}
                onChange={(e) => onQuestionCountChange(parseInt(e.target.value))}
                className="w-full accent-green-600"
              />
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => {
              onApply();
              onClose();
            }}
            className="flex-1 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors font-medium shadow-sm"
          >
            Apply & Generate
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
