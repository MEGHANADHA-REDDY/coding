'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, GripVertical, CheckCircle2, Circle } from 'lucide-react';

interface MCQOption {
  text: string;
}

interface MCQQuestion {
  questionText: string;
  options: MCQOption[];
  correctOption: number;
  score: number;
}

const emptyQuestion = (): MCQQuestion => ({
  questionText: '',
  options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }],
  correctOption: 0,
  score: 1,
});

export default function CreateQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<MCQQuestion[]>([emptyQuestion()]);
  const [submitting, setSubmitting] = useState(false);
  const [expandedQ, setExpandedQ] = useState<number>(0);

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion()]);
    setExpandedQ(questions.length);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return toast.error('At least one question is required');
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    if (expandedQ >= questions.length - 1) setExpandedQ(Math.max(0, expandedQ - 1));
  };

  const duplicateQuestion = (index: number) => {
    const copy = { ...questions[index], options: questions[index].options.map((o) => ({ ...o })) };
    const next = [...questions];
    next.splice(index + 1, 0, copy);
    setQuestions(next);
    setExpandedQ(index + 1);
  };

  const updateQuestion = (index: number, field: keyof MCQQuestion, value: any) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  };

  const updateOption = (qIndex: number, oIndex: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q, qi) =>
        qi === qIndex
          ? { ...q, options: q.options.map((o, oi) => (oi === oIndex ? { text } : o)) }
          : q
      )
    );
  };

  const addOption = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, qi) =>
        qi === qIndex && q.options.length < 6
          ? { ...q, options: [...q.options, { text: '' }] }
          : q
      )
    );
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, qi) => {
        if (qi !== qIndex || q.options.length <= 2) return q;
        const newOptions = q.options.filter((_, oi) => oi !== oIndex);
        const newCorrect = q.correctOption === oIndex
          ? 0
          : q.correctOption > oIndex
          ? q.correctOption - 1
          : q.correctOption;
        return { ...q, options: newOptions, correctOption: newCorrect };
      })
    );
  };

  const totalScore = questions.reduce((sum, q) => sum + q.score, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        toast.error(`Question ${i + 1} text is empty`);
        setExpandedQ(i);
        return;
      }
      const emptyOpts = q.options.filter((o) => !o.text.trim());
      if (emptyOpts.length > 0) {
        toast.error(`Question ${i + 1} has empty option(s)`);
        setExpandedQ(i);
        return;
      }
    }

    setSubmitting(true);
    try {
      await api.post('/admin/quizzes', { title, description, questions });
      toast.success('Quiz created successfully!');
      router.push('/admin/quizzes');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to create quiz';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="max-w-3xl">
      <Link href="/admin/quizzes" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Quizzes
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Quiz</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Quiz Info */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quiz Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g., Data Structures MCQ"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the quiz"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500 pt-1 border-t border-gray-50">
            <span>{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
            <span>{totalScore} total points</span>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-3">
          {questions.map((q, qIndex) => {
            const isExpanded = expandedQ === qIndex;
            return (
              <div
                key={qIndex}
                className={`bg-white rounded-xl border transition-all ${
                  isExpanded ? 'border-indigo-200 shadow-sm' : 'border-gray-100'
                }`}
              >
                {/* Collapsed header */}
                <div
                  className="flex items-center gap-3 px-5 py-3.5 cursor-pointer"
                  onClick={() => setExpandedQ(isExpanded ? -1 : qIndex)}
                >
                  <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex-shrink-0">
                    {qIndex + 1}
                  </span>
                  <span className="flex-1 text-sm text-gray-700 truncate">
                    {q.questionText || 'Untitled question'}
                  </span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{q.score} pt{q.score !== 1 ? 's' : ''}</span>
                </div>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-4 border-t border-gray-50">
                    <div className="pt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                      <textarea
                        value={q.questionText}
                        onChange={(e) => updateQuestion(qIndex, 'questionText', e.target.value)}
                        placeholder="Enter your question..."
                        rows={2}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">
                          Options (click to mark correct)
                        </label>
                        {q.options.length < 6 && (
                          <button
                            type="button"
                            onClick={() => addOption(qIndex)}
                            className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Option
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {q.options.map((opt, oIndex) => {
                          const isCorrect = q.correctOption === oIndex;
                          return (
                            <div key={oIndex} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateQuestion(qIndex, 'correctOption', oIndex)}
                                className={`flex-shrink-0 transition-colors ${
                                  isCorrect ? 'text-green-600' : 'text-gray-300 hover:text-gray-400'
                                }`}
                                title={isCorrect ? 'Correct answer' : 'Mark as correct'}
                              >
                                {isCorrect ? (
                                  <CheckCircle2 className="w-5 h-5" />
                                ) : (
                                  <Circle className="w-5 h-5" />
                                )}
                              </button>
                              <span className="w-6 text-center text-xs font-semibold text-gray-400">
                                {optionLabels[oIndex]}
                              </span>
                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                placeholder={`Option ${optionLabels[oIndex]}`}
                                className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none ${
                                  isCorrect
                                    ? 'border-green-300 bg-green-50'
                                    : 'border-gray-200'
                                }`}
                              />
                              {q.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => removeOption(qIndex, oIndex)}
                                  className="text-red-300 hover:text-red-500 flex-shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Points:</label>
                        <input
                          type="number"
                          min={1}
                          value={q.score}
                          onChange={(e) => updateQuestion(qIndex, 'score', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => duplicateQuestion(qIndex)}
                          className="text-xs px-3 py-1.5 text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100"
                        >
                          Duplicate
                        </button>
                        {questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(qIndex)}
                            className="text-xs px-3 py-1.5 text-red-500 bg-red-50 rounded-lg hover:bg-red-100"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addQuestion}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Creating...' : `Create Quiz (${questions.length} questions, ${totalScore} pts)`}
        </button>
      </form>
    </div>
  );
}
