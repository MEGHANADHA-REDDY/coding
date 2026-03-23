const { validationResult } = require('express-validator');
const User = require('../models/User');
const Problem = require('../models/Problem');
const Exam = require('../models/Exam');
const Submission = require('../models/Submission');
const Violation = require('../models/Violation');
const { parseFile } = require('../utils/csvParser');
const { notifyStudentsOfExam } = require('../services/notification');

// ── Students ──

exports.createStudent = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, rollNumber, batch, mobileNumber } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const student = await User.create({
      name,
      email,
      password,
      rollNumber,
      batch: batch || '',
      mobileNumber: mobileNumber || '',
      role: 'student',
    });

    res.status(201).json({ message: 'Student created successfully.', student });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ error: 'Failed to create student.' });
  }
};

exports.bulkUploadStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV/Excel file is required.' });
    }

    const rows = await parseFile(req.file);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'File is empty.' });
    }

    const results = { created: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      if (!row.name || !row.email || !row.password || !row.rollnumber) {
        results.errors.push({
          row: rowNum,
          error: 'Missing required fields (name, email, password, rollnumber)',
        });
        continue;
      }

      try {
        const existing = await User.findOne({ email: row.email.toString().trim().toLowerCase() });
        if (existing) {
          results.errors.push({ row: rowNum, error: `Email ${row.email} already exists` });
          continue;
        }

        await User.create({
          name: row.name.toString().trim(),
          email: row.email.toString().trim().toLowerCase(),
          password: row.password.toString(),
          rollNumber: row.rollnumber.toString().trim(),
          batch: (row.batch || '').toString().trim(),
          mobileNumber: (row.mobilenumber || row.mobile || '').toString().trim(),
          role: 'student',
        });

        results.created++;
      } catch (err) {
        results.errors.push({ row: rowNum, error: err.message });
      }
    }

    res.json({
      message: `Bulk upload complete. ${results.created} students created.`,
      ...results,
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ error: 'Failed to process file upload.' });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const filter = { role: 'student' };

    if (req.query.batch) {
      filter.batch = { $regex: new RegExp(req.query.batch, 'i') };
    }

    const students = await User.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 });

    res.json({ students });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, rollNumber, batch, mobileNumber, password } = req.body;

    const student = await User.findById(id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ error: 'Student not found.' });
    }

    if (email && email !== student.email) {
      const existing = await User.findOne({ email, _id: { $ne: id } });
      if (existing) {
        return res.status(409).json({ error: 'Email already in use by another user.' });
      }
      student.email = email;
    }

    if (name !== undefined) student.name = name;
    if (rollNumber !== undefined) student.rollNumber = rollNumber;
    if (batch !== undefined) student.batch = batch;
    if (mobileNumber !== undefined) student.mobileNumber = mobileNumber;
    if (password && password.length >= 6) student.password = password;

    await student.save();

    res.json({ message: 'Student updated successfully.', student });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ error: 'Failed to update student.' });
  }
};

exports.getStudentBatches = async (req, res) => {
  try {
    const batches = await User.distinct('batch', { role: 'student', batch: { $ne: '' } });
    res.json({ batches: batches.sort() });
  } catch (error) {
    console.error('Get batches error:', error);
    res.status(500).json({ error: 'Failed to fetch batches.' });
  }
};

// ── Problems ──

exports.createProblem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      type, title, description, constraints, difficulty,
      company, level, boilerplateCode,
      sampleTestCases, hiddenTestCases,
      options, correctAnswer,
    } = req.body;

    const problem = await Problem.create({
      type: type || 'coding',
      title,
      description,
      constraints,
      difficulty,
      company: company || '',
      level: level || '',
      boilerplateCode: boilerplateCode || '',
      sampleTestCases: sampleTestCases || [],
      hiddenTestCases: hiddenTestCases || [],
      options: options || {},
      correctAnswer: correctAnswer || '',
      createdBy: req.user.id,
    });

    res.status(201).json({ message: 'Problem created successfully.', problem });
  } catch (error) {
    console.error('Create problem error:', error);
    res.status(500).json({ error: 'Failed to create problem.' });
  }
};

exports.bulkUploadProblems = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV/Excel file is required.' });
    }

    const rows = await parseFile(req.file);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'File is empty.' });
    }

    const results = { created: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const isMCQ = row.optiona || row.optionb || row.optionc || row.optiond;

        if (isMCQ) {
          if (!row.question && !row.title) {
            results.errors.push({ row: rowNum, error: 'Missing question/title' });
            continue;
          }
          if (!row.optiona || !row.optionb || !row.optionc || !row.optiond) {
            results.errors.push({ row: rowNum, error: 'All 4 options (A-D) required for MCQ' });
            continue;
          }
          if (!row.correctanswer) {
            results.errors.push({ row: rowNum, error: 'correctAnswer required for MCQ' });
            continue;
          }

          await Problem.create({
            type: 'mcq',
            title: (row.question || row.title || '').toString().trim(),
            description: (row.question || row.title || '').toString().trim(),
            difficulty: (row.difficulty || 'easy').toString().trim().toLowerCase(),
            company: (row.company || '').toString().trim(),
            level: (row.level || '').toString().trim(),
            options: {
              a: row.optiona.toString().trim(),
              b: row.optionb.toString().trim(),
              c: row.optionc.toString().trim(),
              d: row.optiond.toString().trim(),
            },
            correctAnswer: row.correctanswer.toString().trim().toLowerCase(),
            createdBy: req.user.id,
          });
        } else {
          if (!row.title) {
            results.errors.push({ row: rowNum, error: 'Missing title for coding problem' });
            continue;
          }

          const hiddenTestCases = [];
          const sampleTestCases = [];

          if (row.sampleinput !== undefined || row.sampleoutput !== undefined) {
            sampleTestCases.push({
              input: (row.sampleinput || '').toString(),
              output: (row.sampleoutput || '').toString(),
            });
          }

          if (row.hiddeninput !== undefined || row.hiddenoutput !== undefined) {
            hiddenTestCases.push({
              input: (row.hiddeninput || '').toString(),
              output: (row.hiddenoutput || '').toString(),
            });
          }

          // Support multiple test cases: hiddeninput1, hiddenoutput1, hiddeninput2, ...
          for (let n = 1; n <= 20; n++) {
            const hi = row[`hiddeninput${n}`];
            const ho = row[`hiddenoutput${n}`];
            if (hi !== undefined || ho !== undefined) {
              hiddenTestCases.push({
                input: (hi || '').toString(),
                output: (ho || '').toString(),
              });
            }
            const si = row[`sampleinput${n}`];
            const so = row[`sampleoutput${n}`];
            if (si !== undefined || so !== undefined) {
              sampleTestCases.push({
                input: (si || '').toString(),
                output: (so || '').toString(),
              });
            }
          }

          if (hiddenTestCases.length === 0) {
            results.errors.push({ row: rowNum, error: 'At least one hidden test case required for coding' });
            continue;
          }

          await Problem.create({
            type: 'coding',
            title: row.title.toString().trim(),
            description: (row.description || '').toString().trim(),
            difficulty: (row.difficulty || 'easy').toString().trim().toLowerCase(),
            company: (row.company || '').toString().trim(),
            level: (row.level || '').toString().trim(),
            boilerplateCode: (row.boilerplatecode || row.boilerplate || '').toString(),
            sampleTestCases,
            hiddenTestCases,
            createdBy: req.user.id,
          });
        }

        results.created++;
      } catch (err) {
        results.errors.push({ row: rowNum, error: err.message });
      }
    }

    res.json({
      message: `Bulk upload complete. ${results.created} problems created.`,
      ...results,
    });
  } catch (error) {
    console.error('Bulk upload problems error:', error);
    res.status(500).json({ error: 'Failed to process file upload.' });
  }
};

exports.getProblems = async (req, res) => {
  try {
    const filter = {};

    if (req.query.type) filter.type = req.query.type;
    if (req.query.company) filter.company = { $regex: new RegExp(req.query.company, 'i') };
    if (req.query.level) filter.level = { $regex: new RegExp(req.query.level, 'i') };
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;

    const problems = await Problem.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ problems });
  } catch (error) {
    console.error('Get problems error:', error);
    res.status(500).json({ error: 'Failed to fetch problems.' });
  }
};

exports.getProblemFilters = async (req, res) => {
  try {
    const [companies, levels, types] = await Promise.all([
      Problem.distinct('company', { company: { $ne: '' } }),
      Problem.distinct('level', { level: { $ne: '' } }),
      Problem.distinct('type'),
    ]);
    res.json({
      companies: companies.sort(),
      levels: levels.sort(),
      types: types.sort(),
    });
  } catch (error) {
    console.error('Get problem filters error:', error);
    res.status(500).json({ error: 'Failed to fetch filters.' });
  }
};

exports.getProblemById = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id).populate('createdBy', 'name email');

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    res.json({ problem });
  } catch (error) {
    console.error('Get problem error:', error);
    res.status(500).json({ error: 'Failed to fetch problem.' });
  }
};

exports.updateProblem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const problem = await Problem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!problem) {
      return res.status(404).json({ error: 'Problem not found.' });
    }

    res.json({ message: 'Problem updated successfully.', problem });
  } catch (error) {
    console.error('Update problem error:', error);
    res.status(500).json({ error: 'Failed to update problem.' });
  }
};

// ── Exams ──

exports.createExam = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title, startTime, endTime, sections, allowedStudents, maxViolations,
    } = req.body;

    const exam = await Exam.create({
      title,
      startTime,
      endTime,
      sections,
      allowedStudents,
      maxViolations: maxViolations || 3,
    });

    notifyStudentsOfExam(exam, allowedStudents);

    res.status(201).json({ message: 'Exam created successfully.', exam });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({ error: 'Failed to create exam.' });
  }
};

exports.getExams = async (req, res) => {
  try {
    const exams = await Exam.find()
      .populate('sections.problems', 'title difficulty type')
      .populate('allowedStudents', 'name email rollNumber batch')
      .sort({ createdAt: -1 });

    res.json({ exams });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ error: 'Failed to fetch exams.' });
  }
};

exports.updateExam = async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found.' });
    }

    res.json({ message: 'Exam updated successfully.', exam });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({ error: 'Failed to update exam.' });
  }
};

// ── Submissions & Violations (Admin View) ──

exports.getSubmissions = async (req, res) => {
  try {
    const filter = {};
    if (req.query.examId) filter.examId = req.query.examId;
    if (req.query.studentId) filter.studentId = req.query.studentId;

    const submissions = await Submission.find(filter)
      .populate('examId', 'title')
      .populate('problemId', 'title type')
      .populate('studentId', 'name email rollNumber')
      .sort({ createdAt: -1 });

    res.json({ submissions });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions.' });
  }
};

exports.getViolations = async (req, res) => {
  try {
    const filter = {};
    if (req.query.examId) filter.examId = req.query.examId;
    if (req.query.studentId) filter.studentId = req.query.studentId;

    const violations = await Violation.find(filter)
      .populate('examId', 'title')
      .populate('studentId', 'name email rollNumber')
      .sort({ timestamp: -1 });

    res.json({ violations });
  } catch (error) {
    console.error('Get violations error:', error);
    res.status(500).json({ error: 'Failed to fetch violations.' });
  }
};
