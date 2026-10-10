import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 max-w-md w-full px-4 pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const ToastCard: React.FC<ToastCardProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const getStyle = () => {
    switch (toast.type) {
      case 'error':
        return {
          bg: 'bg-rose-900/95 text-white border-rose-700/80',
          icon: <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />,
          ring: 'ring-rose-500/20',
        };
      case 'info':
        return {
          bg: 'bg-slate-900/95 text-white border-sky-500/60',
          icon: <Info className="w-4 h-4 text-sky-300 shrink-0" />,
          ring: 'ring-sky-500/20',
        };
      case 'success':
      default:
        return {
          bg: 'bg-slate-900/95 text-white border-emerald-500/60',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
          ring: 'ring-emerald-500/20',
        };
    }
  };

  const style = getStyle();

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-xl backdrop-blur-md ${style.bg} ring-2 ${style.ring} animate-in fade-in slide-in-from-top-4 duration-200 transition-all text-xs font-semibold max-w-full`}
    >
      {style.icon}
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-white p-0.5 rounded-lg transition-colors cursor-pointer"
        title="Fechar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
