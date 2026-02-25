'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, ClipboardList } from 'lucide-react';

interface Exam {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  problems: { _id: string; title: string }[];
  allowedStudents: { _id: string; name: string }[];
  isActive: boolean;
  maxViolations: number;
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const res = await api.get('/admin/exams');
      setExams(res.data.exams);
    } catch {
      toast.error('Failed to fetch exams');
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (exam: Exam) => {
    const now = new Date();
    const start = new Date(exam.startTime);
    const end = new Date(exam.endTime);
    if (!exam.isActive) return { label: 'Inactive', color: 'bg-gray-100 text-gray-600' };
    if (now < start) return { label: 'Upcoming', color: 'bg-blue-100 text-blue-700' };
    if (now > end) return { label: 'Ended', color: 'bg-red-100 text-red-700' };
    return { label: 'Active', color: 'bg-green-100 text-green-700' };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exams</h1>
        <Link
          href="/admin/exams/create"
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Exam
        </Link>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 h-24 border border-gray-100" />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-100 text-center">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No exams created yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => {
            const status = getStatus(exam);
            return (
              <div key={exam._id} className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{exam.title}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>{exam.problems.length} problems</span>
                      <span>{exam.allowedStudents.length} students</span>
                      <span>Max violations: {exam.maxViolations}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                      <span>Start: {new Date(exam.startTime).toLocaleString()}</span>
                      <span>End: {new Date(exam.endTime).toLocaleString()}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
