const axios = require('axios');

const LANGUAGE_IDS = {
  python: 100, // Python 3.12.5
  java: 91,    // Java JDK 17.0.6
};

const getHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const baseUrl = process.env.JUDGE0_BASE_URL || '';
  const apiKey = process.env.JUDGE0_API_KEY;

  if (baseUrl.includes('rapidapi.com') && apiKey) {
    headers['X-RapidAPI-Key'] = apiKey;
    headers['X-RapidAPI-Host'] = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com';
  } else if (apiKey) {
    headers['X-Auth-Token'] = apiKey;
  }
  // If no API key set (e.g. free public ce.judge0.com), no auth headers needed

  return headers;
};

const submitCode = async (sourceCode, languageId, stdin = '') => {
  const baseUrl = process.env.JUDGE0_BASE_URL;
  const response = await axios.post(
    `${baseUrl}/submissions?base64_encoded=false&wait=false`,
    {
      source_code: sourceCode,
      language_id: languageId,
      stdin: stdin,
      cpu_time_limit: 5,
      memory_limit: 256000,
    },
    { headers: getHeaders() }
  );
  return response.data.token;
};

const getResult = async (token) => {
  const baseUrl = process.env.JUDGE0_BASE_URL;
  const response = await axios.get(
    `${baseUrl}/submissions/${token}?base64_encoded=false&fields=status,stdout,stderr,compile_output,time,memory`,
    { headers: getHeaders() }
  );
  return response.data;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const pollResult = async (token, maxRetries = 15, interval = 2000) => {
  for (let i = 0; i < maxRetries; i++) {
    const result = await getResult(token);
    const statusId = result.status?.id;

    // 1 = In Queue, 2 = Processing
    if (statusId !== 1 && statusId !== 2) {
      return result;
    }

    await sleep(interval);
  }

  throw new Error('Judge0 polling timeout: result not available after max retries');
};

/**
 * Judge0 status IDs:
 * 1 = In Queue, 2 = Processing, 3 = Accepted,
 * 4 = Wrong Answer, 5 = Time Limit Exceeded,
 * 6 = Compilation Error, 7-12 = Runtime Errors
 */
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

const evaluateSubmission = async (code, language, hiddenTestCases) => {
  const languageId = LANGUAGE_IDS[language];
  if (!languageId) {
    throw new Error(`Unsupported language: ${language}`);
  }

  let totalTime = 0;
  let earnedScore = 0;
  let passedCount = 0;
  const maxScore = hiddenTestCases.reduce((sum, tc) => sum + (tc.score || 1), 0);
  let finalStatus = 'AC';
  let failDetails = '';

  for (let i = 0; i < hiddenTestCases.length; i++) {
    const testCase = hiddenTestCases[i];
    const tcScore = testCase.score || 1;

    try {
      const token = await submitCode(code, languageId, testCase.input);
      const result = await pollResult(token);
      const statusId = result.status?.id;

      if (statusId === 6) {
        return {
          status: 'CE',
          executionTime: 0,
          score: earnedScore,
          maxScore,
          passedTestCases: passedCount,
          totalTestCases: hiddenTestCases.length,
          details: result.compile_output || 'Compilation error',
        };
      }

      if (statusId >= 7 && statusId <= 12) {
        if (finalStatus === 'AC') {
          finalStatus = 'RE';
          failDetails = result.stderr || 'Runtime error';
        }
        continue;
      }

      if (statusId === 5) {
        if (finalStatus === 'AC') {
          finalStatus = 'TLE';
          failDetails = 'Time limit exceeded';
        }
        continue;
      }

      const actualOutput = (result.stdout || '').trim();
      const expectedOutput = testCase.output.trim();

      if (actualOutput !== expectedOutput) {
        if (finalStatus === 'AC') {
          finalStatus = 'WA';
          failDetails = `Failed on test case ${i + 1}`;
        }
        continue;
      }

      earnedScore += tcScore;
      passedCount++;
      totalTime += parseFloat(result.time) || 0;
    } catch (error) {
      const statusCode = error.response?.status;
      const responseData = error.response?.data;
      console.error(`Judge0 error on test case ${i + 1}:`, {
        message: error.message,
        status: statusCode,
        data: responseData,
        url: process.env.JUDGE0_BASE_URL,
      });

      if (statusCode === 403) {
        throw new Error('Judge0 API returned 403 Forbidden. Check JUDGE0_BASE_URL and JUDGE0_API_KEY in .env');
      }
      if (statusCode === 429) {
        throw new Error('Judge0 API rate limit exceeded. Please wait and try again.');
      }

      if (finalStatus === 'AC') {
        finalStatus = 'RE';
        failDetails = `Execution error on test case ${i + 1}: ${error.message}`;
      }
    }
  }

  if (passedCount === hiddenTestCases.length) {
    finalStatus = 'AC';
  }

  return {
    status: finalStatus,
    executionTime: Math.round(totalTime * 1000) / 1000,
    score: earnedScore,
    maxScore,
    passedTestCases: passedCount,
    totalTestCases: hiddenTestCases.length,
    details: finalStatus === 'AC'
      ? `All ${hiddenTestCases.length} test cases passed (${earnedScore}/${maxScore} pts)`
      : `${failDetails} — passed ${passedCount}/${hiddenTestCases.length} (${earnedScore}/${maxScore} pts)`,
  };
};

module.exports = {
  LANGUAGE_IDS,
  submitCode,
  getResult,
  pollResult,
  evaluateSubmission,
  mapStatus,
};
