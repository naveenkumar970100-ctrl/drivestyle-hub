const { Service } = require('../models/Service');

const listServices = async (req, res, next) => {
  try {
    const { vehicleType } = req.query;
    const filter = {};
    if (vehicleType) filter.vehicleType = vehicleType;
    filter.isActive = true;

    const services = await Service.find(filter).sort({ createdAt: -1 });
    res.json({ services });
  } catch (err) {
    next(err);
  }
};

const createService = async (req, res, next) => {
  try {
    const { title, desc, price, vehicleType, category } = req.body;
    if (!title || !price || !vehicleType) {
      return res.status(400).json({ message: 'Title, price, and vehicleType are required' });
    }

    const service = await Service.create({ title, desc, price, vehicleType, category });
    res.status(201).json({ service });
  } catch (err) {
    next(err);
  }
};

const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const service = await Service.findByIdAndUpdate(id, update, { new: true });
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.json({ service });
  } catch (err) {
    next(err);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;
    // We do a soft delete by setting isActive to false
    const service = await Service.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.json({ message: 'Service deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listServices,
  createService,
  updateService,
  deleteService,
};
