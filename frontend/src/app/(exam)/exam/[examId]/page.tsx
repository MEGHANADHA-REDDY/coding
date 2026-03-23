'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import CodeEditor from '@/components/CodeEditor';
import AntiCheat from '@/components/AntiCheat';
import { Clock, Send, ChevronLeft, ChevronRight, Loader2, LogOut, CheckCircle, ArrowRight } from 'lucide-react';

interface Problem {
  _id: string;
  title: string;
  description: string;
  constraints: string;
  difficulty: string;
  type: string;
  boilerplateCode?: string;
  sampleTestCases: { input: string; output: string }[];
  options?: { a: string; b: string; c: string; d: string };
}

interface SectionMeta {
  label: string;
  type: string;
  durationMinutes: number;
}

interface ExamData {
  _id: string;
  title: string;
  maxViolations: number;
}

interface SessionData {
  violationCount: number;
  isSubmitted: boolean;
}

interface SubmissionResult {
  _id: string;
  status: string;
  executionTime?: number;
  details?: string;
}

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [exam, setExam] = useState<ExamData | null>(null);
  const [sections, setSections] = useState<SectionMeta[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [sectionStartedAt, setSectionStartedAt] = useState<string>('');
  const [problems, setProblems] = useState<Problem[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);
  const [currentProblem, setCurrentProblem] = useState(0);
  const [language, setLanguage] = useState('python');
  const [codes, setCodes] = useState<Record<string, Record<string, string>>>({});
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<SubmissionResult | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAutoSubmitted, setIsAutoSubmitted] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [showNextSectionConfirm, setShowNextSectionConfirm] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  const fetchSectionData = useCallback(async () => {
    try {
      const res = await api.get(`/exams/${examId}/problems`);
      setExam(res.data.exam);
      setSections(res.data.sections);
      setCurrentSectionIndex(res.data.currentSection);
      setSectionStartedAt(res.data.sectionStartedAt);
      setProblems(res.data.problems);
      setSession(res.data.session);
      setCurrentProblem(0);
      setLastResult(null);

      const initialCodes: Record<string, Record<string, string>> = {};
      for (const p of res.data.problems) {
        if (p.type === 'coding' && p.boilerplateCode) {
          initialCodes[p._id] = { python: p.boilerplateCode, java: p.boilerplateCode };
        }
      }
      setCodes((prev) => ({ ...prev, ...initialCodes }));
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load exam');
      router.push('/student/dashboard');
    } finally {
      setLoading(false);
    }
  }, [examId, router]);

  useEffect(() => {
    fetchSectionData();
  }, [fetchSectionData]);

  const handleAutoSubmit = useCallback(async () => {
    if (isAutoSubmitted) return;
    setIsAutoSubmitted(true);
    try {
      await api.post(`/exams/${examId}/auto-submit`);
      toast.error('Exam auto-submitted!');
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      router.push('/student/dashboard');
    } catch {
      // already submitted
    }
  }, [examId, router, isAutoSubmitted]);

  const handleAdvanceSection = useCallback(async () => {
    setAdvancing(true);
    try {
      const res = await api.post(`/exams/${examId}/advance-section`);
      if (res.data.submitted) {
        toast.success('Exam submitted!');
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        router.push('/student/dashboard');
      } else {
        toast.success(`Moving to section ${res.data.currentSection + 1}`);
        setCurrentSectionIndex(res.data.currentSection);
        setSectionStartedAt(res.data.sectionStartedAt);
        setShowNextSectionConfirm(false);
        setAdvancing(false);
        await fetchSectionData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to advance');
      setAdvancing(false);
      setShowNextSectionConfirm(false);
    }
  }, [examId, router, fetchSectionData]);

  // Section timer
  useEffect(() => {
    if (!sectionStartedAt || sections.length === 0) return;
    const currentSection = sections[currentSectionIndex];
    if (!currentSection) return;

    const deadline = new Date(sectionStartedAt).getTime() + currentSection.durationMinutes * 60000;

    const timer = setInterval(() => {
      const diff = deadline - Date.now();
      if (diff <= 0) {
        setTimeLeft('00:00:00');
        clearInterval(timer);
        const isLastSection = currentSectionIndex >= sections.length - 1;
        if (isLastSection) {
          handleAutoSubmit();
        } else {
          handleAdvanceSection();
        }
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [sectionStartedAt, sections, currentSectionIndex, handleAutoSubmit, handleAdvanceSection]);

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

    if (problem.type === 'mcq') {
      const answer = mcqAnswers[problem._id];
      if (!answer) return toast.error('Please select an answer');
      setSubmitting(true);
      setLastResult(null);
      try {
        const res = await api.post('/submissions', { examId, problemId: problem._id, selectedAnswer: answer });
        setLastResult(res.data.submission);
        toast[res.data.submission.status === 'AC' ? 'success' : 'error'](
          res.data.submission.status === 'AC' ? 'Correct!' : 'Incorrect answer.'
        );
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Submission failed');
      } finally {
        setSubmitting(false);
      }
    } else {
      const code = getCode(problem._id, language);
      if (!code.trim()) return toast.error('Please write some code first');
      setSubmitting(true);
      setLastResult(null);
      try {
        const res = await api.post('/submissions', { examId, problemId: problem._id, language, code });
        setLastResult(res.data.submission);
        if (res.data.submission.status === 'AC') {
          toast.success('Accepted! All test cases passed.');
        } else {
          toast.error(`Result: ${res.data.submission.status} - ${res.data.submission.details}`);
        }
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Submission failed');
      } finally {
        setSubmitting(false);
      }
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

  if (!exam || problems.length === 0) return null;

  const problem = problems[currentProblem];
  const isMCQ = problem.type === 'mcq';
  const currentSection = sections[currentSectionIndex];
  const isLastSection = currentSectionIndex >= sections.length - 1;
  const multiSection = sections.length > 1;

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

  return (
    <AntiCheat
      examId={examId}
      maxViolations={exam.maxViolations}
      initialViolationCount={session?.violationCount || 0}
      onAutoSubmit={handleViolationAutoSubmit}
    >
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Section progress bar */}
        {multiSection && (
          <div className="bg-gray-850 border-b border-gray-700 px-6 py-2 flex items-center gap-2">
            {sections.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                {i > 0 && <ArrowRight className="w-3 h-3 text-gray-600" />}
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  i === currentSectionIndex
                    ? 'bg-indigo-600 text-white'
                    : i < currentSectionIndex
                    ? 'bg-gray-700 text-gray-400 line-through'
                    : 'bg-gray-800 text-gray-500'
                }`}>
                  {s.label || `Section ${i + 1}`} ({s.type}, {s.durationMinutes}min)
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Top bar */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold text-lg">{exam.title}</h1>
            {currentSection && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${currentSection.type === 'coding' ? 'bg-blue-900/40 text-blue-300' : 'bg-purple-900/40 text-purple-300'}`}>
                {currentSection.label || `Section ${currentSectionIndex + 1}`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-red-400" />
              <span className="font-mono text-red-400 font-bold">{timeLeft}</span>
            </div>
            {!isMCQ && (
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm border border-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="python">Python 3</option>
                <option value="java">Java 17</option>
              </select>
            )}
            {multiSection && !isLastSection ? (
              <button
                onClick={() => setShowNextSectionConfirm(true)}
                className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                Next Section
              </button>
            ) : null}
            <button
              onClick={() => setShowFinishConfirm(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Finish Exam
            </button>
          </div>
        </div>

        <div className="flex h-[calc(100vh-57px)]" style={multiSection ? { height: 'calc(100vh - 93px)' } : {}}>
          {/* Left: Problem description */}
          <div className={`${isMCQ ? 'w-full' : 'w-1/2'} overflow-y-auto p-6 ${!isMCQ ? 'border-r border-gray-700' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">{problem.title}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${difficultyColor(problem.difficulty)}`}>
                  {problem.difficulty}
                </span>
              </div>
              <span className="text-sm text-gray-400">
                {currentProblem + 1} of {problems.length}
              </span>
            </div>

            <div className="prose prose-invert prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-gray-300">{problem.description}</div>

              {!isMCQ && problem.constraints && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-200 mb-1">Constraints</h3>
                  <div className="whitespace-pre-wrap text-gray-400 text-sm">{problem.constraints}</div>
                </div>
              )}

              {!isMCQ && problem.sampleTestCases && problem.sampleTestCases.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-200">Sample Test Cases</h3>
                  {problem.sampleTestCases.map((tc, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-3 space-y-2">
                      <div>
                        <span className="text-xs text-gray-400">Input:</span>
                        <pre className="text-sm text-green-400 mt-0.5">{tc.input || '(none)'}</pre>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">Output:</span>
                        <pre className="text-sm text-blue-400 mt-0.5">{tc.output}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isMCQ && problem.options && (
                <div className="mt-6 space-y-3">
                  {(['a', 'b', 'c', 'd'] as const).map((key) => (
                    <label
                      key={key}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        mcqAnswers[problem._id] === key
                          ? 'border-indigo-500 bg-indigo-900/30'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`mcq-${problem._id}`}
                        value={key}
                        checked={mcqAnswers[problem._id] === key}
                        onChange={() => setMcqAnswers((prev) => ({ ...prev, [problem._id]: key }))}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <span className="font-semibold text-gray-400 uppercase w-6">{key}.</span>
                      <span className="text-gray-200">{problem.options?.[key]}</span>
                      {mcqAnswers[problem._id] === key && (
                        <CheckCircle className="w-5 h-5 text-indigo-400 ml-auto" />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Problem navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={() => { setCurrentProblem(Math.max(0, currentProblem - 1)); setLastResult(null); }}
                disabled={currentProblem === 0}
                className="flex items-center gap-1 px-3 py-2 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <div className="flex gap-2 flex-wrap justify-center">
                {problems.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentProblem(i); setLastResult(null); }}
                    className={`w-8 h-8 rounded-lg text-sm font-medium ${
                      i === currentProblem ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { setCurrentProblem(Math.min(problems.length - 1, currentProblem + 1)); setLastResult(null); }}
                disabled={currentProblem === problems.length - 1}
                className="flex items-center gap-1 px-3 py-2 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {isMCQ && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-400">
                  Warnings: {session?.violationCount || 0} / {exam.maxViolations}
                </span>
                <button onClick={handleSubmit} disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Send className="w-4 h-4" /> Submit Answer</>}
                </button>
              </div>
            )}

            {isMCQ && lastResult && (
              <div className={`mt-3 px-4 py-3 rounded-xl border ${statusColor(lastResult.status)}`}>
                <span className="font-semibold text-sm">
                  {lastResult.status === 'AC' ? 'Correct!' : 'Incorrect'}
                </span>
              </div>
            )}
          </div>

          {/* Right: Editor (coding only) */}
          {!isMCQ && (
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
                    {lastResult.executionTime && lastResult.executionTime > 0 && (
                      <span>Time: {lastResult.executionTime}s</span>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-gray-800 border-t border-gray-700 px-6 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-400">
                  Warnings: {session?.violationCount || 0} / {exam.maxViolations}
                </span>
                <button onClick={handleSubmit} disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50">
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating...</> : <><Send className="w-4 h-4" /> Submit</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Next Section Confirmation Modal */}
      {showNextSectionConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-700">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-2">Move to Next Section?</h2>
              <p className="text-gray-400 mb-1">
                You are about to move from <strong>{sections[currentSectionIndex]?.label || `Section ${currentSectionIndex + 1}`}</strong> to <strong>{sections[currentSectionIndex + 1]?.label || `Section ${currentSectionIndex + 2}`}</strong>.
              </p>
              <p className="text-yellow-400 text-sm font-medium">
                You will NOT be able to return to the current section. All unsaved work in this section will be lost.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowNextSectionConfirm(false)} disabled={advancing}
                className="flex-1 py-2.5 bg-gray-700 text-gray-300 font-medium rounded-xl hover:bg-gray-600 transition-colors disabled:opacity-50">
                Stay
              </button>
              <button onClick={handleAdvanceSection} disabled={advancing}
                className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {advancing ? <><Loader2 className="w-4 h-4 animate-spin" /> Moving...</> : 'Yes, Next Section'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                This action cannot be undone. You will not be able to submit any more solutions.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowFinishConfirm(false)} disabled={finishing}
                className="flex-1 py-2.5 bg-gray-700 text-gray-300 font-medium rounded-xl hover:bg-gray-600 transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleFinishExam} disabled={finishing}
                className="flex-1 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {finishing ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Yes, Finish Exam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AntiCheat>
  );
}
