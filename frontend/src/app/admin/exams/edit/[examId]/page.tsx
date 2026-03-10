'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, UserPlus, UserMinus, Search } from 'lucide-react';

interface Problem {
  _id: string;
  title: string;
  difficulty: string;
}

interface QuizItem {
  _id: string;
  title: string;
  questions: { score: number }[];
}

interface Student {
  _id: string;
  name: string;
  email: string;
  rollNumber: string;
}

interface SessionInfo {
  hasStarted: boolean;
  isSubmitted: boolean;
  violationCount: number;
}

interface ExamData {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  problems: Problem[];
  quizzes: QuizItem[];
  allowedStudents: Student[];
  maxViolations: number;
  isActive: boolean;
}

export default function EditExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxViolations, setMaxViolations] = useState(3);
  const [isActive, setIsActive] = useState(true);
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [selectedQuizzes, setSelectedQuizzes] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [allQuizzes, setAllQuizzes] = useState<QuizItem[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Record<string, SessionInfo>>({});

  const [studentSearch, setStudentSearch] = useState('');
  const [problemSearch, setProblemSearch] = useState('');
  const [resettingStudent, setResettingStudent] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [examRes, probRes, quizRes, studRes] = await Promise.all([
          api.get(`/admin/exams/${examId}`),
          api.get('/admin/problems'),
          api.get('/admin/quizzes'),
          api.get('/admin/students'),
        ]);

        const exam: ExamData = examRes.data.exam;
        setTitle(exam.title);
        setStartTime(formatDatetimeLocal(exam.startTime));
        setEndTime(formatDatetimeLocal(exam.endTime));
        setMaxViolations(exam.maxViolations);
        setIsActive(exam.isActive);
        setSelectedProblems(exam.problems.map((p) => p._id));
        setSelectedQuizzes((exam.quizzes || []).map((q) => q._id));
        setSelectedStudents(exam.allowedStudents.map((s) => s._id));
        setSessions(examRes.data.sessions || {});

        setAllProblems(probRes.data.problems);
        setAllQuizzes(quizRes.data.quizzes);
        setAllStudents(studRes.data.students);
      } catch {
        toast.error('Failed to load exam data');
        router.push('/admin/exams');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [examId, router]);

  const formatDatetimeLocal = (isoStr: string) => {
    const d = new Date(isoStr);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const toggleItem = (id: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const handleResetStudent = async (studentId: string) => {
    if (!confirm('This will delete the student\'s session, submissions, and violations for this exam. They will be able to retake it. Continue?')) {
      return;
    }

    setResettingStudent(studentId);
    try {
      await api.post(`/admin/exams/${examId}/reset/${studentId}`);
      toast.success('Student exam session reset successfully');
      setSessions((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
    } catch {
      toast.error('Failed to reset student exam');
    } finally {
      setResettingStudent(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProblems.length === 0 && selectedQuizzes.length === 0) {
      return toast.error('Select at least one problem or quiz');
    }
    if (selectedStudents.length === 0) return toast.error('Select at least one student');

    setSubmitting(true);
    try {
      await api.put(`/admin/exams/${examId}`, {
        title,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        problems: selectedProblems,
        quizzes: selectedQuizzes,
        allowedStudents: selectedStudents,
        maxViolations,
        isActive,
      });
      toast.success('Exam updated successfully!');
      router.push('/admin/exams');
    } catch (error: any) {
      const msg = error.response?.data?.errors?.[0]?.msg || error.response?.data?.error || 'Failed to update exam';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = allStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.rollNumber.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredProblems = allProblems.filter(
    (p) => p.title.toLowerCase().includes(problemSearch.toLowerCase())
  );

  const selectAllStudents = () => setSelectedStudents(allStudents.map((s) => s._id));
  const deselectAllStudents = () => setSelectedStudents([]);

  if (loading) {
    return (
      <div className="max-w-4xl animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="bg-white rounded-xl p-6 h-96 border border-gray-100" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <Link href="/admin/exams" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Exams
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Exam</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-800">Basic Information</h2>

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

          <div className="grid grid-cols-2 gap-4">
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
            <div className="flex items-end">
              <label className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 w-full">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Exam Active</span>
              </label>
            </div>
          </div>
        </div>

        {/* Problems */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Problems ({selectedProblems.length} selected)
          </h2>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search problems..."
              value={problemSearch}
              onChange={(e) => setProblemSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          <div className="border border-gray-200 rounded-xl max-h-60 overflow-y-auto p-2 space-y-1">
            {filteredProblems.map((p) => (
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
            {filteredProblems.length === 0 && (
              <p className="text-sm text-gray-400 p-2">No problems found.</p>
            )}
          </div>
        </div>

        {/* Quizzes */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            MCQ Quizzes ({selectedQuizzes.length} selected)
          </h2>
          <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto p-2 space-y-1">
            {allQuizzes.map((q) => (
              <label key={q._id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedQuizzes.includes(q._id)}
                  onChange={() => toggleItem(q._id, selectedQuizzes, setSelectedQuizzes)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">{q.title}</span>
                <span className="text-xs text-gray-400">
                  ({q.questions.length} Qs, {q.questions.reduce((s, x) => s + (x.score || 1), 0)} pts)
                </span>
              </label>
            ))}
            {allQuizzes.length === 0 && (
              <p className="text-sm text-gray-400 p-2">No quizzes available.</p>
            )}
          </div>
        </div>

        {/* Students */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Allowed Students ({selectedStudents.length} selected)
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllStudents}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
              >
                <UserPlus className="w-3.5 h-3.5" /> Select All
              </button>
              <button
                type="button"
                onClick={deselectAllStudents}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <UserMinus className="w-3.5 h-3.5" /> Deselect All
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search students by name, email, or roll number..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          <div className="border border-gray-200 rounded-xl max-h-72 overflow-y-auto p-2 space-y-1">
            {filteredStudents.map((s) => {
              const session = sessions[s._id];
              return (
                <div key={s._id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
                  <label className="flex items-center gap-3 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(s._id)}
                      onChange={() => toggleItem(s._id, selectedStudents, setSelectedStudents)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-700 block">{s.name}</span>
                      <span className="text-xs text-gray-400">{s.rollNumber} &middot; {s.email}</span>
                    </div>
                  </label>
                  {session && (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        session.isSubmitted
                          ? 'bg-green-100 text-green-700'
                          : session.hasStarted
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {session.isSubmitted ? 'Submitted' : session.hasStarted ? 'In Progress' : 'Not Started'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleResetStudent(s._id)}
                        disabled={resettingStudent === s._id}
                        title="Reset exam for retake"
                        className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className={`w-4 h-4 ${resettingStudent === s._id ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredStudents.length === 0 && (
              <p className="text-sm text-gray-400 p-2">No students found.</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Updating...' : 'Update Exam'}
        </button>
      </form>
    </div>
  );
}
