'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeft, Filter, Plus, Trash2 } from 'lucide-react';

interface Problem {
  _id: string;
  title: string;
  difficulty: string;
  type: string;
  company: string;
  level: string;
}

interface Student {
  _id: string;
  name: string;
  email: string;
  rollNumber: string;
  batch: string;
}

interface Section {
  label: string;
  type: 'coding' | 'mcq';
  durationMinutes: number;
  randomCount: number;
  selectedProblems: string[];
}

export default function CreateExamPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxViolations, setMaxViolations] = useState(3);
  const [sections, setSections] = useState<Section[]>([
    { label: 'Part A - Coding', type: 'coding', durationMinutes: 30, randomCount: 0, selectedProblems: [] },
  ]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [companies, setCompanies] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [sFilterBatch, setSFilterBatch] = useState('');
  const [batches, setBatches] = useState<string[]>([]);

  // Per-section problem filters
  const [sectionFilters, setSectionFilters] = useState<Record<number, { company: string; level: string }>>({});

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [filtersRes, batchRes, probRes] = await Promise.all([
          api.get('/admin/problems/filters'),
          api.get('/admin/students/batches'),
          api.get('/admin/problems'),
        ]);
        setCompanies(filtersRes.data.companies);
        setLevels(filtersRes.data.levels);
        setBatches(batchRes.data.batches);
        setAllProblems(probRes.data.problems);
      } catch {
        toast.error('Failed to load data');
      }
    };
    fetchMeta();
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      const params = sFilterBatch ? `?batch=${encodeURIComponent(sFilterBatch)}` : '';
      try {
        const res = await api.get(`/admin/students${params}`);
        setStudents(res.data.students);
      } catch {
        toast.error('Failed to load students');
      }
    };
    fetchStudents();
  }, [sFilterBatch]);

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        label: `Section ${prev.length + 1}`,
        type: 'mcq',
        durationMinutes: 15,
        randomCount: 0,
        selectedProblems: [],
      },
    ]);
  };

  const removeSection = (index: number) => {
    if (sections.length <= 1) return toast.error('Need at least one section');
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSection = (index: number, field: keyof Section, value: any) => {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const toggleProblem = (sectionIndex: number, problemId: string) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIndex) return s;
        const selected = s.selectedProblems.includes(problemId)
          ? s.selectedProblems.filter((id) => id !== problemId)
          : [...s.selectedProblems, problemId];
        return { ...s, selectedProblems: selected };
      })
    );
  };

  const selectAllForSection = (sectionIndex: number) => {
    const filtered = getFilteredProblems(sectionIndex);
    setSections((prev) =>
      prev.map((s, i) => (i === sectionIndex ? { ...s, selectedProblems: filtered.map((p) => p._id) } : s))
    );
  };

  const clearAllForSection = (sectionIndex: number) => {
    setSections((prev) =>
      prev.map((s, i) => (i === sectionIndex ? { ...s, selectedProblems: [] } : s))
    );
  };

  const getFilteredProblems = (sectionIndex: number) => {
    const section = sections[sectionIndex];
    const filters = sectionFilters[sectionIndex] || { company: '', level: '' };
    return allProblems.filter((p) => {
      if (p.type !== section.type) return false;
      if (filters.company && !p.company.toLowerCase().includes(filters.company.toLowerCase())) return false;
      if (filters.level && !p.level.toLowerCase().includes(filters.level.toLowerCase())) return false;
      return true;
    });
  };

  const updateSectionFilter = (sectionIndex: number, field: string, value: string) => {
    setSectionFilters((prev) => {
      const existing = prev[sectionIndex] || { company: '', level: '' };
      return { ...prev, [sectionIndex]: { ...existing, [field]: value } };
    });
  };

  const totalDuration = sections.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].selectedProblems.length === 0) {
        return toast.error(`Section ${i + 1} has no problems selected`);
      }
    }
    if (selectedStudents.length === 0) return toast.error('Select at least one student');

    setSubmitting(true);
    try {
      await api.post('/admin/exams', {
        title,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        sections: sections.map((s) => ({
          label: s.label,
          type: s.type,
          durationMinutes: s.durationMinutes,
          randomCount: s.randomCount || 0,
          problems: s.selectedProblems,
        })),
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

  const difficultyColor = (d: string) => {
    switch (d) {
      case 'easy': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'hard': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="max-w-4xl">
      <Link href="/admin/exams" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Exams
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Exam</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Availability Start</label>
              <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Availability End</label>
              <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} required
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Violations</label>
            <input type="number" min={1} value={maxViolations} onChange={(e) => setMaxViolations(parseInt(e.target.value))}
              className="w-48 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>

          <div className="bg-indigo-50 rounded-lg px-4 py-3">
            <p className="text-sm text-indigo-700">
              <strong>Total exam duration per student:</strong> {totalDuration} minutes ({sections.length} section{sections.length > 1 ? 's' : ''})
            </p>
            <p className="text-xs text-indigo-500 mt-1">Students can start anytime during the availability window. Their personal timer begins when they click Start.</p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Sections</h2>
            <button type="button" onClick={addSection}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium">
              <Plus className="w-4 h-4" /> Add Section
            </button>
          </div>

          {sections.map((section, idx) => {
            const filtered = getFilteredProblems(idx);
            const sf = sectionFilters[idx] || { company: '', level: '' };

            return (
              <div key={idx} className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">Section {idx + 1}</h3>
                  {sections.length > 1 && (
                    <button type="button" onClick={() => removeSection(idx)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Label</label>
                    <input type="text" value={section.label} onChange={(e) => updateSection(idx, 'label', e.target.value)}
                      placeholder="Part A" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                    <select value={section.type} onChange={(e) => { updateSection(idx, 'type', e.target.value); updateSection(idx, 'selectedProblems', []); }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="coding">Coding</option>
                      <option value="mcq">MCQ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Duration (min)</label>
                    <input type="number" min={1} value={section.durationMinutes}
                      onChange={(e) => updateSection(idx, 'durationMinutes', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Random Pick</label>
                    <input type="number" min={0} value={section.randomCount}
                      onChange={(e) => updateSection(idx, 'randomCount', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <p className="text-xs text-gray-400 mt-0.5">0 = all</p>
                  </div>
                </div>

                {/* Problem picker for this section */}
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Filter className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500 font-medium uppercase">{section.type}</span>
                    <select value={sf.company} onChange={(e) => updateSectionFilter(idx, 'company', e.target.value)}
                      className="px-2 py-1 border border-gray-200 rounded-lg text-xs outline-none">
                      <option value="">All Companies</option>
                      {companies.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={sf.level} onChange={(e) => updateSectionFilter(idx, 'level', e.target.value)}
                      className="px-2 py-1 border border-gray-200 rounded-lg text-xs outline-none">
                      <option value="">All Levels</option>
                      {levels.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <button type="button" onClick={() => selectAllForSection(idx)} className="text-xs text-indigo-600 hover:underline">Select All</button>
                    <button type="button" onClick={() => clearAllForSection(idx)} className="text-xs text-gray-500 hover:underline">Clear</button>
                    <span className="text-xs text-gray-400 ml-auto">{section.selectedProblems.length} selected</span>
                  </div>
                  <div className="border border-gray-200 rounded-xl max-h-40 overflow-y-auto p-2 space-y-1">
                    {filtered.map((p) => (
                      <label key={p._id} className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={section.selectedProblems.includes(p._id)}
                          onChange={() => toggleProblem(idx, p._id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        <span className="text-sm text-gray-700 flex-1 truncate">{p.title}</span>
                        <span className={`text-xs capitalize ${difficultyColor(p.difficulty)}`}>{p.difficulty}</span>
                        {p.company && <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{p.company}</span>}
                      </label>
                    ))}
                    {filtered.length === 0 && (
                      <p className="text-sm text-gray-400 p-2">No {section.type} problems match filters.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Students */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Allowed Students ({selectedStudents.length} selected)
          </label>
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select value={sFilterBatch} onChange={(e) => setSFilterBatch(e.target.value)}
              className="px-2 py-1 border border-gray-200 rounded-lg text-xs outline-none">
              <option value="">All Batches</option>
              {batches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <button type="button" onClick={() => setSelectedStudents(students.map((s) => s._id))} className="text-xs text-indigo-600 hover:underline">Select All</button>
            <button type="button" onClick={() => setSelectedStudents([])} className="text-xs text-gray-500 hover:underline">Clear</button>
          </div>
          <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto p-2 space-y-1">
            {students.map((s) => (
              <label key={s._id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selectedStudents.includes(s._id)}
                  onChange={() => toggleStudent(s._id)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700">{s.name}</span>
                <span className="text-xs text-gray-400">({s.rollNumber})</span>
                {s.batch && <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{s.batch}</span>}
              </label>
            ))}
            {students.length === 0 && (
              <p className="text-sm text-gray-400 p-2">No students match filter.</p>
            )}
          </div>
        </div>

        <button type="submit" disabled={submitting}
          className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
          {submitting ? 'Creating...' : 'Create Exam'}
        </button>
      </form>
    </div>
  );
}
