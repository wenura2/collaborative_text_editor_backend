const User = require("../models/userModel");
const { createAccessToken, createRefreshToken } = require("../utils/secretToken");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const mongoose = require('mongoose');

const isDatabaseReady = () => {
  return mongoose.connection.readyState === 1;
};

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

module.exports.Signup = async (req, res) => {

  try {

    if (!isDatabaseReady()) {
      return res.status(503).json({
        message: "Database is not connected. Check MONGO_URI and MongoDB Atlas network access.",
        success: false
      });
    }

    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
        success: false
      });
    }

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
        success: false
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
        success: false
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists", success: false });
    }

    const user = await User.create({ email: normalizedEmail, password });

    if (!user) {
      return res.status(400).json({ message: "Registration Uis not sucess.", success: false });
    }

    if(user){
      const accessToken = createAccessToken(user);
      const refreshToken = createRefreshToken(user);

      res
      .status(201)
      .json({ message: "User signed in successfully", success: true, accessToken: accessToken, refreshToken: refreshToken, userId: user._id });
    }

  }catch (error) {

    if (error?.code === 11000) {
      return res.status(400).json({ message: "User already exists", success: false });
    }

    console.error(error);
    res.status(500).json({ message: error.message || "An error occurred during registration.", success: false });

  }

};

module.exports.Login = async (req, res) => {

  try {

    if (!isDatabaseReady()) {
      return res.status(503).json({
        message: "Database is not connected. Check MONGO_URI and MongoDB Atlas network access.",
        success: false
      });
    }

    const { loginemail, loginpassword } = req.body;
    const normalizedEmail = normalizeEmail(loginemail);

    if(!normalizedEmail || !loginpassword ){
      return res.status(400).json({message:'All fields are required', success: false})
    }

    const user = await User.findOne({ email: normalizedEmail });

    if(!user){
      return res.status(400).json({message:'User Not Found!!!', success: false })  
    }

    const auth = await bcrypt.compare(loginpassword, user.password)

    if (!auth) {
      return res.status(400).json({message:'Error in auth', success: false }) 
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    res
      .status(200)
      .json({ message: "User logged in successfully", success: true, refreshToken: refreshToken, accessToken: accessToken, userId: user._id });

  } catch (error) {

    console.error(error);
    res.status(500).json({ message: 'An error occurred during login.', success: false });

  }
};

module.exports.RefreshAccessToken = async (req, res) => {

  try {

    const { refreshToken } = req.body;

    const decodedToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET_KEY);

    const newAccessToken = createAccessToken(decodedToken.user);

    res.json({ accessToken: newAccessToken });

  } catch (error) {

    console.error("Error refreshing token:", error);
    res.status(401).json({ message: "Token refresh failed", success: false });

  }
};

module.exports.GetUserDetails = async (req,res) => {

  try {

    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(400).json({message:"Order not found.", success: true,});
    }

    if (user) {
        res
            .status(201)
            .json({ message: "Order details found.", success: true, userDetails: user});
    }
    
} catch (error) {
    
    console.error(error);
    res.status(500).json({ message: "An error occurred.", success: false });

}
}