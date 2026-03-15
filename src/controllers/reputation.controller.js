const s = require("../services/reputation.service");

exports.logs = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    const { from, to, deducted_by } = req.query;
    const data = await s.logs(userId, { from, to, deducted_by });
    res.json(data);
  } catch (e) { next(e); }
};