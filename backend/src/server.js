const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { config } = require('./config/env');
const nodemailer = require('nodemailer');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { createUserByAdmin } = require('./controllers/userController');

const app = express();

const allowedOrigin = config.CLIENT_URL || 'http://localhost:8080';
const corsOrigins = [allowedOrigin, 'http://localhost:8080', 'http://localhost:8081', 'http://127.0.0.1:8080', 'http://127.0.0.1:8081'];
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(morgan('dev'));
app.use((req, res, next) => {
  console.log('REQ', req.method, req.path);
  next();
});

app.get('/api/health', (req, res) => {
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const dbState = states[mongoose.connection.readyState] || 'unknown';
  res.json({ status: 'ok', service: 'backend', env: config.NODE_ENV || 'development', db: dbState });
});
app.get('/__ping', (req, res) => res.json({ ok: true }));

app.get('/api/health/smtp', async (req, res) => {
  try {
    if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
      return res.status(400).json({ status: 'error', message: 'SMTP not configured' });
    }
    const transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: Number(config.SMTP_PORT || 587),
      secure: false,
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
    });
    await transporter.verify();
    res.json({ status: 'ok', service: 'smtp', provider: config.SMTP_HOST });
  } catch (err) {
    res.status(500).json({ status: 'error', service: 'smtp', message: err?.message || 'SMTP verify failed' });
  }
});

app.use('/api/bookings', bookingRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
if ((process.env.NODE_ENV || 'development') !== 'production') {
  app.post('/api/admin/create', createUserByAdmin);
  app.all('/api/users/admin/create', (req, res, next) => createUserByAdmin(req, res, next));
  app.all('/api/users/create', (req, res, next) => createUserByAdmin(req, res, next));
  app.post('/api/users', createUserByAdmin);
}

app.use(errorHandler);

const start = async () => {
  await connectDB();
  const port = config.PORT || 5000;
  app.listen(port, () => {
    console.log(`Backend API listening on http://localhost:${port}`);
    try {
      const paths = [];
      if (app._router && Array.isArray(app._router.stack)) {
        app._router.stack.forEach((m) => {
          if (m.route && m.route.path) paths.push(m.route.path);
          if (m.name === 'router' && m.handle && Array.isArray(m.handle.stack)) {
            m.handle.stack.forEach((h) => {
              if (h.route && h.route.path) paths.push(h.route.path);
            });
          }
        });
      }
      console.log('Registered paths:', paths.join(', '));
    } catch (e) { }
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
