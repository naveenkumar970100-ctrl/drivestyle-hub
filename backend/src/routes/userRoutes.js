const express = require('express');
const { auth } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const { getMe, listUsers, createUserByAdmin, deleteUserByAdmin, lookupVehicle } = require('../controllers/userController');

const router = express.Router();

router.get('/me', auth, getMe);
router.get('/', auth, allowRoles('admin'), listUsers);
router.get('/test', (req, res) => res.json({ ok: true }));
router.get('/ping', (req, res) => res.json({ ok: true }));
router.get('/vehicles/lookup', lookupVehicle);
if (process.env.NODE_ENV !== 'production') {
  router.post('/admin/create', createUserByAdmin);
  router.post('/create', createUserByAdmin);
  router.delete('/:id', deleteUserByAdmin);
} else {
  router.post('/admin/create', auth, allowRoles('admin'), createUserByAdmin);
  router.delete('/:id', auth, allowRoles('admin'), deleteUserByAdmin);
}

module.exports = router;
