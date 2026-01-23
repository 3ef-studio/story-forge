'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Info, TrendingUp, TrendingDown } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'faction-up' | 'faction-down';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  showFactionChange: (factionName: string, change: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after duration
    const duration = toast.duration ?? 4000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showFactionChange = useCallback((factionName: string, change: number) => {
    addToast({
      type: change > 0 ? 'faction-up' : 'faction-down',
      title: factionName,
      message: `${change > 0 ? '+' : ''}${change} reputation`,
      duration: 3000,
    });
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, showFactionChange }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const config: Record<ToastType, { icon: ReactNode; bg: string; border: string; text: string }> = {
    success: {
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
    },
    error: {
      icon: <XCircle className="h-5 w-5 text-red-500" />,
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
    },
    warning: {
      icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
    },
    info: {
      icon: <Info className="h-5 w-5 text-blue-500" />,
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
    },
    'faction-up': {
      icon: <TrendingUp className="h-5 w-5 text-green-500" />,
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
    },
    'faction-down': {
      icon: <TrendingDown className="h-5 w-5 text-red-500" />,
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
    },
  };

  const { icon, bg, border, text } = config[toast.type];

  return (
    <div
      className={`${bg} ${border} ${text} border rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in-right min-w-[280px]`}
      role="alert"
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{toast.title}</p>
        {toast.message && <p className="text-sm opacity-80 mt-0.5">{toast.message}</p>}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
