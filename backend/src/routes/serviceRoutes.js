const express = require('express');
const { auth } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const { listServices, createService, updateService, deleteService } = require('../controllers/serviceController');

const router = express.Router();

// Publicly available to customers for booking
router.get('/', listServices);

// Admin only routes for managing services
const inProd = (process.env.NODE_ENV || 'development') === 'production';

if (inProd) {
  router.post('/', auth, allowRoles('admin'), createService);
  router.patch('/:id', auth, allowRoles('admin'), updateService);
  router.delete('/:id', auth, allowRoles('admin'), deleteService);
} else {
  router.post('/', createService);
  router.patch('/:id', updateService);
  router.delete('/:id', deleteService);
}

module.exports = router;
