const mongoose = require('mongoose');
const { Booking } = require('../models/Booking');
const { User } = require('../models/User');

const createBooking = async (req, res, next) => {
  try {
    const { customerEmail, customerPhone, vehicle, service, location, date, time, registration, reg } = req.body;
    const plate = (registration || reg || '').toString().trim();
    if (!customerEmail || !vehicle || !service) return res.status(400).json({ message: 'Required: customerEmail, vehicle, service' });
    if (!plate) return res.status(400).json({ message: 'registration required' });
    const payload = {
      customerEmail: String(customerEmail).toLowerCase(),
      customerPhone,
      vehicle,
      service,
      location: location && typeof location === 'object' ? location : { formatted: String(location || ''), lat: undefined, lng: undefined },
      date,
      time,
      registration: plate,
      status: 'PENDING_ASSIGNMENT',
    };
    const doc = await Booking.create(payload);
    res.status(201).json({ booking: { id: doc._id } });
  } catch (err) {
    next(err);
  }
};

const listBookings = async (req, res, next) => {
  try {
    const roleStr = req.user ? String(req.user.role || 'customer').toLowerCase() : 'admin';
    const email = (req.query.email || '').toString().toLowerCase();
    let filter = {};
    if (roleStr === 'customer') {
      filter = { customerEmail: email || req.user?.email || '' };
    } else if (roleStr === 'merchant') {
      filter = { merchantId: req.user?.id };
    } else if (roleStr === 'staff') {
      filter = { staffId: req.user?.id };
    } else {
      filter = {};
    }
    const docs = await Booking.find(filter).sort({ createdAt: -1 });
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    const meId = req.user ? String(req.user.id || '') : '';
    res.json({ bookings: docs.map((d) => {
      const assignedToMe = meId && d.staffId && String(d.staffId) === meId;
      const accepted = String(d.staffAcceptanceStatus || 'none') === 'accepted';
      const hideSensitive = roleStr === 'staff' && assignedToMe && !accepted;
      return {
      id: d._id,
      customerEmail: d.customerEmail,
      customerPhone: hideSensitive ? undefined : d.customerPhone,
      vehicle: d.vehicle,
      service: d.service,
      location: hideSensitive ? undefined : d.location,
      date: d.date,
      time: d.time,
      registration: d.registration,
      status: d.status,
      merchantId: d.merchantId,
      staffId: d.staffId,
      repairNotes: d.repairNotes,
      photosBefore: d.photosBefore,
      photosAfter: d.photosAfter,
      photosReturn: d.photosReturn,
      estimateLabour: d.estimateLabour,
      estimateParts: d.estimateParts,
      estimateAdditional: d.estimateAdditional,
      estimateTotal: d.estimateTotal,
      billInvoiceNumber: d.billInvoiceNumber,
      billGST: d.billGST,
      billTotal: d.billTotal,
      billFileUrl: d.billFileUrl,
      billBreakdown: d.billBreakdown,
      payments: d.payments,
      ratingValue: d.ratingValue,
      ratingComment: d.ratingComment,
      price: d.price,
      dropAt: d.dropAt,
      dropByStaffId: d.dropByStaffId,
      lastUpdatedByRole: d.lastUpdatedByRole,
      lastUpdatedMessage: d.lastUpdatedMessage,
      lastUpdatedAt: d.lastUpdatedAt,
      staffAcceptanceStatus: d.staffAcceptanceStatus,
    };
    }) });
  } catch (err) {
    next(err);
  }
};

function normalizeStatus(s) {
  const m = {
    pending: 'PENDING_ASSIGNMENT',
    approved: 'ASSIGNED',
    rejected: 'REVISION_REQUIRED',
    assigned_merchant: 'ASSIGNED',
    assigned_staff: 'ASSIGNED',
    in_progress: 'SERVICE_IN_PROGRESS',
    pickup_done: 'PICKUP_CONFIRMED',
    repair_done: 'AT_SERVICE_CENTER',
    awaiting_payment: 'READY_FOR_DELIVERY',
    paid: 'DELIVERED',
    completed: 'COMPLETED',
  };
  return m[s] || s;
}

function canTransition(from, to) {
  const allowed = {
    PENDING_ASSIGNMENT: ['ASSIGNED'],
    ASSIGNED: ['PICKUP_CONFIRMED'],
    PICKUP_CONFIRMED: ['IN_TRANSIT'],
    IN_TRANSIT: ['AT_SERVICE_CENTER'],
    AT_SERVICE_CENTER: ['WAITING_APPROVAL'],
    WAITING_APPROVAL: ['SERVICE_IN_PROGRESS', 'REVISION_REQUIRED'],
    SERVICE_IN_PROGRESS: ['READY_FOR_DELIVERY'],
    READY_FOR_DELIVERY: ['DELIVERED'],
    DELIVERED: ['COMPLETED'],
    REVISION_REQUIRED: ['WAITING_APPROVAL'],
  };
  const list = allowed[normalizeStatus(from)] || [];
  return list.includes(normalizeStatus(to));
}

const patchBooking = async (req, res, next) => {
  try {
    const id = (req.params.id || '').toString();
    const action = (req.body.action || '').toString();
    const doc = await Booking.findById(id);
    if (!doc) return res.status(404).json({ message: 'Booking not found' });
    const before = String(doc.status || '');
    function setAudit(role, message) {
      doc.lastUpdatedByRole = role;
      doc.lastUpdatedMessage = message;
      doc.lastUpdatedAt = new Date();
    }
    if (action === 'approve') {
      if (!doc.merchantId || !doc.staffId) return res.status(400).json({ message: 'Assign merchant and staff first' });
      if (doc.status === 'PENDING_ASSIGNMENT') {
        const next = 'ASSIGNED';
        doc.status = next;
        setAudit('admin', 'approved booking');
      }
    } else if (action === 'reject') {
      const next = 'REVISION_REQUIRED';
      doc.status = next;
      setAudit('admin', 'rejected booking');
    } else if (action === 'assign_merchant') {
      const merchantId = (req.body.merchantId || '').toString();
      if (!merchantId) return res.status(400).json({ message: 'merchantId required' });
      doc.merchantId = new mongoose.Types.ObjectId(merchantId);
      // Do not alter status here to avoid backward transitions
      setAudit('admin', 'assigned merchant');
    } else if (action === 'assign_staff') {
      const staffId = (req.body.staffId || '').toString();
      if (!staffId) return res.status(400).json({ message: 'staffId required' });
      const staffDoc = await User.findById(staffId);
      if (!staffDoc || String(staffDoc.role).toLowerCase() !== 'staff') {
        return res.status(400).json({ message: 'Invalid staff user' });
      }
      if (!staffDoc.staffOnline) {
        return res.status(400).json({ message: 'Staff is offline' });
      }
      doc.staffId = new mongoose.Types.ObjectId(staffId);
      // Do not alter status here to avoid backward transitions
      doc.staffAcceptanceStatus = 'pending';
      setAudit('admin', 'assigned staff');
    } else if (action === 'staff_accept') {
      doc.staffAcceptanceStatus = 'accepted';
      setAudit('staff', 'accepted assignment');
    } else if (action === 'staff_decline') {
      doc.staffAcceptanceStatus = 'declined';
      doc.staffId = undefined;
      doc.status = 'ASSIGNED';
      setAudit('staff', 'declined assignment');
    } else if (action === 'update_status') {
      const statusRaw = (req.body.status || '').toString();
      const status = normalizeStatus(statusRaw);
      if (!canTransition(doc.status, status)) return res.status(400).json({ message: 'Invalid transition' });
      doc.status = status;
      if (typeof req.body.repairNotes === 'string') doc.repairNotes = req.body.repairNotes;
      setAudit('staff', `set status to ${status}`);
    } else if (action === 'admin_update_status') {
      const statusRaw = (req.body.status || '').toString();
      const status = normalizeStatus(statusRaw);
      const inProd = (process.env.NODE_ENV || 'development') === 'production';
      if (inProd) {
        const role = req.user && req.user.role ? String(req.user.role).toLowerCase() : '';
        if (role !== 'admin') return res.status(403).json({ message: 'Admin only' });
      }
      doc.status = status;
      if (typeof req.body.repairNotes === 'string') doc.repairNotes = req.body.repairNotes;
      setAudit('admin', `set status to ${status}`);
    } else if (action === 'add_photos') {
      const before = Array.isArray(req.body.photosBefore) ? req.body.photosBefore : [];
      const after = Array.isArray(req.body.photosAfter) ? req.body.photosAfter : [];
      if (before.length > 0) doc.photosBefore = [...(doc.photosBefore || []), ...before];
      if (after.length > 0) doc.photosAfter = [...(doc.photosAfter || []), ...after];
      setAudit('staff', 'added service photos');
    } else if (action === 'set_price') {
      const price = Number(req.body.price || 0);
      doc.price = price;
      setAudit('admin', `set price ${price}`);
    } else if (action === 'staff_start') {
      const next = 'PICKUP_CONFIRMED';
      if (!canTransition(doc.status, next)) return res.status(400).json({ message: 'Invalid transition' });
      doc.status = next;
      setAudit('staff', 'pickup confirmed');
    } else if (action === 'staff_upload_before_media') {
      const files = Array.isArray(req.body.photosBefore) ? req.body.photosBefore : [];
      if (!files.length) return res.status(400).json({ message: 'Media required' });
      doc.photosBefore = [...(doc.photosBefore || []), ...files];
      setAudit('staff', 'uploaded pickup media');
    } else if (action === 'staff_in_transit') {
      const next = 'IN_TRANSIT';
      if (!canTransition(doc.status, next)) return res.status(400).json({ message: 'Invalid transition' });
      doc.status = next;
      setAudit('staff', 'in transit');
    } else if (action === 'staff_handover') {
      const next = 'AT_SERVICE_CENTER';
      if (!canTransition(doc.status, next)) return res.status(400).json({ message: 'Invalid transition' });
      doc.status = next;
      setAudit('staff', 'handover to service centre');
    } else if (action === 'staff_drop_vehicle') {
      const next = 'AT_SERVICE_CENTER';
      if (canTransition(doc.status, next)) {
        doc.status = next;
      }
      if (!doc.dropAt) doc.dropAt = new Date();
      try {
        if (req.user?.id) doc.dropByStaffId = new mongoose.Types.ObjectId(req.user.id);
      } catch {}
      setAudit('staff', 'dropped vehicle at service centre');
    } else if (action === 'merchant_update_estimate') {
      doc.estimateLabour = Number(req.body.labour_cost || 0);
      doc.estimateParts = Number(req.body.parts_cost || 0);
      doc.estimateAdditional = Number(req.body.additional_work || 0);
      doc.estimateTotal = Number(doc.estimateLabour + doc.estimateParts + doc.estimateAdditional);
      const next = 'WAITING_APPROVAL';
      if (!canTransition(doc.status, next)) return res.status(400).json({ message: 'Invalid transition' });
      doc.status = next;
      setAudit('merchant', 'updated estimate');
    } else if (action === 'customer_approve_estimate') {
      const approved = !!req.body.approved;
      const next = approved ? 'SERVICE_IN_PROGRESS' : 'REVISION_REQUIRED';
      if (!canTransition(doc.status, next)) return res.status(400).json({ message: 'Invalid transition' });
      doc.status = next;
      setAudit('customer', approved ? 'approved estimate' : 'requested revision');
    } else if (action === 'merchant_complete_service') {
      const finalNext = 'READY_FOR_DELIVERY';
      const current = String(doc.status || '');
      if (!canTransition(current, finalNext)) {
        // Allow merchant to complete even if still at earlier stages
        if (['AT_SERVICE_CENTER', 'WAITING_APPROVAL'].includes(current)) {
          // Progress to in-progress first
          doc.status = 'SERVICE_IN_PROGRESS';
          setAudit('merchant', 'service started');
        }
        // Now move to ready for delivery
        if (!canTransition(doc.status, finalNext)) {
          return res.status(400).json({ message: 'Invalid transition' });
        }
      }
      doc.status = finalNext;
      setAudit('merchant', 'service completed');
    } else if (action === 'staff_pickup_from_merchant') {
      const next = 'READY_FOR_DELIVERY';
      if (!canTransition(doc.status, next)) return res.status(400).json({ message: 'Invalid transition' });
      doc.status = next;
      setAudit('staff', 'picked up for return');
    } else if (action === 'staff_upload_return_media') {
      const files = Array.isArray(req.body.photosReturn) ? req.body.photosReturn : [];
      if (!files.length) return res.status(400).json({ message: 'Media required' });
      doc.photosReturn = [...(doc.photosReturn || []), ...files];
      setAudit('staff', 'uploaded return media');
    } else if (action === 'staff_update_wear_tear') {
      if (typeof req.body.wearTear === 'string') doc.repairNotes = req.body.wearTear;
      setAudit('staff', 'updated wear & tear');
    } else if (action === 'staff_confirm_payment') {
      const next = 'DELIVERED';
      if (!canTransition(doc.status, next)) return res.status(400).json({ message: 'Invalid transition' });
      doc.status = next;
      setAudit('staff', 'confirmed payment');
    } else if (action === 'merchant_upload_bill') {
      const inv = (req.body.invoice_number || '').toString();
      const gst = Number(req.body.gst || 0);
      const total = Number(req.body.total || 0);
      const url = (req.body.file_url || '').toString();
      const breakdown = (req.body.breakdown || '').toString();
      if (!inv || !url) return res.status(400).json({ message: 'invoice_number and file_url required' });
      doc.billInvoiceNumber = inv;
      doc.billGST = gst;
      doc.billTotal = total;
      doc.billFileUrl = url;
      doc.billBreakdown = breakdown;
      const next = 'COMPLETED';
      if (!canTransition(doc.status, next)) return res.status(400).json({ message: 'Invalid transition' });
      doc.status = next;
      setAudit('merchant', 'uploaded bill');
    } else if (action === 'add_payment') {
      const amount = Number(req.body.amount || 0);
      const method = (req.body.method || '').toString();
      const reference = (req.body.reference || '').toString();
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'amount required' });
      const byRole = req.user?.role ? String(req.user.role).toLowerCase() : 'system';
      let byUserId = undefined;
      try { if (req.user?.id) byUserId = new mongoose.Types.ObjectId(String(req.user.id)); } catch {}
      const entry = { amount, method, reference, byRole, byUserId, time: new Date() };
      doc.payments = Array.isArray(doc.payments) ? [...doc.payments, entry] : [entry];
      setAudit(byRole, `recorded payment ${amount}${method ? ' via ' + method : ''}`);
    } else if (action === 'booking_rate') {
      const rating = Number(req.body.rating || 0);
      const comment = (req.body.comment || '').toString();
      doc.ratingValue = rating;
      doc.ratingComment = comment;
      setAudit('customer', 'rated service');
    } else {
      return res.status(400).json({ message: 'Unknown action' });
    }
    await doc.save();
    const after = String(doc.status || '');
    const role = doc.lastUpdatedByRole || '';
    const message = doc.lastUpdatedMessage || '';
    res.json({ ok: true, status: after, role, message, before });
  } catch (err) {
    next(err);
  }
};

const deleteBooking = async (req, res, next) => {
  try {
    const id = (req.params.id || '').toString();
    if (!id) return res.status(400).json({ message: 'Missing booking id' });
    const doc = await Booking.findById(id);
    if (!doc) return res.status(404).json({ message: 'Booking not found' });
    await doc.deleteOne();
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
};

module.exports = { createBooking, listBookings, patchBooking, deleteBooking };
