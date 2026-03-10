'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface TestCase {
  input: string;
  output: string;
  score: number;
}

export default function CreateProblemPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [constraints, setConstraints] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [sampleTestCases, setSampleTestCases] = useState<TestCase[]>([{ input: '', output: '', score: 0 }]);
  const [hiddenTestCases, setHiddenTestCases] = useState<TestCase[]>([{ input: '', output: '', score: 1 }]);
  const [submitting, setSubmitting] = useState(false);

  const addTestCase = (type: 'sample' | 'hidden') => {
    const setter = type === 'sample' ? setSampleTestCases : setHiddenTestCases;
    const defaultScore = type === 'hidden' ? 1 : 0;
    setter((prev) => [...prev, { input: '', output: '', score: defaultScore }]);
  };

  const removeTestCase = (type: 'sample' | 'hidden', index: number) => {
    const setter = type === 'sample' ? setSampleTestCases : setHiddenTestCases;
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTestCase = (type: 'sample' | 'hidden', index: number, field: 'input' | 'output' | 'score', value: string | number) => {
    const setter = type === 'sample' ? setSampleTestCases : setHiddenTestCases;
    setter((prev) => prev.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.post('/admin/problems', {
        title,
        description,
        constraints,
        difficulty,
        sampleTestCases,
        hiddenTestCases,
      });
      toast.success('Problem created successfully!');
      router.push('/admin/problems');
    } catch (error: any) {
      const msg = error.response?.data?.errors?.[0]?.msg || error.response?.data?.error || 'Failed to create problem';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderTestCases = (type: 'sample' | 'hidden', cases: TestCase[]) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 capitalize">
          {type} Test Cases
          {type === 'hidden' && (
            <span className="ml-2 text-xs text-gray-400 font-normal">
              (Total: {cases.reduce((s, tc) => s + (tc.score || 0), 0)} pts)
            </span>
          )}
        </label>
        <button type="button" onClick={() => addTestCase(type)} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
      {cases.map((tc, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className="flex-1">
            <textarea
              placeholder="Input (leave empty if none)"
              value={tc.input}
              onChange={(e) => updateTestCase(type, i, 'input', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              rows={2}
            />
          </div>
          <div className="flex-1">
            <textarea
              placeholder="Expected Output"
              value={tc.output}
              onChange={(e) => updateTestCase(type, i, 'output', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              rows={2}
              required
            />
          </div>
          {type === 'hidden' && (
            <div className="w-20">
              <input
                type="number"
                min={0}
                placeholder="Score"
                value={tc.score}
                onChange={(e) => updateTestCase(type, i, 'score', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <span className="text-xs text-gray-400 mt-0.5 block text-center">pts</span>
            </div>
          )}
          {cases.length > 1 && (
            <button type="button" onClick={() => removeTestCase(type, i)} className="mt-2 text-red-400 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-3xl">
      <Link href="/admin/problems" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Problems
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Problem</h1>

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={5}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Constraints</label>
          <textarea
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            rows={2}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {renderTestCases('sample', sampleTestCases)}
        {renderTestCases('hidden', hiddenTestCases)}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Creating...' : 'Create Problem'}
        </button>
      </form>
    </div>
  );
}
