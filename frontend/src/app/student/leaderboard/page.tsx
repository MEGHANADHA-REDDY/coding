'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Exam {
  _id: string;
  title: string;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  rollNumber: string;
  studentId: string;
  solvedCount: number;
  totalTime: number;
}

export default function StudentLeaderboardPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
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
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/leaderboard/${selectedExam}`);
        setLeaderboard(res.data.leaderboard);
      } catch {
        toast.error('Failed to fetch leaderboard');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [selectedExam]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Leaderboard</h1>

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
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Select an exam to view the leaderboard.</p>
        </div>
      ) : loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 h-16 border border-gray-100" />
          ))}
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-100 text-center">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No results yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Roll Number</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Solved</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Total Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leaderboard.map((entry) => (
                <tr
                  key={entry.rank}
                  className={`hover:bg-gray-50 transition-colors ${
                    entry.studentId === user?.id ? 'bg-indigo-50' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                      entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                      entry.rank === 2 ? 'bg-gray-200 text-gray-700' :
                      entry.rank === 3 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {entry.rank}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {entry.name}
                    {entry.studentId === user?.id && (
                      <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">You</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{entry.rollNumber}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-indigo-600">{entry.solvedCount}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{entry.totalTime}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
