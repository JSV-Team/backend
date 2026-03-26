const router = require("express").Router();
const c = require("../controllers/posts.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

// Public - Read operations
router.get("/", c.listAll); // Get all posts (feed)
router.get("/:userId", c.listByUser);
router.get("/detail/:postId", c.detail);
router.get("/reactors/:postId", c.reactors);
router.get("/comments/:postId", c.comments);
router.get("/commenters/:postId", c.commenters);
router.get("/sharers/:postId", c.sharers);

// Protected - Write operations (require JWT)
router.post("/", verifyToken, c.createPost);
router.delete("/:postId", verifyToken, c.deletePost);
router.post("/status", verifyToken, c.createStatus);
router.post("/status/:userId", verifyToken, c.createStatus);
router.delete("/status/:statusId", verifyToken, c.deleteStatus);
router.post("/react/:postId", verifyToken, c.react);
router.post("/comment/:postId", verifyToken, c.comment);
router.post("/share/:postId", verifyToken, c.share);

module.exports = router;