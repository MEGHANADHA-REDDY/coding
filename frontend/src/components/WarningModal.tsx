'use client';

import { AlertTriangle, X } from 'lucide-react';

interface WarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  violationType: string;
  remaining: number;
}

const typeLabels: Record<string, string> = {
  tab_switch: 'Tab switch detected',
  window_blur: 'Window focus lost',
  exit_fullscreen: 'Exited fullscreen mode',
  right_click: 'Right-click detected',
};

export default function WarningModal({ isOpen, onClose, violationType, remaining }: WarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-red-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-white" />
            <h2 className="text-lg font-bold text-white">Warning!</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6">
          <p className="text-gray-900 font-medium text-lg mb-2">Violation Detected</p>
          <p className="text-gray-600 mb-4">
            {typeLabels[violationType] || 'Suspicious activity detected'}.
            This has been logged and reported.
          </p>

          <div className={`rounded-xl p-4 ${remaining <= 1 ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <p className={`font-semibold ${remaining <= 1 ? 'text-red-700' : 'text-yellow-700'}`}>
              {remaining > 0
                ? `${remaining} warning${remaining > 1 ? 's' : ''} remaining before auto-submit`
                : 'Your exam is being auto-submitted!'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-4 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-gray-800 transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}
