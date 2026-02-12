const { config } = require('./config/env');
const { connectDB } = require('./config/db');
const { User } = require('./models/User');

const ADMIN_EMAIL = process.env.VITE_ADMIN_EMAIL || 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.VITE_ADMIN_PASSWORD || 'Admin@123';

const users = [
  { name: 'Admin', email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' },
  { name: 'Staff', email: 'staff@gmail.com', password: 'Staff@123', role: 'staff' },
  { name: 'Merchant', email: 'merchant@gmail.com', password: 'Merchant@123', role: 'merchant' },
  { name: 'Customer', email: 'customer@gmail.com', password: 'Customer@123', role: 'customer' },
];

const run = async () => {
  if (!config.MONGO_URI) {
    console.error('MONGO_URI not set. Create backend/.env and add MONGO_URI');
    process.exit(1);
  }
  await connectDB();
  for (const u of users) {
    const exists = await User.findOne({ email: u.email });
    if (exists) {
      console.log('Exists:', u.email);
    } else {
      await User.create(u);
      console.log('Seeded:', u.email);
    }
  }
  process.exit(0);
};

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});

