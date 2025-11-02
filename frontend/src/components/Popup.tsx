import React, { useEffect } from "react";
import { createPortal } from "react-dom";

interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  display?: "center" | "under" | string;
  children?: React.ReactNode;
  className?: string;
}

const Popup: React.FC<PopupProps> = ({ isOpen, onClose, display = "center", children, className }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const baseClass = "p-4 border rounded backdrop-blur-lg bg-background/80 dark:bg-neutral-900/70 shadow-lg";
  const combinedClass = className ? `${baseClass} ${className}` : baseClass;

  const content = (
    <div style={{ position: "fixed", inset: 0, zIndex: 2147483647 }}>
      <div aria-hidden onClick={onClose} style={{ position: "fixed", inset: 0 }} />
      <div
        role="dialog"
        aria-modal="true"
        className={combinedClass}
        style={display === "center" ? { position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(90%,640px)" } : { position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", width: "min(90%,640px)" }}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default Popup;
