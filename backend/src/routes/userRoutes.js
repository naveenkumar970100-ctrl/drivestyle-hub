const express = require('express');
const { auth } = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const { getMe, listUsers, createUserByAdmin, lookupVehicle } = require('../controllers/userController');

const router = express.Router();

router.get('/me', auth, getMe);
router.get('/', auth, allowRoles('admin'), listUsers);
router.get('/test', (req, res) => res.json({ ok: true }));
router.get('/ping', (req, res) => res.json({ ok: true }));
router.get('/vehicles/lookup', lookupVehicle);
if (process.env.NODE_ENV !== 'production') {
  router.post('/admin/create', createUserByAdmin);
  router.post('/create', createUserByAdmin);
} else {
  router.post('/admin/create', auth, allowRoles('admin'), createUserByAdmin);
}

module.exports = router;
