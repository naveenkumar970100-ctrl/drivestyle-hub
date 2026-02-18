const mongoose = require('mongoose');

const DashboardStatSchema = new mongoose.Schema(
  {
    scope: { type: String, enum: ['admin', 'merchant', 'staff'], required: true },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    period: { type: String, default: 'overall' },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

DashboardStatSchema.index({ scope: 1, merchantId: 1, staffId: 1, period: 1 }, { unique: true, sparse: true });

const DashboardStat = mongoose.model('DashboardStat', DashboardStatSchema);

module.exports = { DashboardStat };
