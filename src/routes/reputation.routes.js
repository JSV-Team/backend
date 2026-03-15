const router = require("express").Router();
const c = require("../controllers/reputation.controller");

router.get("/:userId/logs", c.logs);

module.exports = router;