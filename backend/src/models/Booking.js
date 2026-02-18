const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    customerEmail: { type: String, required: true, lowercase: true },
    customerPhone: { type: String },
    vehicle: { type: String, enum: ['car', 'bike'], required: true },
    service: { type: String, required: true },
    location: {
      formatted: { type: String },
      lat: { type: Number },
      lng: { type: Number },
    },
    date: { type: String },
    time: { type: String },
    status: {
      type: String,
      enum: [
        'PENDING_ASSIGNMENT',
        'ASSIGNED',
        'PICKUP_CONFIRMED',
        'IN_TRANSIT',
        'AT_SERVICE_CENTER',
        'WAITING_APPROVAL',
        'SERVICE_IN_PROGRESS',
        'REVISION_REQUIRED',
        'READY_FOR_DELIVERY',
        'DELIVERED',
        'COMPLETED',
      ],
      default: 'PENDING_ASSIGNMENT',
    },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    repairNotes: { type: String },
    photosBefore: [{ type: String }],
    photosAfter: [{ type: String }],
    photosReturn: [{ type: String }],
    estimateLabour: { type: Number },
    estimateParts: { type: Number },
    estimateAdditional: { type: Number },
    estimateTotal: { type: Number },
    registration: { type: String },
    billInvoiceNumber: { type: String },
    billGST: { type: Number },
    billTotal: { type: Number },
    billFileUrl: { type: String },
    billBreakdown: { type: String },
    payments: [
      {
        amount: { type: Number },
        method: { type: String },
        reference: { type: String },
        byRole: { type: String },
        byUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        time: { type: Date },
      },
    ],
    ratingValue: { type: Number },
    ratingComment: { type: String },
    price: { type: Number },
    dropAt: { type: Date },
    dropByStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastUpdatedByRole: { type: String },
    lastUpdatedMessage: { type: String },
    lastUpdatedAt: { type: Date },
    staffAcceptanceStatus: { type: String, enum: ['none', 'pending', 'accepted', 'declined'], default: 'none' },
  },
  { timestamps: true }
);

const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

module.exports = { Booking };
