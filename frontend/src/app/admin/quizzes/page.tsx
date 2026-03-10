'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, CircleDot, Trash2, Info, ArrowRight } from 'lucide-react';

interface Quiz {
  _id: string;
  title: string;
  description: string;
  questions: { questionText: string; score: number }[];
  createdAt: string;
}

interface ExamRef {
  _id: string;
  title: string;
  quizzes: { _id: string }[];
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [exams, setExams] = useState<ExamRef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [quizRes, examRes] = await Promise.all([
        api.get('/admin/quizzes'),
        api.get('/admin/exams'),
      ]);
      setQuizzes(quizRes.data.quizzes);
      setExams(examRes.data.exams);
    } catch {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;
    try {
      await api.delete(`/admin/quizzes/${id}`);
      toast.success('Quiz deleted');
      setQuizzes((prev) => prev.filter((q) => q._id !== id));
    } catch {
      toast.error('Failed to delete quiz');
    }
  };

  const getTotalScore = (quiz: Quiz) =>
    quiz.questions.reduce((sum, q) => sum + (q.score || 1), 0);

  const getExamsForQuiz = (quizId: string) =>
    exams.filter((e) => e.quizzes?.some((q) => q._id === quizId));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quizzes</h1>
        <Link
          href="/admin/quizzes/create"
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Quiz
        </Link>
      </div>

      {/* How-it-works guide */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-700">
            <p className="font-medium mb-1">How quizzes work</p>
            <div className="flex items-center gap-2 text-indigo-600">
              <span className="bg-indigo-100 px-2 py-0.5 rounded text-xs font-medium">Step 1</span>
              Create a quiz with MCQ questions here
              <ArrowRight className="w-3.5 h-3.5" />
              <span className="bg-indigo-100 px-2 py-0.5 rounded text-xs font-medium">Step 2</span>
              <Link href="/admin/exams/create" className="underline hover:text-indigo-800">
                Create or edit an exam
              </Link>{' '}
              and add your quiz + select students
              <ArrowRight className="w-3.5 h-3.5" />
              <span className="bg-indigo-100 px-2 py-0.5 rounded text-xs font-medium">Step 3</span>
              Students see it on their dashboard
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 h-24 border border-gray-100" />
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-gray-100 text-center">
          <CircleDot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No quizzes created yet.</p>
          <p className="text-sm text-gray-400 mt-1">Create a quiz, then add it to an exam to assign it to students.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quizzes.map((quiz) => {
            const linkedExams = getExamsForQuiz(quiz._id);
            return (
              <div key={quiz._id} className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">{quiz.title}</h3>
                    {quiz.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{quiz.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>{quiz.questions.length} questions</span>
                      <span>{getTotalScore(quiz)} total points</span>
                      <span className="text-xs text-gray-400">
                        Created {new Date(quiz.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Which exams this quiz is in */}
                    {linkedExams.length > 0 ? (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">Used in:</span>
                        {linkedExams.map((ex) => (
                          <Link
                            key={ex._id}
                            href={`/admin/exams/edit/${ex._id}`}
                            className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full hover:bg-green-100"
                          >
                            {ex.title}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                          Not added to any exam yet
                        </span>
                        <Link
                          href="/admin/exams/create"
                          className="text-xs text-indigo-600 hover:text-indigo-700 underline"
                        >
                          Add to an exam
                        </Link>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(quiz._id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete quiz"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
