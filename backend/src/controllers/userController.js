const { User, ROLES } = require('../models/User');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { config } = require('../config/env');

const pick = (obj, keys) => keys.reduce((acc, k) => { if (obj && Object.prototype.hasOwnProperty.call(obj, k)) acc[k] = obj[k]; return acc; }, {});

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
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

    if (!config.RAPIDAPI_KEY) return res.status(400).json({ message: 'RAPIDAPI_KEY missing' });
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
    const users = await User.find().select('-password');
    res.json({ users });
  } catch (err) {
    next(err);
  }
};

const createUserByAdmin = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: 'Missing role' });
    if (!['staff', 'merchant'].includes(role)) return res.status(400).json({ message: 'Role must be staff or merchant' });

    let payload = {};
    let email = '';
    let plainPassword = req.body.password;
    let mailSubject = '';
    let mailText = '';

    if (role === 'staff') {
      const { name, email: staffEmail, phone, staffRole, password } = req.body;
      if (!name || !staffEmail || !phone || !staffRole || !password) {
        return res.status(400).json({ message: 'Required: fullname, email, phone, role, password' });
      }
      email = staffEmail;
      plainPassword = password;
      payload = { name, email, password, role, phone, staffRole };
      mailSubject = 'Your Staff account at MotoHub';
      mailText = `Hello ${name},

Your Staff account has been created.
Email: ${email}
Phone: ${phone}
Role: ${staffRole}
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

module.exports = { getMe, listUsers, createUserByAdmin, lookupVehicle };
