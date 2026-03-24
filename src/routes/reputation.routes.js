const router = require("express").Router();
const c = require("../controllers/reputation.controller");

router.get("/:userId/logs", c.logs);
router.get("/:userId/summary", c.summary);

module.exports = router;