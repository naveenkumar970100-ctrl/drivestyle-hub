const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env');

function readBuffer(p) {
  return fs.readFileSync(p);
}

function decodeBuffer(buf) {
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
    return buf.toString('utf16le').replace(/^\uFEFF/, '');
  }
  return buf.toString('utf8').replace(/^\uFEFF/, '');
}

function normalize(text) {
  // Replace exotic equals signs with ASCII '='
  text = text.replace(/\uFF1D/g, '=');
  // Remove zero-width spaces and non-breaking spaces around keys
  text = text.replace(/\u200B|\u200C|\u200D|\u00A0/g, '');
  // Normalize line endings to LF
  text = text.replace(/\r\n?/g, '\n');
  // Trim leading/trailing spaces on each line so "   KEY=VAL" -> "KEY=VAL"
  text = text
    .split('\n')
    .map((l) => l.replace(/^[ \t]+/g, '').replace(/[ \t]+$/g, ''))
    .join('\n');
  return text;
}

function countKeys(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes('=')).length;
}

(function main() {
  if (!fs.existsSync(envPath)) {
    console.error('No .env found at', envPath);
    process.exit(1);
  }
  const buf = readBuffer(envPath);
  const decoded = decodeBuffer(buf);
  const fixed = normalize(decoded);
  const keys = countKeys(fixed);
  fs.writeFileSync(envPath, fixed, { encoding: 'utf8' });
  console.log('Normalized .env to UTF-8. Detected keys:', keys);
})(); 
