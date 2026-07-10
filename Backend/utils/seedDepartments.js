// Run with: npm run seed
// Populates initial departments and one test officer + one test admin account.
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Department = require('../models/Department');
const User = require('../models/User');

const departments = [
  { name: 'Water Department', categoriesHandled: ['Water Supply'] },
  { name: 'Public Works Department', categoriesHandled: ['Roads'] },
  { name: 'Electricity Department', categoriesHandled: ['Electricity'] },
  { name: 'Sanitation Department', categoriesHandled: ['Sanitation'] },
  { name: 'Electrical (Street Lighting)', categoriesHandled: ['Streetlights'] },
  { name: 'Public Health Department', categoriesHandled: ['Public Health'] },
  { name: 'General Administration', categoriesHandled: ['Other'] },
];

const seed = async () => {
  await connectDB();

  console.log('Seeding departments...');
  for (const dept of departments) {
    await Department.findOneAndUpdate({ name: dept.name }, dept, { upsert: true, new: true });
  }
  console.log(`✅ ${departments.length} departments seeded.`);

  const waterDept = await Department.findOne({ name: 'Water Department' });

  const officerExists = await User.findOne({ email: 'officer@urbanspire.ai' });
  if (!officerExists) {
    await User.create({
      name: 'Test Officer',
      email: 'officer@urbanspire.ai',
      password: 'officer123', // will be hashed automatically
      mobile: '9876543210',
      role: 'officer',
      department: waterDept._id,
      designation: 'Junior Engineer',
    });
    console.log('✅ Test officer created -> email: officer@urbanspire.ai / password: officer123');
  } else {
    console.log('ℹ️  Test officer already exists.');
  }

  const adminExists = await User.findOne({ email: 'admin@urbanspire.ai' });
  if (!adminExists) {
    await User.create({
      name: 'Test Admin',
      email: 'admin@urbanspire.ai',
      password: 'admin123',
      mobile: '9876500000',
      role: 'admin',
      designation: 'Municipal Commissioner',
    });
    console.log('✅ Test admin created -> email: admin@urbanspire.ai / password: admin123');
  } else {
    console.log('ℹ️  Test admin already exists.');
  }

  const commissionerExists = await User.findOne({ email: 'commissioner@urbanspire.ai' });
  if (!commissionerExists) {
    await User.create({
      name: 'Test Commissioner',
      email: 'commissioner@urbanspire.ai',
      password: 'commissioner123',
      mobile: '9876511111',
      role: 'commissioner',
      designation: 'Municipal Commissioner',
    });
    console.log('✅ Test commissioner created -> email: commissioner@urbanspire.ai / password: commissioner123');
  } else {
    console.log('ℹ️  Test commissioner already exists.');
  }

  console.log('🎉 Seeding complete.');
  mongoose.connection.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
