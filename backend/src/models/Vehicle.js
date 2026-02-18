const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    ownerEmail: { type: String, required: true, lowercase: true },
    type: { type: String, enum: ['car', 'bike'], required: true },
    make: { type: String },
    model: { type: String },
    year: { type: String },
    engine: { type: String },
    displacement: { type: String },
    power_hp: { type: String },
    vin: { type: String },
    plate: { type: String, required: true },
  },
  { timestamps: true }
);

const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', vehicleSchema);

module.exports = { Vehicle };
