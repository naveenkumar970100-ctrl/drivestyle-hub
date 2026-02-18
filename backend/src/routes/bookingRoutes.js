const express = require('express');
const { auth } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const { createBooking, listBookings, patchBooking, deleteBooking } = require('../controllers/bookingController');

const router = express.Router();

if ((process.env.NODE_ENV || 'development') !== 'production') {
  router.post('/', createBooking);
  router.get('/', listBookings);
  router.patch('/:id', patchBooking);
  router.delete('/:id', deleteBooking);
} else {
  router.post('/', auth, allowRoles('customer'), createBooking);
  router.get('/', auth, listBookings);
  router.patch('/:id', auth, patchBooking);
  router.delete('/:id', auth, allowRoles('admin'), deleteBooking);
}

module.exports = router;
