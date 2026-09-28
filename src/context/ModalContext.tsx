"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Info,
  HelpCircle,
  Trash2,
  X,
} from "lucide-react";

export type ModalType = "info" | "warning" | "error" | "success" | "confirm";

export interface ModalOptions {
  title?: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

interface QueuedModal extends ModalOptions {
  id: string;
  resolve: (value: boolean) => void;
}

export interface ModalContextType {
  showAlert: (
    message: string,
    options?: Omit<ModalOptions, "message">
  ) => Promise<void>;
  showConfirm: (
    message: string,
    options?: Omit<ModalOptions, "message">
  ) => Promise<boolean>;
  showCustomModal: (options: ModalOptions) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modalQueue, setModalQueue] = useState<QueuedModal[]>([]);
  const currentModal = modalQueue[0] || null;
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const showCustomModal = useCallback((options: ModalOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      const newModal: QueuedModal = {
        ...options,
        id: Math.random().toString(36).substring(2, 9),
        resolve,
      };
      setModalQueue((prev) => [...prev, newModal]);
    });
  }, []);

  const showAlert = useCallback(
    (
      message: string,
      options?: Omit<ModalOptions, "message">
    ): Promise<void> => {
      const defaultTitle =
        options?.type === "error"
          ? "Error"
          : options?.type === "warning"
          ? "Notice"
          : options?.type === "success"
          ? "Success"
          : "Information";

      return showCustomModal({
        title: options?.title || defaultTitle,
        message,
        type: options?.type || "info",
        confirmText: options?.confirmText || "OK",
        cancelText: undefined,
        isDestructive: options?.isDestructive || false,
      }).then(() => undefined);
    },
    [showCustomModal]
  );

  const showConfirm = useCallback(
    (
      message: string,
      options?: Omit<ModalOptions, "message">
    ): Promise<boolean> => {
      return showCustomModal({
        title: options?.title || "Confirmation Required",
        message,
        type: options?.type || "confirm",
        confirmText: options?.confirmText || "Confirm",
        cancelText: options?.cancelText || "Cancel",
        isDestructive: options?.isDestructive || false,
      });
    },
    [showCustomModal]
  );

  const handleClose = useCallback(
    (result: boolean) => {
      if (!currentModal) return;
      currentModal.resolve(result);
      setModalQueue((prev) => prev.slice(1));
    },
    [currentModal]
  );

  // Focus action button when a modal opens
  useEffect(() => {
    if (currentModal) {
      const timer = setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentModal]);

  // Handle escape key
  useEffect(() => {
    if (!currentModal) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentModal, handleClose]);

  // Determine styling based on type and destructive flag
  const getModalIconAndStyles = () => {
    if (!currentModal) return null;

    const { type = "info", isDestructive } = currentModal;

    if (isDestructive) {
      return {
        icon: Trash2,
        iconBox: "bg-rose-50 text-rose-600 border border-rose-200",
        confirmBtn:
          "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 focus:ring-rose-500",
      };
    }

    switch (type) {
      case "error":
        return {
          icon: AlertOctagon,
          iconBox: "bg-rose-50 text-rose-600 border border-rose-200",
          confirmBtn:
            "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 focus:ring-rose-500",
        };
      case "warning":
        return {
          icon: AlertTriangle,
          iconBox: "bg-amber-50 text-amber-600 border border-amber-200",
          confirmBtn:
            "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200 focus:ring-amber-500",
        };
      case "success":
        return {
          icon: CheckCircle2,
          iconBox: "bg-emerald-50 text-emerald-600 border border-emerald-200",
          confirmBtn:
            "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 focus:ring-emerald-500",
        };
      case "confirm":
        return {
          icon: HelpCircle,
          iconBox: "bg-indigo-50 text-indigo-600 border border-indigo-200",
          confirmBtn:
            "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 focus:ring-indigo-500",
        };
      case "info":
      default:
        return {
          icon: Info,
          iconBox: "bg-blue-50 text-blue-600 border border-blue-200",
          confirmBtn:
            "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 focus:ring-blue-500",
        };
    }
  };

  const styleConfig = getModalIconAndStyles();
  const IconComponent = styleConfig?.icon || Info;

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showCustomModal }}>
      {children}

      {/* Render active modal if one is present */}
      {currentModal && styleConfig && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="custom-modal-title"
          aria-describedby="custom-modal-description"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
          onClick={(e) => {
            // Dismiss if clicking outer backdrop
            if (e.target === e.currentTarget) {
              handleClose(false);
            }
          }}
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/80 p-5 sm:p-6 overflow-hidden transition-all duration-200 scale-100 animate-in zoom-in-95">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header / Content */}
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${styleConfig.iconBox}`}
              >
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <h3
                  id="custom-modal-title"
                  className="text-base font-semibold text-slate-900 tracking-tight"
                >
                  {currentModal.title}
                </h3>
                <div
                  id="custom-modal-description"
                  className="mt-1.5 text-sm text-slate-600 leading-relaxed whitespace-pre-line"
                >
                  {currentModal.message}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex items-center justify-end gap-2.5">
              {currentModal.cancelText && (
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  {currentModal.cancelText}
                </button>
              )}
              <button
                type="button"
                ref={confirmButtonRef}
                onClick={() => handleClose(true)}
                className={`px-4.5 py-2 text-sm font-semibold rounded-xl transition shadow-sm cursor-pointer focus:outline-none focus:ring-2 active:scale-[0.98] ${styleConfig.confirmBtn}`}
              >
                {currentModal.confirmText || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}
