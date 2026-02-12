const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const tryLoad = (p) => {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: true });
  }
};

tryLoad(path.resolve(__dirname, '../../.env'));
tryLoad(path.resolve(__dirname, '../../../.env'));
tryLoad(path.resolve(__dirname, '../../../.env.local'));

const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || '',
  MONGO_DNS_SERVERS: process.env.MONGO_DNS_SERVERS || '',
  MONGO_IPV4_FIRST: process.env.MONGO_IPV4_FIRST || 'true',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_change_me',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:8080',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: process.env.SMTP_PORT || '',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || '',
  RAPIDAPI_KEY: process.env.RAPIDAPI_KEY || '',
  RAPIDAPI_HOST: process.env.RAPIDAPI_HOST || 'trueway-geocoding.p.rapidapi.com',
};

module.exports = { config };
