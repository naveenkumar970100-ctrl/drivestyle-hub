const express = require('express');
const { register, login } = require('../controllers/authController');
const { createUserByAdmin } = require('../controllers/userController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
if ((process.env.NODE_ENV || 'development') !== 'production') {
  router.post('/admin/create', createUserByAdmin);
}

module.exports = router;
