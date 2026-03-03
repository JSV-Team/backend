const s = require("../services/users.service");

exports.search = async (req, res, next) => {
  try {
    const q = String(req.query.search || "").trim();
    const data = await s.search(q);
    res.json(data);
  } catch (e) { next(e); }
};