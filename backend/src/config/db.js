const mongoose = require('mongoose');
const dns = require('dns');
const { config } = require('./env');

const connectDB = async () => {
  if (!config.MONGO_URI) {
    console.error('MONGO_URI not set. Aborting startup because MongoDB is required.');
    process.exit(1);
  }
  try {
    if (config.MONGO_DNS_SERVERS) {
      dns.setServers(config.MONGO_DNS_SERVERS.split(',').map((s) => s.trim()));
    }
    if (config.MONGO_IPV4_FIRST === 'true') {
      dns.setDefaultResultOrder?.('ipv4first');
    }
    await mongoose.connect(config.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
  }
};

module.exports = { connectDB };
