"use client";

import React from "react";

export type ToastType = "success" | "error";

interface ToastProps {
  message: string;
  type?: ToastType;
}

export const Toast: React.FC<ToastProps> = ({ message, type = "success" }) => {
  const baseColorClasses =
    type === "success"
      ? "bg-purple-50 text-purple-700 border border-purple-200"
      : "bg-red-50 text-red-700 border border-red-200";

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs shadow-sm max-w-md w-auto text-center break-all ${baseColorClasses}`}
    >
      <span className="font-mono text-[11px]">{message}</span>
    </div>
  );
};
