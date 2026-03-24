const s = require("../services/reputation.service");

exports.logs = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId) || (req.user ? req.user.user_id : null);
    if (!userId) {
        return res.status(400).json({ message: "UserId is required" });
    }
    const { from, to, type } = req.query;
    const data = await s.logs(userId, { from, to, type });
    res.json(data);
  } catch (e) { next(e); }
};

exports.summary = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId) || (req.user ? req.user.user_id : null);
    if (!userId) {
        return res.status(400).json({ message: "UserId is required" });
    }
    const data = await s.getSummary(userId);
    res.json(data);
  } catch (e) { next(e); }
};