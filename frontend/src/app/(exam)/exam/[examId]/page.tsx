'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import CodeEditor from '@/components/CodeEditor';
import AntiCheat from '@/components/AntiCheat';
import { Clock, Send, ChevronLeft, ChevronRight, Loader2, LogOut, FileCode, CircleDot, CheckCircle2, Circle } from 'lucide-react';

interface Problem {
  _id: string;
  title: string;
  description: string;
  constraints: string;
  difficulty: string;
  sampleTestCases: { input: string; output: string }[];
}

interface QuizQuestion {
  _id: string;
  questionText: string;
  options: { text: string }[];
  score: number;
}

interface QuizData {
  _id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
}

interface ExamData {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  maxViolations: number;
}

interface SessionData {
  violationCount: number;
  isSubmitted: boolean;
}

interface SubmissionResult {
  _id: string;
  status: string;
  executionTime: number;
  score: number;
  maxScore: number;
  passedTestCases: number;
  totalTestCases: number;
  details: string;
}

interface QuizSubmissionData {
  quizId: string;
  answers: { questionId: string; selectedOption: number }[];
  score: number;
  maxScore: number;
}

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [exam, setExam] = useState<ExamData | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [quizzes, setQuizzes] = useState<QuizData[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);
  const [currentProblem, setCurrentProblem] = useState(0);
  const [language, setLanguage] = useState('python');
  const [codes, setCodes] = useState<Record<string, Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<SubmissionResult | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAutoSubmitted, setIsAutoSubmitted] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const [activeTab, setActiveTab] = useState<'coding' | 'quiz'>('coding');
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, Record<string, number>>>({});
  const [quizSubmissions, setQuizSubmissions] = useState<Record<string, QuizSubmissionData>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  useEffect(() => {
    const fetchExamData = async () => {
      try {
        const res = await api.get(`/exams/${examId}/problems`);
        setExam(res.data.exam);
        setProblems(res.data.problems || []);
        setQuizzes(res.data.quizzes || []);
        setSession(res.data.session);

        if ((res.data.quizzes || []).length > 0 && (res.data.problems || []).length === 0) {
          setActiveTab('quiz');
        }

        const existingSubs = res.data.quizSubmissions || [];
        const subMap: Record<string, QuizSubmissionData> = {};
        const ansMap: Record<string, Record<string, number>> = {};
        existingSubs.forEach((sub: any) => {
          subMap[sub.quizId] = sub;
          const qAns: Record<string, number> = {};
          (sub.answers || []).forEach((a: any) => { qAns[a.questionId] = a.selectedOption; });
          ansMap[sub.quizId] = qAns;
        });
        setQuizSubmissions(subMap);
        setQuizAnswers(ansMap);
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to load exam');
        router.push('/student/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchExamData();
  }, [examId, router]);

  const handleAutoSubmit = useCallback(async () => {
    if (isAutoSubmitted) return;
    setIsAutoSubmitted(true);
    try {
      await api.post(`/exams/${examId}/auto-submit`);
      toast.error('Exam auto-submitted!');
      router.push('/student/dashboard');
    } catch {
      // Session may already be submitted
    }
  }, [examId, router, isAutoSubmitted]);

  useEffect(() => {
    if (!exam) return;
    const timer = setInterval(() => {
      const diff = new Date(exam.endTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Time Up!');
        clearInterval(timer);
        handleAutoSubmit();
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [exam, handleAutoSubmit]);

  const handleViolationAutoSubmit = useCallback(() => {
    handleAutoSubmit();
  }, [handleAutoSubmit]);

  const getCode = (problemId: string, lang: string) => codes[problemId]?.[lang] || '';

  const setCode = (value: string) => {
    const problemId = problems[currentProblem]?._id;
    if (!problemId) return;
    setCodes((prev) => ({
      ...prev,
      [problemId]: { ...prev[problemId], [language]: value },
    }));
  };

  const handleSubmit = async () => {
    const problem = problems[currentProblem];
    if (!problem) return;
    const code = getCode(problem._id, language);
    if (!code.trim()) return toast.error('Please write some code first');

    setSubmitting(true);
    setLastResult(null);

    try {
      const res = await api.post('/submissions', {
        examId,
        problemId: problem._id,
        language,
        code,
      });
      setLastResult(res.data.submission);
      if (res.data.submission.status === 'AC') {
        toast.success(`Accepted! ${res.data.submission.score}/${res.data.submission.maxScore} pts`);
      } else {
        toast.error(`${res.data.submission.status} — ${res.data.submission.details}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectAnswer = (quizId: string, questionId: string, optionIndex: number) => {
    setQuizAnswers((prev) => ({
      ...prev,
      [quizId]: { ...prev[quizId], [questionId]: optionIndex },
    }));
  };

  const handleSubmitQuiz = async (quizId: string) => {
    const quiz = quizzes.find((q) => q._id === quizId);
    if (!quiz) return;

    const answers = quiz.questions.map((q) => ({
      questionId: q._id,
      selectedOption: quizAnswers[quizId]?.[q._id] ?? -1,
    })).filter((a) => a.selectedOption >= 0);

    if (answers.length === 0) return toast.error('Please answer at least one question');

    setSubmittingQuiz(true);
    try {
      const res = await api.post(`/exams/${examId}/quiz-submit`, { quizId, answers });
      const sub = res.data.quizSubmission;
      setQuizSubmissions((prev) => ({ ...prev, [quizId]: sub }));
      toast.success(`Quiz submitted! ${sub.score}/${sub.maxScore} pts (${sub.correctCount}/${sub.totalQuestions} correct)`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit quiz');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const handleFinishExam = async () => {
    setFinishing(true);
    try {
      await api.post(`/exams/${examId}/auto-submit`);
      toast.success('Exam submitted successfully!');
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      router.push('/student/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to finish exam');
      setFinishing(false);
      setShowFinishConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!exam || (problems.length === 0 && quizzes.length === 0)) return null;

  const hasCoding = problems.length > 0;
  const hasQuiz = quizzes.length > 0;
  const problem = problems[currentProblem];
  const currentQuiz = quizzes[currentQuizIndex];

  const difficultyColor = (d: string) => {
    switch (d) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'AC': return 'text-green-400 bg-green-900/30 border-green-800';
      case 'WA': return 'text-red-400 bg-red-900/30 border-red-800';
      case 'TLE': return 'text-yellow-400 bg-yellow-900/30 border-yellow-800';
      case 'RE': return 'text-orange-400 bg-orange-900/30 border-orange-800';
      case 'CE': return 'text-purple-400 bg-purple-900/30 border-purple-800';
      default: return 'text-gray-400 bg-gray-800 border-gray-700';
    }
  };

  const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <AntiCheat
      examId={examId}
      maxViolations={exam.maxViolations}
      initialViolationCount={session?.violationCount || 0}
      onAutoSubmit={handleViolationAutoSubmit}
    >
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Top bar */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold text-lg">{exam.title}</h1>
            {/* Section tabs */}
            {hasCoding && hasQuiz && (
              <div className="flex bg-gray-700 rounded-lg p-0.5">
                <button
                  onClick={() => setActiveTab('coding')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === 'coding' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" /> Coding
                </button>
                <button
                  onClick={() => setActiveTab('quiz')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeTab === 'quiz' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <CircleDot className="w-3.5 h-3.5" /> Quiz
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-red-400" />
              <span className="font-mono text-red-400 font-bold">{timeLeft}</span>
            </div>
            {activeTab === 'coding' && hasCoding && (
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm border border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="python">Python 3</option>
                <option value="java">Java 17</option>
              </select>
            )}
            <button
              onClick={() => setShowFinishConfirm(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Finish Exam
            </button>
          </div>
        </div>

        {/* Coding Section */}
        {activeTab === 'coding' && hasCoding && problem && (
          <div className="flex h-[calc(100vh-57px)]">
            {/* Left: Problem */}
            <div className="w-1/2 overflow-y-auto p-6 border-r border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold">{problem.title}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${difficultyColor(problem.difficulty)}`}>
                    {problem.difficulty}
                  </span>
                </div>
                <span className="text-sm text-gray-400">
                  Problem {currentProblem + 1} of {problems.length}
                </span>
              </div>

              <div className="prose prose-invert prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-300">{problem.description}</div>

                {problem.constraints && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-gray-200 mb-1">Constraints</h3>
                    <div className="whitespace-pre-wrap text-gray-400 text-sm">{problem.constraints}</div>
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-200">Sample Test Cases</h3>
                  {problem.sampleTestCases.map((tc, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-3 space-y-2">
                      <div>
                        <span className="text-xs text-gray-400">Input:</span>
                        <pre className="text-sm text-green-400 mt-0.5">{tc.input}</pre>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">Output:</span>
                        <pre className="text-sm text-blue-400 mt-0.5">{tc.output}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setCurrentProblem(Math.max(0, currentProblem - 1))}
                  disabled={currentProblem === 0}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <div className="flex gap-2">
                  {problems.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentProblem(i)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium ${
                        i === currentProblem ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentProblem(Math.min(problems.length - 1, currentProblem + 1))}
                  disabled={currentProblem === problems.length - 1}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right: Editor + Submit */}
            <div className="w-1/2 flex flex-col">
              <div className="flex-1 overflow-hidden">
                <CodeEditor
                  language={language}
                  value={getCode(problem._id, language)}
                  onChange={setCode}
                />
              </div>

              {lastResult && (
                <div className={`px-4 py-3 border-t ${statusColor(lastResult.status)}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">Result: {lastResult.status}</span>
                    <span>{lastResult.details}</span>
                    {lastResult.executionTime > 0 && <span>Time: {lastResult.executionTime}s</span>}
                  </div>
                </div>
              )}

              <div className="bg-gray-800 border-t border-gray-700 px-6 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-400">
                  Warnings: {session?.violationCount || 0} / {exam.maxViolations}
                </span>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating...</>
                  ) : (
                    <><Send className="w-4 h-4" /> Submit</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quiz Section */}
        {activeTab === 'quiz' && hasQuiz && currentQuiz && (
          <div className="h-[calc(100vh-57px)] overflow-y-auto">
            <div className="max-w-3xl mx-auto py-6 px-4">
              {/* Quiz selector (if multiple) */}
              {quizzes.length > 1 && (
                <div className="flex gap-2 mb-6">
                  {quizzes.map((q, i) => {
                    const sub = quizSubmissions[q._id];
                    return (
                      <button
                        key={q._id}
                        onClick={() => setCurrentQuizIndex(i)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          i === currentQuizIndex
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {q.title}
                        {sub && (
                          <span className="ml-2 text-xs opacity-75">({sub.score}/{sub.maxScore})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold">{currentQuiz.title}</h2>
                  {currentQuiz.description && (
                    <p className="text-sm text-gray-400 mt-1">{currentQuiz.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">
                    {currentQuiz.questions.length} questions &middot;{' '}
                    {currentQuiz.questions.reduce((s, q) => s + q.score, 0)} pts total
                  </div>
                  {quizSubmissions[currentQuiz._id] && (
                    <div className="text-sm font-semibold text-green-400 mt-0.5">
                      Score: {quizSubmissions[currentQuiz._id].score}/{quizSubmissions[currentQuiz._id].maxScore}
                    </div>
                  )}
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-4">
                {currentQuiz.questions.map((question, qIndex) => {
                  const selectedOpt = quizAnswers[currentQuiz._id]?.[question._id];
                  return (
                    <div key={question._id} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-sm font-medium text-white flex-1">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 text-xs font-bold mr-2">
                            {qIndex + 1}
                          </span>
                          {question.questionText}
                        </h3>
                        <span className="text-xs text-gray-500 ml-3 flex-shrink-0">{question.score} pt{question.score !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="space-y-2 ml-8">
                        {question.options.map((opt, oIndex) => {
                          const isSelected = selectedOpt === oIndex;
                          return (
                            <button
                              key={oIndex}
                              type="button"
                              onClick={() => handleSelectAnswer(currentQuiz._id, question._id, oIndex)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-left transition-all ${
                                isSelected
                                  ? 'bg-indigo-600/20 border border-indigo-500 text-white'
                                  : 'bg-gray-700/50 border border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                              }`}
                            >
                              {isSelected ? (
                                <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              )}
                              <span className="w-5 text-xs font-bold text-gray-500">{optionLabels[oIndex]}</span>
                              {opt.text}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quiz submit bar */}
              <div className="mt-6 flex items-center justify-between bg-gray-800 rounded-xl p-4 border border-gray-700">
                <div className="text-sm text-gray-400">
                  Answered: {Object.keys(quizAnswers[currentQuiz._id] || {}).length}/{currentQuiz.questions.length}
                </div>
                <button
                  onClick={() => handleSubmitQuiz(currentQuiz._id)}
                  disabled={submittingQuiz}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {submittingQuiz ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  ) : quizSubmissions[currentQuiz._id] ? (
                    <><Send className="w-4 h-4" /> Resubmit Quiz</>
                  ) : (
                    <><Send className="w-4 h-4" /> Submit Quiz</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* If only quizzes and on coding tab, or only coding and on quiz tab — auto-redirect handled above */}
        {activeTab === 'coding' && !hasCoding && hasQuiz && (
          <div className="flex items-center justify-center h-[calc(100vh-57px)]">
            <div className="text-center">
              <p className="text-gray-400 mb-4">This exam has no coding problems.</p>
              <button onClick={() => setActiveTab('quiz')} className="px-4 py-2 bg-indigo-600 rounded-lg text-sm">
                Go to Quiz
              </button>
            </div>
          </div>
        )}
        {activeTab === 'quiz' && !hasQuiz && hasCoding && (
          <div className="flex items-center justify-center h-[calc(100vh-57px)]">
            <div className="text-center">
              <p className="text-gray-400 mb-4">This exam has no quizzes.</p>
              <button onClick={() => setActiveTab('coding')} className="px-4 py-2 bg-indigo-600 rounded-lg text-sm">
                Go to Coding
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Finish Exam Confirmation Modal */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-700">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-2">Finish Exam?</h2>
              <p className="text-gray-400 mb-1">
                Are you sure you want to finish and submit this exam?
              </p>
              <p className="text-red-400 text-sm font-medium">
                This action cannot be undone. You will not be able to submit any more solutions after this.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setShowFinishConfirm(false)}
                disabled={finishing}
                className="flex-1 py-2.5 bg-gray-700 text-gray-300 font-medium rounded-xl hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleFinishExam}
                disabled={finishing}
                className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {finishing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  'Yes, Finish Exam'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AntiCheat>
  );
}
