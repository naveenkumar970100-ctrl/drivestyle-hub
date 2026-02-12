const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { config } = require('./config/env');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { createUserByAdmin } = require('./controllers/userController');

const app = express();

const allowedOrigin = config.CLIENT_URL || 'http://localhost:8080';
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());
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

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
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
    } catch (e) {}
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
