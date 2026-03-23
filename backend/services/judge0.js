const axios = require('axios');

const LANGUAGE_IDS = {
  python: 100,
  java: 91,
};

const MAX_CONCURRENT = parseInt(process.env.JUDGE0_MAX_CONCURRENT || '20', 10);
const POLL_INTERVAL = parseInt(process.env.JUDGE0_POLL_INTERVAL || '1500', 10);
const POLL_MAX_RETRIES = parseInt(process.env.JUDGE0_POLL_MAX_RETRIES || '20', 10);

let PQueue;
let submissionQueue;

async function getQueue() {
  if (submissionQueue) return submissionQueue;
  if (!PQueue) {
    const mod = await import('p-queue');
    PQueue = mod.default;
  }
  submissionQueue = new PQueue({ concurrency: MAX_CONCURRENT });
  console.log(`[Judge0] Submission queue initialized (concurrency: ${MAX_CONCURRENT})`);
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

  return axios.create({
    baseURL: baseUrl,
    headers,
    timeout: 30000,
  });
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function submitBatch(submissions) {
  const client = getAxiosInstance();
  const response = await client.post(
    '/submissions/batch?base64_encoded=false',
    { submissions },
  );
  return response.data;
}

async function getBatchResults(tokens) {
  const client = getAxiosInstance();
  const tokenString = tokens.join(',');
  const response = await client.get(
    `/submissions/batch?tokens=${tokenString}&base64_encoded=false&fields=token,status,stdout,stderr,compile_output,time,memory`,
  );
  return response.data.submissions;
}

async function pollBatchResults(tokens) {
  for (let attempt = 0; attempt < POLL_MAX_RETRIES; attempt++) {
    const results = await getBatchResults(tokens);

    const allDone = results.every((r) => {
      const sid = r.status?.id;
      return sid !== 1 && sid !== 2;
    });

    if (allDone) return results;
    await sleep(POLL_INTERVAL);
  }

  throw new Error('Judge0 batch polling timeout');
}

const mapStatus = (statusId) => {
  switch (statusId) {
    case 3: return 'AC';
    case 4: return 'WA';
    case 5: return 'TLE';
    case 6: return 'CE';
    case 7: case 8: case 9: case 10: case 11: case 12:
      return 'RE';
    default: return 'RE';
  }
};

async function evaluateSubmissionDirect(code, language, hiddenTestCases) {
  const languageId = LANGUAGE_IDS[language];
  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }

  if (!hiddenTestCases || hiddenTestCases.length === 0) {
    throw new Error('No test cases to evaluate.');
  }

  const submissions = hiddenTestCases.map((tc) => ({
    source_code: code,
    language_id: languageId,
    stdin: tc.input || '',
    expected_output: tc.output.trim(),
    cpu_time_limit: 5,
    memory_limit: 256000,
  }));

  try {
    const batchResponse = await submitBatch(submissions);
    const tokens = batchResponse.map((r) => r.token);
    const results = await pollBatchResults(tokens);

    let totalTime = 0;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const statusId = result.status?.id;

      if (statusId === 6) {
        return {
          status: 'CE',
          executionTime: 0,
          details: result.compile_output || 'Compilation error',
        };
      }

      if (statusId >= 7 && statusId <= 12) {
        return {
          status: 'RE',
          executionTime: parseFloat(result.time) || 0,
          details: result.stderr || 'Runtime error',
        };
      }

      if (statusId === 5) {
        return {
          status: 'TLE',
          executionTime: parseFloat(result.time) || 0,
          details: 'Time limit exceeded',
        };
      }

      const actualOutput = (result.stdout || '').trim();
      const expectedOutput = hiddenTestCases[i].output.trim();

      if (actualOutput !== expectedOutput) {
        return {
          status: 'WA',
          executionTime: parseFloat(result.time) || 0,
          details: `Failed on test case ${i + 1}`,
        };
      }

      totalTime += parseFloat(result.time) || 0;
    }

    return {
      status: 'AC',
      executionTime: Math.round(totalTime * 1000) / 1000,
      details: `All ${hiddenTestCases.length} test cases passed`,
    };
  } catch (error) {
    const statusCode = error.response?.status;
    console.error('[Judge0] Batch error:', {
      message: error.message,
      status: statusCode,
      url: process.env.JUDGE0_BASE_URL,
    });

    if (statusCode === 403) {
      throw new Error('Judge0 API returned 403 Forbidden. Check JUDGE0_BASE_URL and JUDGE0_API_KEY.');
    }
    if (statusCode === 429) {
      throw new Error('Judge0 rate limit exceeded. Please wait and try again.');
    }
    if (statusCode === 422) {
      throw new Error('Judge0 rejected the submission. Check code and language.');
    }

    throw error;
  }
}

const evaluateSubmission = async (code, language, hiddenTestCases) => {
  const queue = await getQueue();
  return queue.add(() => evaluateSubmissionDirect(code, language, hiddenTestCases), {
    throwOnTimeout: true,
  });
};

function getQueueStats() {
  if (!submissionQueue) return { size: 0, pending: 0, concurrency: MAX_CONCURRENT };
  return {
    size: submissionQueue.size,
    pending: submissionQueue.pending,
    concurrency: MAX_CONCURRENT,
  };
}

module.exports = {
  LANGUAGE_IDS,
  evaluateSubmission,
  mapStatus,
  getQueueStats,
};
