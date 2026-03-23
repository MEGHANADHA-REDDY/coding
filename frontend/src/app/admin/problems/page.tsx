'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, FileCode, Upload, Filter } from 'lucide-react';

interface Problem {
  _id: string;
  title: string;
  type: string;
  difficulty: string;
  company: string;
  level: string;
  createdBy: { name: string };
  createdAt: string;
}

interface Filters {
  companies: string[];
  levels: string[];
  types: string[];
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filters, setFilters] = useState<Filters>({ companies: [], levels: [], types: [] });
  const [filterType, setFilterType] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchProblems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, filterCompany, filterLevel]);

  const fetchFilters = async () => {
    try {
      const res = await api.get('/admin/problems/filters');
      setFilters(res.data);
    } catch {
      // Silently fail
    }
  };

  const fetchProblems = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      if (filterCompany) params.set('company', filterCompany);
      if (filterLevel) params.set('level', filterLevel);
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await api.get(`/admin/problems${query}`);
      setProblems(res.data.problems);
    } catch {
      toast.error('Failed to fetch problems');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/admin/problems/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(res.data.message);
      if (res.data.errors?.length > 0) {
        res.data.errors.slice(0, 5).forEach((err: any) => toast.error(`Row ${err.row}: ${err.error}`));
      }
      fetchProblems();
      fetchFilters();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const difficultyColor = (d: string) => {
    switch (d) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const typeColor = (t: string) => {
    return t === 'mcq' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Problems</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium cursor-pointer">
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload CSV/Excel'}
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" disabled={uploading} />
          </label>
          <Link
            href="/admin/problems/create"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Problem
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Filter className="w-4 h-4 text-gray-400" />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
          <option value="">All Types</option>
          <option value="coding">Coding</option>
          <option value="mcq">MCQ</option>
        </select>
        <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
          <option value="">All Companies</option>
          {filters.companies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
          <option value="">All Levels</option>
          {filters.levels.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <span className="text-sm text-gray-500">{problems.length} problems</span>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 h-20 border border-gray-100" />
          ))}
        </div>
      ) : problems.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-100 text-center">
          <FileCode className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No problems found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Difficulty</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Level</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Created By</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {problems.map((problem) => (
                <tr key={problem._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{problem.title}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium uppercase ${typeColor(problem.type)}`}>
                      {problem.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${difficultyColor(problem.difficulty)}`}>
                      {problem.difficulty}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{problem.company || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{problem.level || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{problem.createdBy?.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(problem.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 space-y-2">
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-sm text-blue-700">
            <strong>Coding CSV columns:</strong>{' '}
            <code className="bg-blue-100 px-1 rounded">title, description, difficulty, company, level, sampleInput, sampleOutput, hiddenInput, hiddenOutput, boilerplateCode</code>
            <br />
            For multiple test cases use: <code className="bg-blue-100 px-1 rounded">hiddenInput1, hiddenOutput1, hiddenInput2, hiddenOutput2, ...</code>
          </p>
        </div>
        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
          <p className="text-sm text-purple-700">
            <strong>MCQ CSV columns:</strong>{' '}
            <code className="bg-purple-100 px-1 rounded">question, optionA, optionB, optionC, optionD, correctAnswer, difficulty, company, level</code>
          </p>
        </div>
      </div>
    </div>
  );
}
