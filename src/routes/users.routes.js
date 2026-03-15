const router = require("express").Router();
const c = require("../controllers/users.controller");

router.get("/", c.search);

module.exports = router;
