const mongoose = require('mongoose');
const dns = require('dns');
const { config } = require('./env');

const connectDB = async () => {
  if (!config.MONGO_URI) {
    console.warn('MONGO_URI not set. Skipping DB connection; using in-memory operations only.');
    return;
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
