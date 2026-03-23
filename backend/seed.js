require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Problem = require('./models/Problem');
const Exam = require('./models/Exam');
const ExamSession = require('./models/ExamSession');
const Submission = require('./models/Submission');
const Violation = require('./models/Violation');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB:', mongoose.connection.host);

    console.log('\nSyncing indexes for all collections...');
    await User.syncIndexes();
    console.log('  - Users: indexes synced');
    await Problem.syncIndexes();
    console.log('  - Problems: indexes synced');
    await Exam.syncIndexes();
    console.log('  - Exams: indexes synced');
    await ExamSession.syncIndexes();
    console.log('  - ExamSessions: indexes synced');
    await Submission.syncIndexes();
    console.log('  - Submissions: indexes synced');
    await Violation.syncIndexes();
    console.log('  - Violations: indexes synced');

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\nCollections in database: ${collections.map(c => c.name).join(', ')}`);

    const existingAdmin = await User.findOne({ email: 'admin@college.edu' });
    if (existingAdmin) {
      console.log('\nAdmin user already exists. Skipping admin seed.');
    } else {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@college.edu',
        password: 'admin123',
        role: 'admin',
      });
      console.log(`\nAdmin user created: ${admin.email}`);
      console.log('Default credentials: admin@college.edu / admin123');
    }

    const counts = {
      users: await User.countDocuments(),
      problems: await Problem.countDocuments(),
      exams: await Exam.countDocuments(),
      sessions: await ExamSession.countDocuments(),
      submissions: await Submission.countDocuments(),
      violations: await Violation.countDocuments(),
    };
    console.log('\nDocument counts:', counts);
    console.log('\nSetup complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
};

seed();
