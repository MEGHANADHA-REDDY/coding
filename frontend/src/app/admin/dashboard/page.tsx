'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Users, FileCode, ClipboardList, Send } from 'lucide-react';

interface Stats {
  students: number;
  problems: number;
  exams: number;
  submissions: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ students: 0, problems: 0, exams: 0, submissions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [studentsRes, problemsRes, examsRes, submissionsRes] = await Promise.all([
          api.get('/admin/students'),
          api.get('/admin/problems'),
          api.get('/admin/exams'),
          api.get('/admin/submissions'),
        ]);
        setStats({
          students: studentsRes.data.students.length,
          problems: problemsRes.data.problems.length,
          exams: examsRes.data.exams.length,
          submissions: submissionsRes.data.submissions.length,
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    { label: 'Total Students', value: stats.students, icon: Users, color: 'bg-blue-500' },
    { label: 'Problems', value: stats.problems, icon: FileCode, color: 'bg-emerald-500' },
    { label: 'Exams', value: stats.exams, icon: ClipboardList, color: 'bg-purple-500' },
    { label: 'Submissions', value: stats.submissions, icon: Send, color: 'bg-orange-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 animate-pulse">
              <div className="h-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{card.label}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
                  </div>
                  <div className={`${card.color} p-3 rounded-xl`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
