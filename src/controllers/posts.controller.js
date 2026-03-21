const s = require("../services/posts.service");

exports.listByUser = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);
    res.json(await s.listByUser(userId));
  } catch (e) { next(e); }
};

exports.createPost = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId || req.body.userId);
    console.log(`[posts.controller] createPost - userId: ${userId}, body keys: ${Object.keys(req.body)}`);
    res.json(await s.createPost(userId, req.body));
  } catch (e) { 
    console.error(`[posts.controller] createPost ERROR:`, e);
    next(e); 
  }
};

exports.detail = async (req, res, next) => {
  try {
    const postId = Number(req.params.postId);
    res.json(await s.detail(postId));
  } catch (e) { next(e); }
};

exports.react = async (req, res, next) => {
  try {
    const postId = Number(req.params.postId);
    const { user_id, emoji } = req.body;
    res.json(await s.react(postId, Number(user_id), String(emoji || "")));
  } catch (e) { next(e); }
};

exports.reactors = async (req, res, next) => {
  try {
    res.json(await s.reactors(Number(req.params.postId)));
  } catch (e) { next(e); }
};

exports.comment = async (req, res, next) => {
  try {
    const postId = Number(req.params.postId);
    const { user_id, content } = req.body;
    res.json(await s.comment(postId, Number(user_id), String(content || "")));
  } catch (e) { next(e); }
};

exports.comments = async (req, res, next) => {
  try {
    res.json(await s.comments(Number(req.params.postId)));
  } catch (e) { next(e); }
};

exports.commenters = async (req, res, next) => {
  try {
    res.json(await s.commenters(Number(req.params.postId)));
  } catch (e) { next(e); }
};

exports.share = async (req, res, next) => {
  try {
    const postId = Number(req.params.postId);
    const { user_id } = req.body;
    res.json(await s.share(postId, Number(user_id)));
  } catch (e) { next(e); }
};

exports.sharers = async (req, res, next) => {
  try {
    res.json(await s.sharers(Number(req.params.postId)));
  } catch (e) { next(e); }
};

exports.createStatus = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId || req.body.userId);
    res.json(await s.createStatus(userId, req.body));
  } catch (e) { next(e); }
};

exports.deletePost = exports.deleteActivity = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const userId = Number(req.query.userId || req.body.userId);
    res.json(await s.deletePost(postId, userId));
  } catch (e) { next(e); }
};

exports.deleteStatus = async (req, res, next) => {
  try {
    const { statusId } = req.params;
    const userId = Number(req.query.userId || req.body.userId);
    res.json(await s.deleteStatus(statusId, userId));
  } catch (e) { next(e); }
};

