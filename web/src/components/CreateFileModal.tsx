import React, { useEffect, useRef, useState } from "react";

interface CreateFileModalProps {
  isOpen: boolean;
  initialParentPath: string;
  onClose: () => void;
  onCreated?: () => void;
}

export const CreateFileModal: React.FC<CreateFileModalProps> = ({
  isOpen,
  initialParentPath,
  onClose,
  onCreated,
}) => {
  const [fileName, setFileName] = useState("");
  const [parentPath, setParentPath] = useState(() => initialParentPath || "");
  const [availablePaths, setAvailablePaths] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load existing folder paths when modal opens
  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/docs")
      .then((res) => res.json())
      .then((data: { docs: any[] }) => {
        const paths: string[] = [];
        const traverse = (nodes: any[], parent = "") => {
          for (const node of nodes) {
            if (node.type === "folder") {
              const currentPath = parent ? `${parent}/${node.name}` : node.name;
              paths.push(currentPath);
              if (node.children) {
                traverse(node.children, currentPath);
              }
            }
          }
        };
        traverse(data.docs);
        setAvailablePaths(paths.sort());
      })
      .catch((err) => console.error("Failed to fetch docs for file picker:", err));
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredPaths = availablePaths.filter((p) =>
    p.toLowerCase().includes(parentPath.toLowerCase()),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = fileName.trim();
    if (!trimmedName) {
      return;
    }

    const cleanParent = parentPath.replace(/^\/+|\/+$/g, "").trim();

    try {
      setStatus("saving");
      setMessage("");

      const res = await fetch("/api/docs/file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentPath: cleanParent, name: trimmedName }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStatus("idle");
        if (onCreated) {
          onCreated();
        } else {
          onClose();
        }
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to create file.");
      }
    } catch (err) {
      console.error("Create file error:", err);
      setStatus("error");
      setMessage("Network error occurred.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Create File</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Parent directory (relative to docs/)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-slate-400 text-sm">docs/</span>
              </div>
              <input
                type="text"
                value={parentPath}
                onChange={(e) => {
                  setParentPath(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="folder/subfolder (optional)"
                className="pl-12 block w-full rounded-md border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm border p-2"
              />
              <div
                className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {isDropdownOpen && filteredPaths.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                {filteredPaths.map((p) => (
                  <div
                    key={p}
                    className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-purple-50 text-slate-900"
                    onClick={() => {
                      setParentPath(p);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <div className="flex items-center">
                      <svg
                        className="w-4 h-4 text-slate-400 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                        />
                      </svg>
                      <span className="block truncate font-normal">{p}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-1 text-[10px] text-slate-500">
              Select existing folder or type a new path. Leave empty for root.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              File name
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="block w-full rounded-md border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm border p-2"
              placeholder="MyFile.md (extension optional)"
              autoFocus
            />
            <p className="mt-1 text-[10px] text-slate-500">
              If you omit an extension, .md will be added automatically.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!fileName.trim() || status === "saving"}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              {status === "saving" ? "Creating..." : "Create"}
            </button>
          </div>

          {message && (
            <p className="text-xs text-red-600 mt-1">{message}</p>
          )}
        </form>
      </div>
    </div>
  );
};
