const express = require('express');
const { auth } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const { getAdminDashboard, getMerchantDashboard } = require('../controllers/dashboardController');

const router = express.Router();

if ((process.env.NODE_ENV || 'development') !== 'production') {
  router.get('/admin', getAdminDashboard);
  router.get('/merchant', getMerchantDashboard);
} else {
  router.get('/admin', auth, allowRoles('admin'), getAdminDashboard);
  router.get('/merchant', auth, allowRoles('merchant', 'admin'), getMerchantDashboard);
}

module.exports = router;
