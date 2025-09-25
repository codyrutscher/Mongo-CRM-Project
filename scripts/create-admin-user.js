require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@prosperecrm.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      email: 'admin@prosperecrm.com',
      password: 'Admin123!',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@prosperecrm.com');
    console.log('🔑 Password: Admin123!');
    console.log('⚠️  Please change the password after first login');

    // Create demo user
    const demoUser = new User({
      email: 'demo@prosperecrm.com',
      password: 'Demo123!',
      firstName: 'Demo',
      lastName: 'User',
      role: 'user'
    });

    await demoUser.save();
    console.log('✅ Demo user created successfully!');
    console.log('📧 Email: demo@prosperecrm.com');
    console.log('🔑 Password: Demo123!');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createAdminUser();