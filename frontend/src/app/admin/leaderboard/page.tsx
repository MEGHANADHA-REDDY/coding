'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Trophy, Download } from 'lucide-react';

interface Exam {
  _id: string;
  title: string;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  rollNumber: string;
  email: string;
  codingScore: number;
  quizScore: number;
  totalScore: number;
  solvedCount: number;
  correctAnswers: number;
  totalTime: number;
}

export default function AdminLeaderboardPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [examTitle, setExamTitle] = useState('');
  const [maxPossibleScore, setMaxPossibleScore] = useState(0);
  const [codingMaxScore, setCodingMaxScore] = useState(0);
  const [quizMaxScore, setQuizMaxScore] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await api.get('/admin/exams');
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
        setExamTitle(res.data.examTitle);
        setMaxPossibleScore(res.data.maxPossibleScore || 0);
        setCodingMaxScore(res.data.codingMaxScore || 0);
        setQuizMaxScore(res.data.quizMaxScore || 0);
      } catch {
        toast.error('Failed to fetch leaderboard');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [selectedExam]);

  const handleExport = async () => {
    try {
      const res = await api.get(`/leaderboard/${selectedExam}/export`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `leaderboard-${examTitle}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported!');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
        {selectedExam && leaderboard.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        )}
      </div>

      <div className="mb-6 flex items-center gap-4 flex-wrap">
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
        {maxPossibleScore > 0 && selectedExam && (
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>Max: <span className="font-semibold text-indigo-600">{maxPossibleScore}</span> pts</span>
            {codingMaxScore > 0 && <span className="text-xs">(Coding: {codingMaxScore})</span>}
            {quizMaxScore > 0 && <span className="text-xs">(Quiz: {quizMaxScore})</span>}
          </div>
        )}
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
          <p className="text-gray-500">No submissions for this exam yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Rank</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Roll No.</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Total Score</th>
                {codingMaxScore > 0 && (
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Coding</th>
                )}
                {quizMaxScore > 0 && (
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Quiz</th>
                )}
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leaderboard.map((entry) => (
                <tr key={entry.rank} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                      entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                      entry.rank === 2 ? 'bg-gray-100 text-gray-700' :
                      entry.rank === 3 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {entry.rank}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{entry.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{entry.rollNumber}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-indigo-600">{entry.totalScore}</span>
                    <span className="text-xs text-gray-400">/{maxPossibleScore}</span>
                  </td>
                  {codingMaxScore > 0 && (
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {entry.codingScore}<span className="text-xs text-gray-400">/{codingMaxScore}</span>
                      <span className="text-xs text-gray-400 ml-1">({entry.solvedCount} solved)</span>
                    </td>
                  )}
                  {quizMaxScore > 0 && (
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {entry.quizScore}<span className="text-xs text-gray-400">/{quizMaxScore}</span>
                    </td>
                  )}
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
