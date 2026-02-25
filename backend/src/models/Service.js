const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    desc: { type: String },
    price: { type: Number, required: true },
    vehicleType: { type: String, enum: ['car', 'bike'], required: true },
    category: { type: String }, // e.g., 'Periodic Service', 'General Service'
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Service = mongoose.models.Service || mongoose.model('Service', serviceSchema);

module.exports = { Service };
