'use client';

import { useEffect, useState, useCallback } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

function Toast({ toast, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = toast.duration || 3000;
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
  };

  const colors = {
    success: 'bg-accent-green/10 border-accent-green/30 text-accent-green',
    error: 'bg-accent-red/10 border-accent-red/30 text-accent-red',
    info: 'bg-primary/10 border-primary/30 text-primary',
    warning: 'bg-accent-yellow/10 border-accent-yellow/30 text-accent-yellow',
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur transition-all duration-300 ${
        colors[toast.type]
      } ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}
    >
      <span className="text-lg">{icons[toast.type]}</span>
      <span className="text-sm font-medium">{toast.message}</span>
      <button
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className="ml-auto text-current opacity-50 hover:opacity-100 transition-opacity"
      >
        ✕
      </button>
    </div>
  );
}

// Toast Container Component
interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// Toast Manager Class
class ToastManagerClass {
  private listeners: Set<(toasts: ToastMessage[]) => void> = new Set();
  private toasts: ToastMessage[] = [];

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  subscribe(listener: (toasts: ToastMessage[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  show(message: string, type: ToastMessage['type'] = 'info', duration?: number) {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toast: ToastMessage = { id, message, type, duration };
    this.toasts.push(toast);
    this.notify();
    return id;
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  success(message: string, duration?: number) {
    return this.show(message, 'success', duration);
  }

  error(message: string, duration?: number) {
    return this.show(message, 'error', duration || 5000);
  }

  info(message: string, duration?: number) {
    return this.show(message, 'info', duration);
  }

  warning(message: string, duration?: number) {
    return this.show(message, 'warning', duration || 4000);
  }

  getToasts(): ToastMessage[] {
    return [...this.toasts];
  }
}

// Singleton instance
export const toastManager = new ToastManagerClass();

// React Hook
export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = toastManager.subscribe(setToasts);
    setToasts(toastManager.getToasts());
    return unsubscribe;
  }, []);

  const dismiss = useCallback((id: string) => {
    toastManager.dismiss(id);
  }, []);

  return {
    toasts,
    dismiss,
    success: toastManager.success.bind(toastManager),
    error: toastManager.error.bind(toastManager),
    info: toastManager.info.bind(toastManager),
    warning: toastManager.warning.bind(toastManager),
  };
}

export default ToastContainer;
