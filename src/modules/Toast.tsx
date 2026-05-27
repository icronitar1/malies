import React from 'react';
import { X } from 'lucide-react';
import { ToastMessage } from '../types';

interface Props {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({ toasts, onDismiss }: Props) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-3rem)] md:w-full">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`p-4 rounded-xl shadow-xl border flex items-center justify-between transition-all duration-300 ${
            t.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-900'
              : t.type === 'info'
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <span className="text-xs font-bold">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="text-gray-400 hover:text-gray-600 transition ml-3 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
