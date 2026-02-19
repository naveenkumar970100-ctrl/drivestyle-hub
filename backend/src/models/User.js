const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const ROLES = ['admin', 'staff', 'merchant', 'customer'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ROLES, default: 'customer' },
    phone: { type: String },
    shopName: { type: String },
    staffRole: { type: String },
    location: {
      formatted: { type: String },
      lat: { type: Number },
      lng: { type: Number },
    },
    tokens: [
      {
        token: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    staffOnline: { type: Boolean, default: false },
    liveLocation: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date },
    },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ role: 1, staffOnline: 1 });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = { User, ROLES };
