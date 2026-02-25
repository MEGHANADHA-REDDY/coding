'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';

interface Submission {
  _id: string;
  examId: { _id: string; title: string };
  problemId: { _id: string; title: string };
  studentId: { _id: string; name: string; rollNumber: string };
  language: string;
  status: string;
  executionTime: number | null;
  createdAt: string;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const res = await api.get('/admin/submissions');
        setSubmissions(res.data.submissions);
      } catch {
        toast.error('Failed to fetch submissions');
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  const statusColor = (s: string) => {
    switch (s) {
      case 'AC': return 'bg-green-100 text-green-700';
      case 'WA': return 'bg-red-100 text-red-700';
      case 'TLE': return 'bg-yellow-100 text-yellow-700';
      case 'RE': return 'bg-orange-100 text-orange-700';
      case 'CE': return 'bg-purple-100 text-purple-700';
      case 'PENDING': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Submissions</h1>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 h-16 border border-gray-100" />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-100 text-center">
          <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No submissions yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Exam</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Problem</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Language</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {submissions.map((sub) => (
                <tr key={sub._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 text-sm">{sub.studentId?.name}</div>
                    <div className="text-xs text-gray-400">{sub.studentId?.rollNumber}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sub.examId?.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{sub.problemId?.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 capitalize">{sub.language}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(sub.status)}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {sub.executionTime ? `${sub.executionTime}s` : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(sub.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
