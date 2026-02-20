const mongoose = require('mongoose');
const { DashboardStat } = require('../models/DashboardStat');
const { User } = require('../models/User');
const { Booking } = require('../models/Booking');

const isDbConnected = () => (mongoose.connection?.readyState || 0) === 1;

const computeAdminStats = async () => {
  if (!isDbConnected()) return { totalUsers: 0, activeBookings: 0, revenue: 0, onlineStaffCount: 0 };
  const totalUsers = await User.countDocuments({});
  const activeBookings = await Booking.countDocuments({ status: { $ne: 'COMPLETED' } });
  const revenueAgg = await Booking.aggregate([
    {
      $match: {
        $or: [
          { status: { $in: ['DELIVERED', 'COMPLETED'] } },
          { payments: { $exists: true, $ne: [] } },
        ],
      },
    },
    {
      $project: {
        revenue: {
          $ifNull: ['$billTotal', { $sum: '$payments.amount' }],
        },
      },
    },
    { $group: { _id: null, total: { $sum: '$revenue' } } },
  ]);
  const revenue = revenueAgg.length ? revenueAgg[0].total : 0;
  const onlineStaffCount = await User.countDocuments({ role: 'staff', staffOnline: true });
  return { totalUsers, activeBookings, revenue, onlineStaffCount };
};

const getAdminDashboard = async (req, res, next) => {
  try {
    const MAX_AGE_MS = 30000;
    if (!isDbConnected()) {
      return res.status(503).json({ ok: false, message: 'Database not connected', stats: { totalUsers: 0, activeBookings: 0, revenue: 0, onlineStaffCount: 0 } });
    }
    const existing = await DashboardStat.findOne({ scope: 'admin', period: 'overall' });
    if (existing && existing.updatedAt && Date.now() - existing.updatedAt.getTime() < MAX_AGE_MS) {
      return res.json({ ok: true, stats: existing.data || {}, updatedAt: existing.updatedAt });
    }
    const data = await computeAdminStats();
    const doc = await DashboardStat.findOneAndUpdate(
      { scope: 'admin', period: 'overall' },
      { $set: { data } },
      { upsert: true, new: true }
    );
    res.json({ ok: true, stats: doc.data, updatedAt: doc.updatedAt });
  } catch (err) {
    next(err);
  }
};

const computeMerchantStats = async (merchantId) => {
  if (!isDbConnected()) return { activeServices: 0, totalBookings: 0, earnings: 0, ratingAvg: null, ratingCount: 0 };
  const mid = new mongoose.Types.ObjectId(String(merchantId));
  const totalBookings = await Booking.countDocuments({ merchantId: mid });
  const activeServices = await Booking.countDocuments({ merchantId: mid, status: { $nin: ['DELIVERED', 'COMPLETED'] } });
  const earningsAgg = await Booking.aggregate([
    {
      $match: {
        merchantId: mid,
        $or: [
          { status: { $in: ['DELIVERED', 'COMPLETED'] } },
          { payments: { $exists: true, $ne: [] } },
        ],
      },
    },
    {
      $project: {
        revenue: {
          $ifNull: ['$billTotal', { $sum: '$payments.amount' }],
        },
      },
    },
    { $group: { _id: null, total: { $sum: '$revenue' } } },
  ]);
  const earnings = earningsAgg.length ? earningsAgg[0].total : 0;
  const ratings = await Booking.aggregate([
    { $match: { merchantId: mid, ratingValue: { $type: 'number' } } },
    { $group: { _id: null, avg: { $avg: '$ratingValue' }, count: { $sum: 1 } } },
  ]);
  const ratingAvg = ratings.length ? ratings[0].avg : null;
  const ratingCount = ratings.length ? ratings[0].count : 0;
  return { activeServices, totalBookings, earnings, ratingAvg, ratingCount };
};

const getMerchantDashboard = async (req, res, next) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({ ok: false, message: 'Database not connected', stats: { activeServices: 0, totalBookings: 0, earnings: 0, ratingAvg: null, ratingCount: 0 } });
    }
    const merchantId = req.user?.id || req.query.merchantId;
    if (!merchantId) {
      const totalBookings = await Booking.countDocuments({});
      const activeServices = await Booking.countDocuments({ status: { $nin: ['DELIVERED', 'COMPLETED'] } });
      const earningsAgg = await Booking.aggregate([
        {
          $match: {
            $or: [
              { status: { $in: ['DELIVERED', 'COMPLETED'] } },
              { payments: { $exists: true, $ne: [] } },
            ],
          },
        },
        {
          $project: {
            revenue: {
              $ifNull: ['$billTotal', { $sum: '$payments.amount' }],
            },
          },
        },
        { $group: { _id: null, total: { $sum: '$revenue' } } },
      ]);
      const earnings = earningsAgg.length ? earningsAgg[0].total : 0;
      const ratings = await Booking.aggregate([
        { $match: { ratingValue: { $type: 'number' } } },
        { $group: { _id: null, avg: { $avg: '$ratingValue' }, count: { $sum: 1 } } },
      ]);
      const ratingAvg = ratings.length ? ratings[0].avg : null;
      const ratingCount = ratings.length ? ratings[0].count : 0;
      return res.json({ ok: true, stats: { activeServices, totalBookings, earnings, ratingAvg, ratingCount }, updatedAt: new Date() });
    }
    const MAX_AGE_MS = 30000;
    const existing = await DashboardStat.findOne({ scope: 'merchant', merchantId: merchantId, period: 'overall' });
    if (existing && existing.updatedAt && Date.now() - existing.updatedAt.getTime() < MAX_AGE_MS) {
      return res.json({ ok: true, stats: existing.data || {}, updatedAt: existing.updatedAt });
    }
    const data = await computeMerchantStats(merchantId);
    const doc = await DashboardStat.findOneAndUpdate(
      { scope: 'merchant', merchantId: merchantId, period: 'overall' },
      { $set: { data } },
      { upsert: true, new: true }
    );
    res.json({ ok: true, stats: doc.data, updatedAt: doc.updatedAt });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAdminDashboard, getMerchantDashboard };
