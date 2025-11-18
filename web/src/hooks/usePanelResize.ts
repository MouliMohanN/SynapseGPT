import { useState, useCallback, useEffect } from "react";
import { PANEL_WIDTH_CONSTRAINTS } from "@/config/constants";

export const usePanelResize = (initialLeft: number, initialRight: number) => {
  const [leftWidth, setLeftWidth] = useState(initialLeft);
  const [rightWidth, setRightWidth] = useState(initialRight);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  const handleMouseMoveLeft = useCallback((e: MouseEvent) => {
    const newWidth = (e.clientX / window.innerWidth) * 100;
    const { min, max } = PANEL_WIDTH_CONSTRAINTS.left;
    
    if (newWidth >= min && newWidth <= max) {
      setLeftWidth(newWidth);
    }
  }, []);

  const handleMouseMoveRight = useCallback((e: MouseEvent) => {
    const newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
    const { min, max } = PANEL_WIDTH_CONSTRAINTS.right;
    
    if (newWidth >= min && newWidth <= max) {
      setRightWidth(newWidth);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDraggingLeft(false);
    setIsDraggingRight(false);
  }, []);

  useEffect(() => {
    if (isDraggingLeft) {
      window.addEventListener("mousemove", handleMouseMoveLeft);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMoveLeft);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDraggingLeft, handleMouseMoveLeft, handleMouseUp]);

  useEffect(() => {
    if (isDraggingRight) {
      window.addEventListener("mousemove", handleMouseMoveRight);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMoveRight);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDraggingRight, handleMouseMoveRight, handleMouseUp]);

  return {
    leftWidth,
    rightWidth,
    isDraggingLeft,
    isDraggingRight,
    setLeftWidth,
    setRightWidth,
    startDraggingLeft: () => setIsDraggingLeft(true),
    startDraggingRight: () => setIsDraggingRight(true),
  };
};
