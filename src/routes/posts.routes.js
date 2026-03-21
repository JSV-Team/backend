const router = require("express").Router();
const c = require("../controllers/posts.controller");

router.get("/:userId", c.listByUser);
router.post("/:userId", c.createPost);

router.get("/detail/:postId", c.detail);

router.post("/react/:postId", c.react);
router.get("/reactors/:postId", c.reactors);

router.post("/comment/:postId", c.comment);
router.get("/comments/:postId", c.comments);
router.get("/commenters/:postId", c.commenters);

router.post("/share/:postId", c.share);
router.get("/sharers/:postId", c.sharers);

module.exports = router;