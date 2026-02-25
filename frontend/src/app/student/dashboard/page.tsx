'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Clock, PlayCircle, CheckCircle, ClipboardList } from 'lucide-react';

interface Exam {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  maxViolations: number;
  hasStarted: boolean;
  isSubmitted: boolean;
}

export default function StudentDashboard() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await api.get('/exams');
        setExams(res.data.exams);
      } catch {
        toast.error('Failed to fetch exams');
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, []);

  const handleStartExam = async (examId: string) => {
    try {
      await api.post(`/exams/${examId}/start`);
      router.push(`/exam/${examId}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to start exam');
    }
  };

  const getTimeRemaining = (endTime: string) => {
    const diff = new Date(endTime).getTime() - Date.now();
    if (diff <= 0) return 'Ended';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m remaining`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Available Exams</h1>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 h-32 border border-gray-100" />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-100 text-center">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No exams available right now.</p>
          <p className="text-sm text-gray-400 mt-1">Check back later or contact your administrator.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => (
            <div key={exam._id} className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg">{exam.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {getTimeRemaining(exam.endTime)}
                    </span>
                    <span>Max warnings: {exam.maxViolations}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(exam.startTime).toLocaleString()} - {new Date(exam.endTime).toLocaleString()}
                  </div>
                </div>
                <div>
                  {exam.isSubmitted ? (
                    <span className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Submitted
                    </span>
                  ) : (
                    <button
                      onClick={() => handleStartExam(exam._id)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium"
                    >
                      <PlayCircle className="w-4 h-4" />
                      {exam.hasStarted ? 'Continue Exam' : 'Start Exam'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
