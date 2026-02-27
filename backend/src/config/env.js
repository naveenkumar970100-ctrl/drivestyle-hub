const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: true });
  }
}
// Retry load with UTF-16LE encoding if nothing was injected
if (!process.env.MONGO_URI && !process.env.MONGODB_URI && !process.env.DATABASE_URL && !process.env.ATLAS_URI) {
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      try {
        dotenv.config({ path: p, override: true, encoding: 'utf16le' });
      } catch {}
    }
  }
}

const pick = (...vals) => {
  for (const v of vals) {
    if (v && typeof v === 'string') {
      const s = v.trim();
      if (s) return s.replace(/^['"]|['"]$/g, '');
    }
  }
  return '';
};
// Fallback manual parse in case dotenv fails to inject variables (e.g., encoding/formatting issues)
if (!process.env.MONGO_URI && !process.env.MONGODB_URI && !process.env.DATABASE_URL && !process.env.ATLAS_URI) {
  for (const p of envPaths) {
    if (!fs.existsSync(p)) continue;
    try {
      const readText = (filePath) => {
        const buf = fs.readFileSync(filePath);
        // Heuristics: detect UTF-16 by BOM or abundance of NUL bytes
        const nulCount = buf.reduce((acc, b) => acc + (b === 0 ? 1 : 0), 0);
        if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
          return buf.toString('utf16le').replace(/^\uFEFF/, '');
        }
        if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
          const swapped = Buffer.from(buf);
          swapped.swap16();
          return swapped.toString('utf16le').replace(/^\uFEFF/, '');
        }
        if (nulCount > Math.max(8, buf.length * 0.1)) {
          // likely UTF-16LE without BOM
          return buf.toString('utf16le').replace(/^\uFEFF/, '');
        }
        // UTF-8 (with or without BOM)
        return buf.toString('utf8').replace(/^\uFEFF/, '');
      };
      const raw = readText(p);
      // diagnostic: count parsed keys without revealing values
      let count = 0;
      raw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))
        .forEach((l) => {
          let idx = l.indexOf('=');
          if (idx < 0) idx = l.indexOf('\uFF1D'); // fullwidth equals
          if (idx > 0) {
            const k = l.slice(0, idx).trim();
            const v = l.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
            if (!process.env[k]) process.env[k] = v;
            count++;
          }
        });
      // eslint-disable-next-line no-console
      console.log(`Loaded ${count} .env entries from ${p}`);
    } catch {}
  }
}
const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  MONGO_URI: pick(
    process.env.MONGO_URI,
    process.env.MONGODB_URI,
    process.env.DATABASE_URL,
    process.env.ATLAS_URI
  ),
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
