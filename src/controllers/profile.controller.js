const s = require("../services/profile.service");

exports.getProfile = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const data = await s.getProfile(userId);
    res.json(data);
  } catch (e) { next(e); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const data = await s.updateProfile(userId, req.body);
    res.json(data);
  } catch (e) { next(e); }
};

exports.getInterests = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const data = await s.getInterests(userId);
    res.json(data);
  } catch (e) { next(e); }
};

exports.updateInterests = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const { interests } = req.body; // ["Bóng đá", ...]
    const data = await s.updateInterests(userId, interests || []);
    res.json(data);
  } catch (e) { next(e); }
};