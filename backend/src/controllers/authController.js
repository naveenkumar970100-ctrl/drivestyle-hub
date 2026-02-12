const jwt = require('jsonwebtoken');
const { User, ROLES } = require('../models/User');
const { config } = require('../config/env');

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
};

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already in use' });
    const user = await User.create({ name, email, password, role: 'customer' });
    const token = generateToken(user);
    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (config.NODE_ENV !== 'production' && email === process.env.VITE_ADMIN_EMAIL && password === process.env.VITE_ADMIN_PASSWORD) {
      let admin = await User.findOne({ email });
      if (!admin) {
        admin = await User.create({ name: 'Admin', email, password, role: 'admin' });
      }
      const token = generateToken(admin);
      return res.json({
        user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
        token,
      });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const match = await user.matchPassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });
    const token = generateToken(user);
    res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login };
