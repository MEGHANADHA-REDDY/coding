'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';

interface Violation {
  _id: string;
  examId: { _id: string; title: string };
  studentId: { _id: string; name: string; rollNumber: string };
  type: string;
  timestamp: string;
}

export default function ViolationsPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchViolations = async () => {
      try {
        const res = await api.get('/admin/violations');
        setViolations(res.data.violations);
      } catch {
        toast.error('Failed to fetch violations');
      } finally {
        setLoading(false);
      }
    };
    fetchViolations();
  }, []);

  const typeLabel = (type: string) => {
    switch (type) {
      case 'tab_switch': return 'Tab Switch';
      case 'window_blur': return 'Window Blur';
      case 'exit_fullscreen': return 'Exit Fullscreen';
      case 'right_click': return 'Right Click';
      default: return type;
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case 'tab_switch': return 'bg-red-100 text-red-700';
      case 'window_blur': return 'bg-orange-100 text-orange-700';
      case 'exit_fullscreen': return 'bg-yellow-100 text-yellow-700';
      case 'right_click': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Violation Logs</h1>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 h-16 border border-gray-100" />
          ))}
        </div>
      ) : violations.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-100 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No violations recorded.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Exam</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {violations.map((v) => (
                <tr key={v._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 text-sm">{v.studentId?.name}</div>
                    <div className="text-xs text-gray-400">{v.studentId?.rollNumber}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{v.examId?.title}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeColor(v.type)}`}>
                      {typeLabel(v.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(v.timestamp).toLocaleString()}
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
