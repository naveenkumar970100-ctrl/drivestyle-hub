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
    user.tokens = Array.isArray(user.tokens) ? user.tokens : [];
    user.tokens.push({ token });
    await user.save();
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
    if ((config.NODE_ENV || 'development') !== 'production') {
      const defaults = [
        { email: process.env.VITE_ADMIN_EMAIL || 'admin@gmail.com', password: process.env.VITE_ADMIN_PASSWORD || 'Admin@123', role: 'admin', name: 'Admin' },
        { email: 'staff@gmail.com', password: 'Staff@123', role: 'staff', name: 'Staff' },
        { email: 'merchant@gmail.com', password: 'Merchant@123', role: 'merchant', name: 'Merchant' },
        { email: 'customer@gmail.com', password: 'Customer@123', role: 'customer', name: 'Customer' },
      ];
      const matchDefault = defaults.find((d) => d.email === email && d.password === password);
      if (matchDefault) {
        let u = await User.findOne({ email: matchDefault.email });
        if (!u) {
          u = await User.create({ name: matchDefault.name, email: matchDefault.email, password: matchDefault.password, role: matchDefault.role });
        }
        const token = generateToken(u);
        u.tokens = Array.isArray(u.tokens) ? u.tokens : [];
        u.tokens.push({ token });
        await u.save();
        return res.json({
          user: { id: u._id, name: u.name, email: u.email, role: u.role },
          token,
        });
      }
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const match = await user.matchPassword(password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });
    const token = generateToken(user);
    user.tokens = Array.isArray(user.tokens) ? user.tokens : [];
    user.tokens.push({ token });
    await user.save();
    res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login };
