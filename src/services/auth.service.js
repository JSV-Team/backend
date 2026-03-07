const bcrypt = require("bcrypt");
const userModel = require("../models/user.model");

const registerUser = async (data) => {
  // Validate required fields
  if (!data.email || !data.password || !data.full_name) {
    throw new Error("Email, password, và full name là bắt buộc");
  }

  if (data.password.length < 6) {
    throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = {
    username: data.username || data.email.split("@")[0],
    email: data.email,
    password_hash: hashedPassword,
    full_name: data.full_name,
    location: data.location || ""
  };

  return await userModel.createUser(user);
};

module.exports = {
  registerUser
};