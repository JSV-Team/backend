const router = require("express").Router();
const c = require("../controllers/profile.controller");

router.get("/:userId", c.getProfile);
router.put("/:userId", c.updateProfile);

router.get("/:userId/interests", c.getInterests);
router.put("/:userId/interests", c.updateInterests);

module.exports = router;