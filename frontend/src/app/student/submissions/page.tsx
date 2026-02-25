'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Send } from 'lucide-react';

interface Exam {
  _id: string;
  title: string;
}

interface Submission {
  _id: string;
  problemId: { _id: string; title: string };
  language: string;
  status: string;
  executionTime: number | null;
  createdAt: string;
}

export default function StudentSubmissionsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await api.get('/exams');
        setExams(res.data.exams);
      } catch {
        toast.error('Failed to fetch exams');
      }
    };
    fetchExams();
  }, []);

  useEffect(() => {
    if (!selectedExam) return;
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/submissions/exam/${selectedExam}`);
        setSubmissions(res.data.submissions);
      } catch {
        toast.error('Failed to fetch submissions');
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [selectedExam]);

  const statusColor = (s: string) => {
    switch (s) {
      case 'AC': return 'bg-green-100 text-green-700';
      case 'WA': return 'bg-red-100 text-red-700';
      case 'TLE': return 'bg-yellow-100 text-yellow-700';
      case 'RE': return 'bg-orange-100 text-orange-700';
      case 'CE': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Submissions</h1>

      <div className="mb-6">
        <select
          value={selectedExam}
          onChange={(e) => setSelectedExam(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white"
        >
          <option value="">Select an exam</option>
          {exams.map((exam) => (
            <option key={exam._id} value={exam._id}>{exam.title}</option>
          ))}
        </select>
      </div>

      {!selectedExam ? (
        <div className="bg-white rounded-xl p-12 border border-gray-100 text-center">
          <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Select an exam to view your submissions.</p>
        </div>
      ) : loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 h-16 border border-gray-100" />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-100 text-center">
          <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No submissions for this exam.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
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
                  <td className="px-6 py-4 font-medium text-gray-900 text-sm">{sub.problemId?.title}</td>
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
