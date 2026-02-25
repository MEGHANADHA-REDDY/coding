require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existingAdmin = await User.findOne({ email: 'admin@college.edu' });
    if (existingAdmin) {
      console.log('Admin user already exists. Skipping seed.');
      process.exit(0);
    }

    const admin = await User.create({
      name: 'Admin',
      email: 'admin@college.edu',
      password: 'admin123',
      role: 'admin',
    });

    console.log(`Admin user created: ${admin.email}`);
    console.log('Default credentials: admin@college.edu / admin123');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedAdmin();
