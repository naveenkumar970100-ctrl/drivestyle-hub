const { User, ROLES } = require('../models/User');
const mongoose = require('mongoose');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { config } = require('../config/env');
const { Vehicle } = require('../models/Vehicle');

const pick = (obj, keys) => keys.reduce((acc, k) => { if (obj && Object.prototype.hasOwnProperty.call(obj, k)) acc[k] = obj[k]; return acc; }, {});

const isDbConnected = () => (mongoose.connection?.readyState || 0) === 1;

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password -tokens');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

const setStaffOnline = async (req, res, next) => {
  try {
    const online = !!req.body.online;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (String(user.role).toLowerCase() !== 'staff') return res.status(403).json({ message: 'Only staff can toggle online' });
    user.staffOnline = online;
    await user.save();
    res.json({ ok: true, online: user.staffOnline });
  } catch (err) {
    next(err);
  }
};
const updateMeProfile = async (req, res, next) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ message: 'Database not connected' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const body = req.body || {};
    if (typeof body.name === 'string' && body.name.trim()) user.name = body.name.trim();
    if (typeof body.phone === 'string') user.phone = body.phone.trim();
    if (typeof body.shopName === 'string') user.shopName = body.shopName.trim();
    if (typeof body.staffRole === 'string') user.staffRole = body.staffRole.trim();
    if (typeof body.email === 'string' && body.email.trim() && body.email.trim().toLowerCase() !== String(user.email).toLowerCase()) {
      const exists = await User.findOne({ email: body.email.trim().toLowerCase() });
      if (exists) return res.status(409).json({ message: 'Email already in use' });
      user.email = body.email.trim().toLowerCase();
    }
    if (Number.isFinite(Number(body.lat)) && Number.isFinite(Number(body.lng))) {
      const lat = Number(body.lat); const lng = Number(body.lng);
      user.location = { formatted: `${lat},${lng}`, lat, lng };
    } else if (typeof body.location === 'string' && body.location.trim()) {
      const raw = body.location.trim();
      let resolved = { formatted: raw };
      const parts = raw.split(',').map((s) => s.trim());
      if (parts.length === 2) {
        const lt = parseFloat(parts[0]); const lg = parseFloat(parts[1]);
        if (Number.isFinite(lt) && Number.isFinite(lg)) resolved = { formatted: `${lt},${lg}`, lat: lt, lng: lg };
      }
      user.location = resolved;
    }
    await user.save();
    res.json({ ok: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, shopName: user.shopName, staffRole: user.staffRole, location: user.location } });
  } catch (err) {
    next(err);
  }
};
const setMyLocation = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (String(user.role).toLowerCase() !== 'staff') return res.status(403).json({ message: 'Only staff can update location' });
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ message: 'lat and lng required' });
    user.liveLocation = { lat, lng, updatedAt: new Date() };
    user.staffOnline = true;
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
// RapidAPI vehicle details lookup for car/bike by make/model/year or VIN
const lookupVehicle = async (req, res, next) => {
  try {
    const type = (req.query.type || req.body.type || '').toString().toLowerCase(); // 'car' | 'bike'
    const make = (req.query.make || req.body.make || '').toString();
    const model = (req.query.model || req.body.model || '').toString();
    const year = (req.query.year || req.body.year || '').toString();
    const vin = (req.query.vin || req.body.vin || '').toString();
    const reg = (req.query.reg || req.body.reg || '').toString();

    if (!config.RAPIDAPI_KEY) {
      const vehicle = { type, make, model, year, vin, registration: reg };
      return res.json({ vehicle, source: 'fallback' });
    }
    if (!vin && !reg && (!type || (!make || !model))) return res.status(400).json({ message: 'Provide registration number or VIN, or type + make + model' });

    const headers = { 'x-rapidapi-key': config.RAPIDAPI_KEY };
    let data = null;
    let source = null;

    let usedReg = false;
    if (reg) {
      const preferredHost = process.env.RAPIDAPI_REG_HOST || '';
      const regHosts = [
        preferredHost && preferredHost !== 'rapidapi.com' ? preferredHost : null,
        'rto-vehicle-details.p.rapidapi.com',
        'vehicle-rc-information.p.rapidapi.com',
        'car-registration.p.rapidapi.com',
      ].filter(Boolean);
      const attempts = [
        { path: (h) => `https://${h}/vehicle_details?registration_number=${encodeURIComponent(reg)}`, method: 'GET' },
        { path: (h) => `https://${h}/vehicle-details?registration_number=${encodeURIComponent(reg)}`, method: 'GET' },
        { path: (h) => `https://${h}/rc-info?registration=${encodeURIComponent(reg)}`, method: 'GET' },
        { path: (h) => `https://${h}/vehicle?registration=${encodeURIComponent(reg)}`, method: 'GET' },
        { path: (h) => `https://${h}/lookup?reg=${encodeURIComponent(reg)}`, method: 'GET' },
        { path: (h) => `https://${h}/vehicle_details`, method: 'POST', body: { registration_number: reg } },
        { path: (h) => `https://${h}/vehicle-details`, method: 'POST', body: { registration_number: reg } },
      ];
      for (const host of regHosts) {
        for (const att of attempts) {
          try {
            const url = att.path(host);
            const opts = { method: att.method, headers: { ...headers, 'x-rapidapi-host': host, 'content-type': 'application/json' } };
            if (att.method === 'POST' && att.body) opts.body = JSON.stringify(att.body);
            const resp = await fetch(url, opts);
            let decoded = null;
            try {
              decoded = await resp.json();
            } catch {
              const text = await resp.text().catch(() => '');
              if (!resp.ok) continue;
              try {
                decoded = JSON.parse(text);
              } catch {
                decoded = { result: { raw: text } };
              }
            }
            const d = decoded?.data || decoded?.result || decoded?.vehicle || decoded;
            const m = d?.make || d?.Make || d?.manufacturer || '';
            const mdl = d?.model || d?.Model || '';
            const yr = String(d?.year || d?.Year || '');
            const engine = d?.engine || d?.Engine || '';
            const displacement = d?.displacement || d?.Displacement || '';
            const power = d?.power || d?.Power || '';
            const fuel = d?.fuelType || d?.FuelType || d?.fuel || '';
            if (m || mdl || yr || fuel || engine || displacement || power) {
              data = {
                type: type || (d?.vehicleClass?.toString?.().toLowerCase().includes('bike') ? 'bike' : 'car'),
                make: m || make,
                model: mdl || model,
                year: yr || year,
                engine,
                displacement,
                power_hp: power,
                fuel_type: fuel,
                registration: reg,
              };
              source = host;
              usedReg = true;
              break;
            }
          } catch (e) {
            // keep trying other providers
          }
        }
        if (usedReg) break;
      }
    }

    if (!data && vin) {
      const vinHosts = [
        'vindecoder.p.rapidapi.com',
        'vindecoder-api.p.rapidapi.com',
        'vin-decoder.p.rapidapi.com',
      ];
      for (const host of vinHosts) {
        try {
          const url =
            host === 'vindecoder.p.rapidapi.com'
              ? `https://${host}/decodevin?vin=${encodeURIComponent(vin)}`
              : `https://${host}/decode_vin?vin=${encodeURIComponent(vin)}`;
          const resp = await fetch(url, { headers: { ...headers, 'x-rapidapi-host': host } });
          const decoded = await resp.json().catch(() => ({}));
          const d = decoded?.specification || decoded?.decode || decoded?.vehicle || decoded;
          const m = d?.Make || d?.make || d?.manufacturer || '';
          const mdl = d?.Model || d?.model || '';
          const yr = String(d?.Year || d?.year || '');
          if (m || mdl || yr) {
            data = {
              type: type || 'car',
              make: m || make,
              model: mdl || model,
              year: yr || year,
              vin,
            };
            source = host;
            break;
          }
        } catch {}
      }
    }
    if (!data && type === 'car') {
      const carHosts = [
        process.env.RAPIDAPI_CAR_HOST || 'cars-by-api-ninjas.p.rapidapi.com',
        'car-data.p.rapidapi.com',
      ];
      for (const host of carHosts) {
        try {
          let url = '';
          if (host === 'cars-by-api-ninjas.p.rapidapi.com') {
            url = `https://cars-by-api-ninjas.p.rapidapi.com/v1/cars?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}${year ? `&year=${encodeURIComponent(year)}` : ''}`;
            const resp = await fetch(url, { headers: { ...headers, 'x-rapidapi-host': host } });
            const arr = await resp.json().catch(() => []);
            if (Array.isArray(arr) && arr.length > 0) {
              const c = arr[0];
              data = {
                type: 'car',
                make: c.make || make,
                model: c.model || model,
                year: String(c.year || year || ''),
                fuel_type: c.fuel_type || c.fuel_type || '',
                transmission: c.transmission || '',
                drive: c.drive || '',
                cylinders: c.cylinders || '',
                displacement: c.displacement || '',
                power_hp: c.horsepower || c.hp || '',
              };
              source = host;
              break;
            }
          } else if (host === 'car-data.p.rapidapi.com') {
            url = `https://car-data.p.rapidapi.com/cars?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}${year ? `&year=${encodeURIComponent(year)}` : ''}`;
            const resp = await fetch(url, { headers: { ...headers, 'x-rapidapi-host': host } });
            const arr = await resp.json().catch(() => []);
            if (Array.isArray(arr) && arr.length > 0) {
              const c = arr[0];
              data = {
                type: 'car',
                make: c.make || make,
                model: c.model || model,
                year: String(c.year || year || ''),
              };
              source = host;
              break;
            }
          }
        } catch {}
      }
    } else if (!data && type === 'bike') {
      const bikeHosts = [
        process.env.RAPIDAPI_BIKE_HOST || 'motorcycle-specifications2.p.rapidapi.com',
      ];
      for (const host of bikeHosts) {
        try {
          const url = `https://motorcycle-specifications2.p.rapidapi.com/api/motorcycles?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}${year ? `&year=${encodeURIComponent(year)}` : ''}`;
          const resp = await fetch(url, { headers: { ...headers, 'x-rapidapi-host': host } });
          const arr = await resp.json().catch(() => []);
          if (Array.isArray(arr) && arr.length > 0) {
            const m = arr[0];
            data = {
              type: 'bike',
              make: m.make || make,
              model: m.model || model,
              year: String(m.year || year || ''),
              engine: m.engine || '',
              displacement: m.displacement || '',
              power_hp: m.power || '',
            };
            source = host;
            break;
          }
        } catch {}
      }
    }

    if (!data) {
      // Fallback to echoing provided fields
      data = { type, make, model, year, vin, registration: reg };
    }
    res.json({ vehicle: data, source });
  } catch (err) {
    next(err);
  }
};

const listUsers = async (req, res, next) => {
  try {
    if (!isDbConnected()) return res.status(503).json({ message: 'Database not connected' });
    const users = await User.find().select('-password');
    res.json({
      users: users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        shopName: u.shopName,
        staffRole: u.staffRole,
        location: u.location,
        staffOnline: !!u.staffOnline,
        liveLocation: u.liveLocation,
        createdAt: u.createdAt,
        tokenCount: Array.isArray(u.tokens) ? u.tokens.length : 0,
      })),
    });
  } catch (err) {
    next(err);
  }
};

const createUserByAdmin = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: 'Missing role' });
    if (!['staff', 'merchant'].includes(role)) return res.status(400).json({ message: 'Role must be staff or merchant' });
    if (!isDbConnected()) return res.status(503).json({ message: 'Database not connected' });

    let payload = {};
    let email = '';
    let plainPassword = req.body.password;
    let mailSubject = '';
    let mailText = '';

    if (role === 'staff') {
      const { name, email: staffEmail, phone, staffRole, location, password } = req.body;
      if (!name || !staffEmail || !phone || !staffRole || !location || !password) {
        return res.status(400).json({ message: 'Required: fullname, email, phone, role, location, password' });
      }
      email = staffEmail;
      plainPassword = password;
      let resolvedLocation = { formatted: location };
      // Support "lat,lng" direct input without geocoding
      (function tryParseLatLng() {
        const parts = String(location || '').split(',').map((s) => s.trim());
        if (parts.length === 2) {
          const lt = parseFloat(parts[0]);
          const lg = parseFloat(parts[1]);
          if (Number.isFinite(lt) && Number.isFinite(lg)) {
            resolvedLocation = { formatted: `${lt},${lg}`, lat: lt, lng: lg };
          }
        }
      })();
      try {
        if (config.RAPIDAPI_KEY && config.RAPIDAPI_HOST && typeof fetch === 'function') {
          const url = `https://${config.RAPIDAPI_HOST}/Geocode?address=${encodeURIComponent(location)}&language=en`;
          const resp = await fetch(url, {
            headers: {
              'x-rapidapi-key': config.RAPIDAPI_KEY,
              'x-rapidapi-host': config.RAPIDAPI_HOST,
            },
          });
          const data = await resp.json().catch(() => ({}));
          const first = data?.results?.[0];
          if (first) {
            resolvedLocation = {
              formatted: first.address || location,
              lat: first.location?.lat,
              lng: first.location?.lng,
            };
          }
        }
      } catch {}
      payload = { name, email, password, role, phone, staffRole, location: resolvedLocation };
      mailSubject = 'Your Staff account at MotoHub';
      mailText = `Hello ${name},

Your Staff account has been created.
Email: ${email}
Phone: ${phone}
Role: ${staffRole}
Location: ${resolvedLocation.formatted}
Password: ${plainPassword}

Please log in and change your password.`;
    } else {
      const { shopName, email: merchantEmail, phone, location, password } = req.body;
      if (!shopName || !merchantEmail || !phone || !location || !password) {
        return res.status(400).json({ message: 'Required: merchant/shopname, email, phone, location, password' });
      }
      email = merchantEmail;
      plainPassword = password;
      let resolvedLocation = { formatted: location };
      // Support "lat,lng" direct input without geocoding
      (function tryParseLatLng() {
        const parts = String(location || '').split(',').map((s) => s.trim());
        if (parts.length === 2) {
          const lt = parseFloat(parts[0]);
          const lg = parseFloat(parts[1]);
          if (Number.isFinite(lt) && Number.isFinite(lg)) {
            resolvedLocation = { formatted: `${lt},${lg}`, lat: lt, lng: lg };
          }
        }
      })();
      try {
        if (config.RAPIDAPI_KEY && config.RAPIDAPI_HOST && typeof fetch === 'function') {
          const url = `https://${config.RAPIDAPI_HOST}/Geocode?address=${encodeURIComponent(location)}&language=en`;
          const resp = await fetch(url, {
            headers: {
              'x-rapidapi-key': config.RAPIDAPI_KEY,
              'x-rapidapi-host': config.RAPIDAPI_HOST,
            },
          });
          const data = await resp.json().catch(() => ({}));
          const first = data?.results?.[0];
          if (first) {
            resolvedLocation = {
              formatted: first.address || location,
              lat: first.location?.lat,
              lng: first.location?.lng,
            };
          }
        }
      } catch {}
      payload = { name: shopName, email, password, role, phone, shopName, location: resolvedLocation };
      mailSubject = 'Your Merchant account at MotoHub';
      mailText = `Hello ${shopName},

Your Merchant account has been created.
Email: ${email}
Phone: ${phone}
Location: ${resolvedLocation.formatted}
Password: ${plainPassword}

Please log in and change your password.`;
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already in use' });
    const user = await User.create(payload);

    let emailed = false;
    if (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS && config.MAIL_FROM) {
      try {
        const transporter = nodemailer.createTransport({
          host: config.SMTP_HOST,
          port: Number(config.SMTP_PORT || 587),
          secure: false,
          auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
        });
        await transporter.sendMail({
          from: config.MAIL_FROM,
          to: email,
          subject: mailSubject,
          text: mailText,
        });
        emailed = true;
      } catch (mailErr) {
        emailed = false;
      }
    }

    res.status(201).json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      emailed,
    });
  } catch (err) {
    next(err);
  }
};

const deleteUserByAdmin = async (req, res, next) => {
  try {
    const id = (req.params.id || '').toString();
    if (!id) return res.status(400).json({ message: 'Missing user id' });
    if (!isDbConnected()) return res.status(503).json({ message: 'Database not connected' });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete admin user' });
    await user.deleteOne();
    res.json({ ok: true, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
};

const updateUserLocationByAdmin = async (req, res, next) => {
  try {
    const id = (req.params.id || '').toString();
    if (!id) return res.status(400).json({ message: 'Missing user id' });
    if (!isDbConnected()) return res.status(503).json({ message: 'Database not connected' });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot modify admin user' });
    let resolvedLocation = null;
    const hasLatLng = Number.isFinite(Number(req.body.lat)) && Number.isFinite(Number(req.body.lng));
    if (hasLatLng) {
      const lat = Number(req.body.lat);
      const lng = Number(req.body.lng);
      resolvedLocation = { formatted: `${lat},${lng}`, lat, lng };
    } else if (typeof req.body.location === 'string' && req.body.location.trim()) {
      const raw = req.body.location.trim();
      resolvedLocation = { formatted: raw };
      const parts = raw.split(',').map((s) => s.trim());
      if (parts.length === 2) {
        const lt = parseFloat(parts[0]); const lg = parseFloat(parts[1]);
        if (Number.isFinite(lt) && Number.isFinite(lg)) resolvedLocation = { formatted: `${lt},${lg}`, lat: lt, lng: lg };
      } else if (config.RAPIDAPI_KEY && config.RAPIDAPI_HOST && typeof fetch === 'function') {
        try {
          const url = `https://${config.RAPIDAPI_HOST}/Geocode?address=${encodeURIComponent(raw)}&language=en`;
          const resp = await fetch(url, { headers: { 'x-rapidapi-key': config.RAPIDAPI_KEY, 'x-rapidapi-host': config.RAPIDAPI_HOST } });
          const data = await resp.json().catch(() => ({}));
          const first = data?.results?.[0];
          if (first) resolvedLocation = { formatted: first.address || raw, lat: first.location?.lat, lng: first.location?.lng };
        } catch {}
      }
    }
    if (!resolvedLocation) return res.status(400).json({ message: 'location or lat,lng required' });
    user.location = resolvedLocation;
    await user.save();
    res.json({ ok: true, user: { id: user._id, email: user.email } });
  } catch (err) {
    next(err);
  }
};
const createVehicle = async (req, res, next) => {
  try {
    const ownerEmail = (req.body.ownerEmail || req.user?.email || '').toString().toLowerCase();
    const type = (req.body.type || '').toString().toLowerCase();
    const plate = (req.body.plate || req.body.registration || req.body.reg || '').toString();
    if (!ownerEmail || !type || !plate) return res.status(400).json({ message: 'ownerEmail, type, plate required' });
    const make = (req.body.make || '').toString();
    const model = (req.body.model || '').toString();
    const year = (req.body.year || '').toString();
    const engine = (req.body.engine || '').toString();
    const displacement = (req.body.displacement || '').toString();
    const power_hp = (req.body.power_hp || '').toString();
    const payload = {
      ownerEmail,
      type: type === 'bike' ? 'bike' : 'car',
      make: make || undefined,
      model: model || undefined,
      year: year || undefined,
      engine: engine || undefined,
      displacement: displacement || undefined,
      power_hp: power_hp || undefined,
      vin: (req.body.vin || '').toString(),
      plate,
    };
    const doc = await Vehicle.create(payload);
    res.status(201).json({ vehicle: { id: doc._id } });
  } catch (err) {
    next(err);
  }
};

const listVehicles = async (req, res, next) => {
  try {
    const email = (req.query.email || req.user?.email || '').toString().toLowerCase();
    if (!email) return res.status(400).json({ message: 'email required' });
    const docs = await Vehicle.find({ ownerEmail: email }).sort({ createdAt: -1 });
    res.json({
      vehicles: docs.map((d) => ({
        id: d._id,
        ownerEmail: d.ownerEmail,
        type: d.type,
        make: d.make,
        model: d.model,
        year: d.year,
        engine: d.engine,
        displacement: d.displacement,
        power_hp: d.power_hp,
        vin: d.vin,
        plate: d.plate,
        createdAt: d.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

const deleteVehicle = async (req, res, next) => {
  try {
    const id = (req.params.id || '').toString();
    if (!id) return res.status(400).json({ message: 'id required' });
    const email = (req.query.email || req.body.ownerEmail || req.user?.email || '').toString().toLowerCase();
    const doc = await Vehicle.findById(id);
    if (!doc) return res.status(404).json({ message: 'Vehicle not found' });
    if (email && doc.ownerEmail && doc.ownerEmail.toLowerCase() !== email) {
      return res.status(403).json({ message: 'Not allowed' });
    }
    await Vehicle.deleteOne({ _id: id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMe, listUsers, createUserByAdmin, deleteUserByAdmin, updateUserLocationByAdmin, lookupVehicle, createVehicle, listVehicles, deleteVehicle, setStaffOnline, setMyLocation, updateMeProfile };
