const router = require("express").Router();
const c = require("../controllers/users.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

router.get("/", verifyToken, c.search);

module.exports = router;
