const axios = require('axios');

const LANGUAGE_IDS_DEFAULT = { python: 71, java: 62 };
const LANGUAGE_IDS_CE = { python: 100, java: 91 };

function getLanguageIds() {
  const custom = process.env.JUDGE0_LANG_PYTHON || process.env.JUDGE0_LANG_JAVA;
  if (custom) {
    return {
      python: parseInt(process.env.JUDGE0_LANG_PYTHON, 10) || LANGUAGE_IDS_DEFAULT.python,
      java: parseInt(process.env.JUDGE0_LANG_JAVA, 10) || LANGUAGE_IDS_DEFAULT.java,
    };
  }
  const baseUrl = (process.env.JUDGE0_BASE_URL || '').toLowerCase();
  if (baseUrl.includes('ce.judge0.com') || baseUrl.includes('rapidapi.com')) {
    return LANGUAGE_IDS_CE;
  }
  return LANGUAGE_IDS_DEFAULT;
}

const MAX_CONCURRENT = parseInt(process.env.JUDGE0_MAX_CONCURRENT || '20', 10);
const POLL_INTERVAL = parseInt(process.env.JUDGE0_POLL_INTERVAL || '1500', 10);
const POLL_MAX_RETRIES = parseInt(process.env.JUDGE0_POLL_MAX_RETRIES || '20', 10);

let PQueue;
let submissionQueue;
let batchSupported = null;

async function getQueue() {
  if (submissionQueue) return submissionQueue;
  if (!PQueue) {
    const mod = await import('p-queue');
    PQueue = mod.default;
  }
  submissionQueue = new PQueue({ concurrency: MAX_CONCURRENT });
  console.log(`[Judge0] Queue initialized (concurrency: ${MAX_CONCURRENT})`);
  return submissionQueue;
}

const getAxiosInstance = () => {
  const baseUrl = process.env.JUDGE0_BASE_URL;
  const headers = { 'Content-Type': 'application/json' };
  const apiKey = process.env.JUDGE0_API_KEY;

  if (baseUrl.includes('rapidapi.com') && apiKey) {
    headers['X-RapidAPI-Key'] = apiKey;
    headers['X-RapidAPI-Host'] = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com';
  } else if (apiKey) {
    headers['X-Auth-Token'] = apiKey;
  }

  return axios.create({ baseURL: baseUrl, headers, timeout: 30000 });
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Single submission (works on all Judge0 versions) ──

async function submitSingle(code, languageId, stdin) {
  const client = getAxiosInstance();
  const res = await client.post('/submissions?base64_encoded=false&wait=false', {
    source_code: code,
    language_id: languageId,
    stdin: stdin,
    cpu_time_limit: 5,
    memory_limit: 256000,
  });
  return res.data.token;
}

async function pollSingleResult(token) {
  const client = getAxiosInstance();
  for (let i = 0; i < POLL_MAX_RETRIES; i++) {
    const res = await client.get(
      `/submissions/${token}?base64_encoded=false&fields=status,stdout,stderr,compile_output,time,memory`
    );
    const statusId = res.data.status?.id;
    if (statusId !== 1 && statusId !== 2) return res.data;
    await sleep(POLL_INTERVAL);
  }
  throw new Error('Judge0 polling timeout');
}

// ── Batch submission (Judge0 CE / newer versions) ──

async function submitBatch(submissions) {
  const client = getAxiosInstance();
  const res = await client.post('/submissions/batch?base64_encoded=false', { submissions });
  return res.data;
}

async function pollBatchResults(tokens) {
  const client = getAxiosInstance();
  const tokenString = tokens.join(',');
  for (let attempt = 0; attempt < POLL_MAX_RETRIES; attempt++) {
    const res = await client.get(
      `/submissions/batch?tokens=${tokenString}&base64_encoded=false&fields=token,status,stdout,stderr,compile_output,time,memory`
    );
    const results = res.data.submissions;
    if (results.every((r) => r.status?.id !== 1 && r.status?.id !== 2)) return results;
    await sleep(POLL_INTERVAL);
  }
  throw new Error('Judge0 batch polling timeout');
}

// ── Result processing ──

function processResult(result, testCaseIndex, expectedOutput) {
  const statusId = result.status?.id;

  if (statusId === 6) {
    return { done: true, status: 'CE', executionTime: 0, details: result.compile_output || 'Compilation error' };
  }
  if (statusId >= 7 && statusId <= 12) {
    return { done: true, status: 'RE', executionTime: parseFloat(result.time) || 0, details: result.stderr || 'Runtime error' };
  }
  if (statusId === 5) {
    return { done: true, status: 'TLE', executionTime: parseFloat(result.time) || 0, details: 'Time limit exceeded' };
  }

  const actual = (result.stdout || '').trim();
  if (actual !== expectedOutput.trim()) {
    return { done: true, status: 'WA', executionTime: parseFloat(result.time) || 0, details: `Failed on test case ${testCaseIndex + 1}` };
  }

  return { done: false, time: parseFloat(result.time) || 0 };
}

// ── Evaluate via batch (fast) ──

async function evaluateViaBatch(code, languageId, hiddenTestCases) {
  const submissions = hiddenTestCases.map((tc) => ({
    source_code: code,
    language_id: languageId,
    stdin: tc.input || '',
    expected_output: tc.output.trim(),
    cpu_time_limit: 5,
    memory_limit: 256000,
  }));

  const batchResponse = await submitBatch(submissions);
  const tokens = batchResponse.map((r) => r.token);
  const results = await pollBatchResults(tokens);

  let totalTime = 0;
  for (let i = 0; i < results.length; i++) {
    const p = processResult(results[i], i, hiddenTestCases[i].output);
    if (p.done) return p;
    totalTime += p.time;
  }

  return { status: 'AC', executionTime: Math.round(totalTime * 1000) / 1000, details: `All ${hiddenTestCases.length} test cases passed` };
}

// ── Evaluate via sequential singles (compatible with all versions) ──

async function evaluateViaSequential(code, languageId, hiddenTestCases) {
  let totalTime = 0;

  for (let i = 0; i < hiddenTestCases.length; i++) {
    const tc = hiddenTestCases[i];
    const token = await submitSingle(code, languageId, tc.input || '');
    const result = await pollSingleResult(token);
    const p = processResult(result, i, tc.output);
    if (p.done) return p;
    totalTime += p.time;
  }

  return { status: 'AC', executionTime: Math.round(totalTime * 1000) / 1000, details: `All ${hiddenTestCases.length} test cases passed` };
}

// ── Auto-detect batch support on first call ──

async function detectBatchSupport() {
  if (batchSupported !== null) return batchSupported;
  try {
    const client = getAxiosInstance();
    await client.post('/submissions/batch?base64_encoded=false', { submissions: [] });
    batchSupported = true;
  } catch (err) {
    const status = err.response?.status;
    if (status === 404 || status === 422) {
      batchSupported = false;
    } else {
      batchSupported = true;
    }
  }
  console.log(`[Judge0] Batch API supported: ${batchSupported}`);
  return batchSupported;
}

// ── Main entry point ──

async function evaluateSubmissionDirect(code, language, hiddenTestCases) {
  const langIds = getLanguageIds();
  const languageId = langIds[language];
  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }
  if (!hiddenTestCases || hiddenTestCases.length === 0) {
    throw new Error('No test cases to evaluate.');
  }

  try {
    const useBatch = await detectBatchSupport();
    if (useBatch) {
      return await evaluateViaBatch(code, languageId, hiddenTestCases);
    }
    return await evaluateViaSequential(code, languageId, hiddenTestCases);
  } catch (error) {
    const statusCode = error.response?.status;
    console.error('[Judge0] Error:', { message: error.message, status: statusCode, url: process.env.JUDGE0_BASE_URL });

    if (statusCode === 403) throw new Error('Judge0 API returned 403 Forbidden. Check JUDGE0_BASE_URL and JUDGE0_API_KEY.');
    if (statusCode === 429) throw new Error('Judge0 rate limit exceeded. Please wait and try again.');
    throw error;
  }
}

const evaluateSubmission = async (code, language, hiddenTestCases) => {
  const queue = await getQueue();
  return queue.add(() => evaluateSubmissionDirect(code, language, hiddenTestCases), { throwOnTimeout: true });
};

function getQueueStats() {
  if (!submissionQueue) return { size: 0, pending: 0, concurrency: MAX_CONCURRENT };
  return { size: submissionQueue.size, pending: submissionQueue.pending, concurrency: MAX_CONCURRENT };
}

const mapStatus = (statusId) => {
  switch (statusId) {
    case 3: return 'AC';
    case 4: return 'WA';
    case 5: return 'TLE';
    case 6: return 'CE';
    case 7: case 8: case 9: case 10: case 11: case 12: return 'RE';
    default: return 'RE';
  }
};

module.exports = { evaluateSubmission, mapStatus, getQueueStats };
