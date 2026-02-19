const express = require('express');
const { auth } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const { getMe, listUsers, createUserByAdmin, deleteUserByAdmin, updateUserLocationByAdmin, lookupVehicle, createVehicle, listVehicles, deleteVehicle, setStaffOnline, setMyLocation, updateMeProfile } = require('../controllers/userController');

const router = express.Router();

router.get('/me', auth, getMe);
router.patch('/me', auth, updateMeProfile);
router.patch('/me/online', auth, setStaffOnline);
router.patch('/me/location', auth, setMyLocation);
if (process.env.NODE_ENV !== 'production') {
  router.get('/', listUsers);
} else {
  router.get('/', auth, allowRoles('admin'), listUsers);
}
router.get('/test', (req, res) => res.json({ ok: true }));
router.get('/ping', (req, res) => res.json({ ok: true }));
router.get('/vehicles/lookup', lookupVehicle);
if (process.env.NODE_ENV !== 'production') {
  router.post('/admin/create', createUserByAdmin);
  router.post('/create', createUserByAdmin);
  router.get('/vehicles', listVehicles);
  router.post('/vehicles', createVehicle);
  router.delete('/vehicles/:id', deleteVehicle);
  router.patch('/:id/location', updateUserLocationByAdmin);
  router.delete('/:id', deleteUserByAdmin);
} else {
  router.post('/admin/create', auth, allowRoles('admin'), createUserByAdmin);
  router.get('/vehicles', auth, allowRoles('customer'), listVehicles);
  router.post('/vehicles', auth, allowRoles('customer'), createVehicle);
  router.delete('/vehicles/:id', auth, allowRoles('customer'), deleteVehicle);
  router.patch('/:id/location', auth, allowRoles('admin'), updateUserLocationByAdmin);
  router.delete('/:id', auth, allowRoles('admin'), deleteUserByAdmin);
}

module.exports = router;
