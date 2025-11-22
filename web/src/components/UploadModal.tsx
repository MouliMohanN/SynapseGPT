
import React, { useState, useRef, useEffect } from "react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [targetPath, setTargetPath] = useState("");
  const [availablePaths, setAvailablePaths] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

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

  // Filter paths based on input
  const filteredPaths = availablePaths.filter(path => 
    path.toLowerCase().includes(targetPath.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      // Fetch available paths when modal opens
      fetch("/api/docs")
        .then(res => res.json())
        .then((data: { docs: any[] }) => {
          const paths: string[] = [];
          const traverse = (nodes: any[], parentPath = "") => {
            for (const node of nodes) {
              if (node.type === "folder") {
                const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
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
        .catch(err => console.error("Failed to fetch docs for autocomplete:", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Helper to traverse FileSystemEntry (for drag-and-drop folders)
  const traverseFileTree = async (item: any, path = ""): Promise<File[]> => {
    if (item.isFile) {
      return new Promise((resolve) => {
        item.file((file: File) => {
          // Manually add the relative path to the file object so we can read it later
          // @ts-ignore
          file.webkitRelativePath = path + file.name;
          resolve([file]);
        });
      });
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      return new Promise((resolve) => {
        dirReader.readEntries(async (entries: any[]) => {
          const entriesPromises = entries.map((entry) => traverseFileTree(entry, path + item.name + "/"));
          const files = await Promise.all(entriesPromises);
          resolve(files.flat());
        });
      });
    }
    return [];
  };

  const handleFiles = async (files: File[]) => {
    const validFiles = files.filter(file => file.name.endsWith(".md") || file.name.endsWith(".txt"));

    if (validFiles.length === 0) {
      setStatus("error");
      setMessage("No valid .md or .txt files found.");
      return;
    }

    setStatus("uploading");
    setMessage(`Uploading and ingesting ${validFiles.length} file${validFiles.length > 1 ? 's' : ''}...`);

    const formData = new FormData();
    // Append target path (sanitize leading/trailing slashes if needed, but backend should handle it)
    formData.append("targetPath", targetPath);

    validFiles.forEach(file => {
      // If webkitRelativePath exists (from folder upload), use it. 
      // Otherwise, just use the filename.
      // We append the path to the filename in the FormData so the backend can parse it.
      // Actually, standard way is to just append the file. 
      // But for folder structure, we might need to send the relative path explicitly if the backend 
      // doesn't read webkitRelativePath from the file part (which it usually doesn't).
      // Let's append the relative path as a separate field or modify the filename.
      // A common trick is to append the relative path as the filename.
      
      const relativePath = (file as any).webkitRelativePath || file.name;
      formData.append("files", file, relativePath); 
    });

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setMessage(`Successfully uploaded ${data.count} files!`);
        if (onUploadComplete) {
          onUploadComplete();
        }
        setTimeout(() => {
          onClose();
          setStatus("idle");
          setMessage("");
          setTargetPath("");
        }, 2000);
      } else {
        setStatus("error");
        setMessage(data.error || "Upload failed.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Network error occurred.");
    }
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (items) {
      const files: File[] = [];
      const promises: Promise<File[]>[] = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
          promises.push(traverseFileTree(item));
        }
      }
      
      const results = await Promise.all(promises);
      results.forEach(fileList => files.push(...fileList));
      
      if (files.length > 0) {
        handleFiles(files);
      }
    } else if (e.dataTransfer.files) {
      // Fallback for browsers not supporting webkitGetAsEntry
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Upload Documents</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>



        {/* Target Directory Input */}
        <div className="mb-4 relative" ref={dropdownRef}>
          <label className="block text-xs font-medium text-slate-700 mb-1">Target Directory (Optional)</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <span className="text-slate-400 text-sm">docs/</span>
            </div>
            <input
              type="text"
              value={targetPath}
              onChange={(e) => {
                setTargetPath(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="folder/subfolder"
              className="pl-12 block w-full rounded-md border-slate-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm border p-2"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <svg className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          {/* Custom Dropdown */}
          {isDropdownOpen && filteredPaths.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
              {filteredPaths.map((path) => (
                <div
                  key={path}
                  className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-purple-50 text-slate-900"
                  onClick={() => {
                    setTargetPath(path);
                    setIsDropdownOpen(false);
                  }}
                >
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-slate-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span className="block truncate font-normal">
                      {path}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-1 text-[10px] text-slate-500">Select existing or type new path. Leave empty for root.</p>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
            isDragging
              ? "border-purple-500 bg-purple-50"
              : "border-slate-300 hover:border-purple-400 hover:bg-slate-50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
        >
          {status === "uploading" ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              <p className="text-sm font-medium text-purple-700">Processing...</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-3 text-purple-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-slate-700 font-medium mb-1">Drag & drop files or folders</p>
              <p className="text-xs text-slate-500 mb-4">Markdown (.md) or Text (.txt)</p>
              
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm"
                >
                  Select Files
                </button>
                <button
                  onClick={() => folderInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-sm font-medium transition-colors shadow-sm"
                >
                  Select Folder
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".md,.txt"
                multiple
                onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
              />
              <input
                type="file"
                ref={folderInputRef}
                className="hidden"
                // @ts-ignore - webkitdirectory is non-standard but supported
                webkitdirectory="" 
                directory=""
                multiple
                onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
              />
            </>
          )}
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded-md text-sm flex items-start gap-2 ${
            status === "error" ? "bg-red-50 text-red-700 border border-red-100" : 
            status === "success" ? "bg-green-50 text-green-700 border border-green-100" : 
            "bg-slate-50 text-slate-600"
          }`}>
            {status === "success" && (
              <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {status === "error" && (
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
};
