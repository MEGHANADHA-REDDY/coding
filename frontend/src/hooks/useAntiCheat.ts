'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import api from '@/lib/api';

interface UseAntiCheatOptions {
  examId: string;
  maxViolations: number;
  initialViolationCount: number;
  onAutoSubmit: () => void;
}

export default function useAntiCheat({
  examId,
  maxViolations,
  initialViolationCount,
  onAutoSubmit,
}: UseAntiCheatOptions) {
  const [violationCount, setViolationCount] = useState(initialViolationCount);
  const [showWarning, setShowWarning] = useState(false);
  const [warningType, setWarningType] = useState('');
  const reportingRef = useRef(false);

  const reportViolation = useCallback(
    async (type: string) => {
      if (reportingRef.current) return;
      reportingRef.current = true;

      try {
        const res = await api.post(`/exams/${examId}/violations`, { type });
        const newCount = res.data.violationCount;
        setViolationCount(newCount);
        setWarningType(type);
        setShowWarning(true);

        if (res.data.autoSubmitted) {
          onAutoSubmit();
        }
      } catch (error) {
        console.error('Failed to report violation:', error);
      } finally {
        reportingRef.current = false;
      }
    },
    [examId, onAutoSubmit]
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportViolation('tab_switch');
      }
    };

    const handleWindowBlur = () => {
      reportViolation('window_blur');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        reportViolation('exit_fullscreen');
        // Re-request fullscreen
        setTimeout(() => {
          document.documentElement.requestFullscreen?.().catch(() => {});
        }, 500);
      }
    };

    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      reportViolation('right_click');
    };

    const handleCopyPaste = (e: Event) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block common shortcuts that could be used to cheat
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'u' || e.key === 'p')) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J'))
      ) {
        // Allow Ctrl+C/V inside the editor for coding
        const target = e.target as HTMLElement;
        if (target.closest('.monaco-editor')) return;
        e.preventDefault();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [reportViolation]);

  const dismissWarning = () => setShowWarning(false);

  return {
    violationCount,
    maxViolations,
    showWarning,
    warningType,
    dismissWarning,
    remaining: maxViolations - violationCount,
  };
}
