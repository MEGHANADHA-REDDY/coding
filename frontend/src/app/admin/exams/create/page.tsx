'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Problem {
  _id: string;
  title: string;
  difficulty: string;
}

interface Student {
  _id: string;
  name: string;
  email: string;
  rollNumber: string;
}

export default function CreateExamPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxViolations, setMaxViolations] = useState(3);
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [probRes, studRes] = await Promise.all([
          api.get('/admin/problems'),
          api.get('/admin/students'),
        ]);
        setProblems(probRes.data.problems);
        setStudents(studRes.data.students);
      } catch {
        toast.error('Failed to load data');
      }
    };
    fetchData();
  }, []);

  const toggleItem = (id: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProblems.length === 0) return toast.error('Select at least one problem');
    if (selectedStudents.length === 0) return toast.error('Select at least one student');

    setSubmitting(true);
    try {
      await api.post('/admin/exams', {
        title,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        problems: selectedProblems,
        allowedStudents: selectedStudents,
        maxViolations,
      });
      toast.success('Exam created successfully!');
      router.push('/admin/exams');
    } catch (error: any) {
      const msg = error.response?.data?.errors?.[0]?.msg || error.response?.data?.error || 'Failed to create exam';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <Link href="/admin/exams" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Exams
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Exam</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Violations</label>
          <input
            type="number"
            min={1}
            value={maxViolations}
            onChange={(e) => setMaxViolations(parseInt(e.target.value))}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Problems ({selectedProblems.length} selected)
          </label>
          <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto p-2 space-y-1">
            {problems.map((p) => (
              <label key={p._id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedProblems.includes(p._id)}
                  onChange={() => toggleItem(p._id, selectedProblems, setSelectedProblems)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">{p.title}</span>
                <span className="text-xs text-gray-400 capitalize">({p.difficulty})</span>
              </label>
            ))}
            {problems.length === 0 && (
              <p className="text-sm text-gray-400 p-2">No problems available. Create some first.</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Allowed Students ({selectedStudents.length} selected)
          </label>
          <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto p-2 space-y-1">
            {students.map((s) => (
              <label key={s._id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(s._id)}
                  onChange={() => toggleItem(s._id, selectedStudents, setSelectedStudents)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">{s.name}</span>
                <span className="text-xs text-gray-400">({s.rollNumber})</span>
              </label>
            ))}
            {students.length === 0 && (
              <p className="text-sm text-gray-400 p-2">No students available. Add some first.</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create Exam'}
        </button>
      </form>
    </div>
  );
}
