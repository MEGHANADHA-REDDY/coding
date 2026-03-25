'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface TestCase {
  input: string;
  output: string;
}

const emptyMcqOptions = { a: '', b: '', c: '', d: '' };

function normalizeTestCases(cases: unknown): TestCase[] {
  if (!Array.isArray(cases) || cases.length === 0) {
    return [{ input: '', output: '' }];
  }
  return cases.map((tc: any) => ({
    input: tc?.input != null ? String(tc.input) : '',
    output: tc?.output != null ? String(tc.output) : '',
  }));
}

export default function EditProblemPage() {
  const params = useParams();
  const router = useRouter();
  const problemId = params.problemId as string;

  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'coding' | 'mcq'>('coding');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [constraints, setConstraints] = useState('');
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [company, setCompany] = useState('');
  const [level, setLevel] = useState('');
  const [boilerplateCode, setBoilerplateCode] = useState('');
  const [sampleTestCases, setSampleTestCases] = useState<TestCase[]>([{ input: '', output: '' }]);
  const [hiddenTestCases, setHiddenTestCases] = useState<TestCase[]>([{ input: '', output: '' }]);

  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('a');

  const [submitting, setSubmitting] = useState(false);

  const fetchProblem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/problems/${problemId}`);
      const p = res.data.problem;
      setType(p.type === 'mcq' ? 'mcq' : 'coding');
      setTitle(p.title || '');
      setDescription(p.description || '');
      setConstraints(p.constraints || '');
      setInputFormat(p.inputFormat || '');
      setOutputFormat(p.outputFormat || '');
      setDifficulty(p.difficulty || 'easy');
      setCompany(p.company || '');
      setLevel(p.level || '');
      setBoilerplateCode(p.boilerplateCode || '');
      setSampleTestCases(normalizeTestCases(p.sampleTestCases));
      setHiddenTestCases(normalizeTestCases(p.hiddenTestCases));
      setOptionA(p.options?.a || '');
      setOptionB(p.options?.b || '');
      setOptionC(p.options?.c || '');
      setOptionD(p.options?.d || '');
      setCorrectAnswer(p.correctAnswer && ['a', 'b', 'c', 'd'].includes(p.correctAnswer) ? p.correctAnswer : 'a');
    } catch {
      toast.error('Failed to load problem');
      router.push('/admin/problems');
    } finally {
      setLoading(false);
    }
  }, [problemId, router]);

  useEffect(() => {
    fetchProblem();
  }, [fetchProblem]);

  const addTestCase = (setter: React.Dispatch<React.SetStateAction<TestCase[]>>) => {
    setter((prev) => [...prev, { input: '', output: '' }]);
  };

  const removeTestCase = (setter: React.Dispatch<React.SetStateAction<TestCase[]>>, index: number) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTestCase = (
    setter: React.Dispatch<React.SetStateAction<TestCase[]>>,
    index: number,
    field: 'input' | 'output',
    value: string
  ) => {
    setter((prev) => prev.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc)));
  };

  const filterTestCases = (cases: TestCase[]) => cases.filter((tc) => tc.output.trim() !== '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        type,
        title,
        description,
        difficulty,
        company,
        level,
      };

      if (type === 'coding') {
        const samples = filterTestCases(sampleTestCases);
        const hidden = filterTestCases(hiddenTestCases);
        if (hidden.length === 0) {
          toast.error('At least one hidden test case with expected output is required.');
          setSubmitting(false);
          return;
        }
        payload.constraints = constraints;
        payload.inputFormat = inputFormat;
        payload.outputFormat = outputFormat;
        payload.boilerplateCode = boilerplateCode;
        payload.sampleTestCases = samples;
        payload.hiddenTestCases = hidden;
        payload.options = emptyMcqOptions;
        payload.correctAnswer = '';
      } else {
        payload.options = {
          a: optionA,
          b: optionB,
          c: optionC,
          d: optionD,
        };
        payload.correctAnswer = correctAnswer;
        payload.constraints = '';
        payload.inputFormat = '';
        payload.outputFormat = '';
        payload.boilerplateCode = '';
        payload.sampleTestCases = [];
        payload.hiddenTestCases = [];
      }

      await api.put(`/admin/problems/${problemId}`, payload);
      toast.success('Problem updated successfully!');
      router.push('/admin/problems');
    } catch (error: any) {
      const msg = error.response?.data?.errors?.[0]?.msg || error.response?.data?.error || 'Failed to update problem';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderTestCases = (label: string, cases: TestCase[], setter: React.Dispatch<React.SetStateAction<TestCase[]>>) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 capitalize">{label} Test Cases</label>
        <button
          type="button"
          onClick={() => addTestCase(setter)}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
      {cases.map((tc, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className="flex-1">
            <textarea
              placeholder="Input (leave empty if none)"
              value={tc.input}
              onChange={(e) => updateTestCase(setter, i, 'input', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              rows={2}
            />
          </div>
          <div className="flex-1">
            <textarea
              placeholder="Expected Output"
              value={tc.output}
              onChange={(e) => updateTestCase(setter, i, 'output', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              rows={2}
            />
          </div>
          {cases.length > 1 && (
            <button type="button" onClick={() => removeTestCase(setter, i)} className="mt-2 text-red-400 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-3xl animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded w-1/3" />
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link href="/admin/problems" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Problems
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Problem</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Problem Type</label>
          <div className="flex gap-2">
            <span
              className={`px-4 py-2 rounded-xl text-sm font-medium ${
                type === 'coding' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              Coding
            </span>
            <span
              className={`px-4 py-2 rounded-xl text-sm font-medium ${
                type === 'mcq' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              MCQ
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Type cannot be changed when editing. Create a new problem to use a different type.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title / Question</label>
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
            rows={type === 'mcq' ? 2 : 5}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Google"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
            <input
              type="text"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="e.g. L1"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {type === 'coding' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Constraints</label>
              <textarea
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Input Format (shown to students)</label>
              <textarea
                value={inputFormat}
                onChange={(e) => setInputFormat(e.target.value)}
                rows={3}
                placeholder={"Line 1: Space-separated array elements\nLine 2: Target value"}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Output Format (shown to students)</label>
              <textarea
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                rows={2}
                placeholder={"Print Found if present, else Not Found"}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Boilerplate Code (LeetCode-style function template)</label>
              <textarea
                value={boilerplateCode}
                onChange={(e) => setBoilerplateCode(e.target.value)}
                rows={5}
                placeholder="def twoSum(nums, target):\n    # Write your code here"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
              />
            </div>

            {renderTestCases('Sample', sampleTestCases, setSampleTestCases)}
            {renderTestCases('Hidden', hiddenTestCases, setHiddenTestCases)}
          </>
        )}

        {type === 'mcq' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Options</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Option A</label>
                <input
                  type="text"
                  value={optionA}
                  onChange={(e) => setOptionA(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Option B</label>
                <input
                  type="text"
                  value={optionB}
                  onChange={(e) => setOptionB(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Option C</label>
                <input
                  type="text"
                  value={optionC}
                  onChange={(e) => setOptionC(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Option D</label>
                <input
                  type="text"
                  value={optionD}
                  onChange={(e) => setOptionD(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
              <select
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="a">A</option>
                <option value="b">B</option>
                <option value="c">C</option>
                <option value="d">D</option>
              </select>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
