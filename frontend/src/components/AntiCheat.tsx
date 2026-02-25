'use client';

import { useEffect } from 'react';
import useAntiCheat from '@/hooks/useAntiCheat';
import WarningModal from './WarningModal';

interface AntiCheatProps {
  examId: string;
  maxViolations: number;
  initialViolationCount: number;
  onAutoSubmit: () => void;
  children: React.ReactNode;
}

export default function AntiCheat({
  examId,
  maxViolations,
  initialViolationCount,
  onAutoSubmit,
  children,
}: AntiCheatProps) {
  const { showWarning, warningType, dismissWarning, remaining } = useAntiCheat({
    examId,
    maxViolations,
    initialViolationCount,
    onAutoSubmit,
  });

  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // Fullscreen may be blocked by browser
      }
    };

    enterFullscreen();

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  // Disable paste outside Monaco editor
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.monaco-editor')) {
        e.preventDefault();
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  return (
    <>
      {children}
      <WarningModal
        isOpen={showWarning}
        onClose={dismissWarning}
        violationType={warningType}
        remaining={remaining}
      />
    </>
  );
}
