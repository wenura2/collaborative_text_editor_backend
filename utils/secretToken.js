require("dotenv").config();
const jwt = require("jsonwebtoken");

module.exports.createAccessToken = (user) => {
  return jwt.sign({ user }, process.env.ACCESS_TOKEN_SECRET_KEY, {
    expiresIn: 7 * 24 * 60 * 60 * 60,
  });
};

module.exports.createRefreshToken = (user) => {
  return jwt.sign({ user }, process.env.REFRESH_TOKEN_SECRET_KEY, {
    expiresIn: 30 * 24 * 60 * 60 * 60,
  });
};