'use client';

import ProtectedRoute from '@/components/ProtectedRoute';

export default function ExamLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRole="student">
      {children}
    </ProtectedRoute>
  );
}
